#!/usr/bin/env python3
"""Export Delorean study artifacts into Optimized_Agent/static/data/ for the paper.

Usage:
  python scripts/export_study_data.py
  python scripts/export_study_data.py --delorean-root ../delorean
  python scripts/export_study_data.py --skip-decisions   # compare + reports only
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = REPO_ROOT / "static" / "data"

MAIN_BATCHES = [
    "floor_llm_v1_report",
    "floor_llm_v1_memory_report",
    "floor_llm_v1_glm_memory_report",
    "floor_llm_minimax_m3_memory_report",
    "floor_llm_grok_4_3_memory_report",
    "floor_llm_grok_4_5_memory_report",
    "agent_v1_memory_report",
    "tradingagent_v2_report",
    "optimized_agent_full_report",
]

ABLATION_BATCHES = [
    "optimized_agent_full_report",
    "optimized_agent_no_verify_pearson_report",
    "optimized_agent_feedback_pearson_report",
]

STEMS = [
    "floor_llm_v1",
    "floor_llm_v1_memory",
    "floor_llm_v1_glm_memory",
    "floor_llm_minimax_m3_memory",
    "floor_llm_grok_4_3_memory",
    "floor_llm_grok_4_5_memory",
    "agent_v1_memory",
    "tradingagent_v2",
    "optimized_agent_full",
    "optimized_agent_no_verify",
    "optimized_agent_feedback",
]


def _load_cache_viewer(delorean_root: Path):
    path = delorean_root / "scripts" / "cache_viewer.py"
    if not path.exists():
        raise SystemExit(f"cache_viewer.py not found at {path}")
    spec = importlib.util.spec_from_file_location("cache_viewer", path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def _copy_reports(runs_dir: Path, batches: list[str], out_reports: Path) -> None:
    out_reports.mkdir(parents=True, exist_ok=True)
    for batch in batches:
        src = runs_dir / batch / "report.json"
        if not src.exists():
            print(f"  skip missing report: {batch}")
            continue
        dest_dir = out_reports / batch
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest_dir / "report.json")
        print(f"  report: {batch}")


def _copy_decisions(runs_dir: Path, stems: list[str], out_decisions: Path) -> int:
    out_decisions.mkdir(parents=True, exist_ok=True)
    n = 0
    for stem in stems:
        for k in (1, 2, 3):
            run_id = f"{stem}_r{k}"
            src_dir = runs_dir / run_id / "decisions"
            if not src_dir.is_dir():
                continue
            dest_dir = out_decisions / run_id
            dest_dir.mkdir(parents=True, exist_ok=True)
            for f in sorted(src_dir.glob("*.json")):
                shutil.copy2(f, dest_dir / f.name)
                n += 1
            print(f"  decisions: {run_id} ({len(list(src_dir.glob('*.json')))} dates)")
    return n


def _write_compare(cv, runs_dir: Path, batches: list[str], out_path: Path) -> None:
    payload = cv._compare_payload(runs_dir, batches)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"  compare: {out_path.name} ({len(batches)} batches)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--delorean-root",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "delorean",
        help="Path to local Delorean checkout",
    )
    ap.add_argument("--skip-decisions", action="store_true")
    ap.add_argument("--skip-reports", action="store_true")
    args = ap.parse_args()

    delorean_root = args.delorean_root.resolve()
    runs_dir = delorean_root / "runs"
    if not runs_dir.is_dir():
        raise SystemExit(f"runs/ not found under {delorean_root}")

    print(f"Delorean: {delorean_root}")
    print(f"Output:   {OUT_ROOT}")

    cv = _load_cache_viewer(delorean_root)

    manifest = {
        "version": 1,
        "sets": {
            "main": MAIN_BATCHES,
            "ablation": ABLATION_BATCHES,
        },
        "stems": STEMS,
        "compare_files": {
            "main": "compare-main.json",
            "ablation": "compare-ablation.json",
        },
    }
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    (OUT_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    all_batches = sorted(set(MAIN_BATCHES + ABLATION_BATCHES))
    _write_compare(cv, runs_dir, MAIN_BATCHES, OUT_ROOT / "compare-main.json")
    _write_compare(cv, runs_dir, ABLATION_BATCHES, OUT_ROOT / "compare-ablation.json")

    if not args.skip_reports:
        print("Copying reports…")
        _copy_reports(runs_dir, all_batches, OUT_ROOT / "reports")

    if not args.skip_decisions:
        print("Copying decision files…")
        n = _copy_decisions(runs_dir, STEMS, OUT_ROOT / "decisions")
        print(f"  total decision files: {n}")

    print("Done.")


if __name__ == "__main__":
    main()
