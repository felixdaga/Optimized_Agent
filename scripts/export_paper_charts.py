#!/usr/bin/env python3
"""Export static SVG charts for the Optimized Agent paper from compare JSON.

Design rules:
  - h1 only (primary inference horizon)
  - horizontal bars for config comparisons so labels are never truncated
  - always sort by the plotted metric (better → top)

Usage:
  python scripts/export_paper_charts.py
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

COLORS = [
    "#ffb000", "#38bdf8", "#4ade80", "#c084fc", "#fb7185",
    "#2dd4bf", "#f97316", "#818cf8", "#facc15", "#ec4899",
]

FONT = "ui-sans-serif,system-ui,sans-serif"
H1 = "1"


def esc(s: object) -> str:
    return (
        str("" if s is None else s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def short_label(r: dict) -> str:
    s = (r.get("short") or r.get("batch") or "?").replace("_s", "").replace("_pearson", "")
    return s.strip()


def h1(r: dict) -> dict:
    return (r.get("horizons") or {}).get(H1) or {}


def good_runs(payload: dict, batches: list[str] | None = None) -> list[dict]:
    out = []
    src = batches or list((payload.get("batches") or {}).keys())
    for i, b in enumerate(src):
        r = (payload.get("batches") or {}).get(b)
        if not r or r.get("error"):
            continue
        r = dict(r)
        r["_color"] = COLORS[i % len(COLORS)]
        r["_batch"] = b
        out.append(r)
    return out


def sort_runs(runs: list[dict], get_value, higher_is_better: bool = True) -> list[dict]:
    def key(r):
        v = get_value(r)
        missing = v is None or (isinstance(v, float) and not math.isfinite(v))
        if missing:
            return (1, 0.0)
        return (0, -float(v) if higher_is_better else float(v))

    return sorted(runs, key=key)


def label_width(labels: list[str], char_px: float = 7.2, pad: int = 16) -> int:
    return int(max((len(lab) for lab in labels), default=8) * char_px + pad)


def hbar_chart(
    *,
    title: str,
    rows: list[dict],
    y_label: str = "",
    fmt: str = ".3f",
    zero_line: bool = True,
    ref_lines: list[dict] | None = None,
    note: str = "",
) -> str:
    """Horizontal bars. rows: [{label, value, color}]. Better values already sorted to top."""
    rows = [r for r in rows if r.get("value") is not None and math.isfinite(r["value"])]
    if not rows:
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 80">'
            '<rect width="480" height="80" fill="#0f1117"/>'
            '<text x="20" y="45" fill="#8b95a8" font-family="' + FONT + '">No data</text></svg>'
        )

    labels = [r["label"] for r in rows]
    values = [float(r["value"]) for r in rows]
    n = len(rows)
    left = max(140, label_width(labels))
    right = 64
    top = 40
    bottom = 36 if note else 20
    row_h = 28
    W = 920
    H = top + bottom + n * row_h
    plot_w = W - left - right
    plot_h = n * row_h

    lo, hi = min(values), max(values)
    if zero_line:
        lo = min(lo, 0.0)
        hi = max(hi, 0.0)
    span = hi - lo or 1.0
    pad = span * 0.08
    lo -= pad if lo < 0 else 0
    hi += pad
    span = hi - lo

    def x(v: float) -> float:
        return left + ((v - lo) / span) * plot_w

    def row_y(i: int) -> float:
        return top + i * row_h + row_h / 2

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{left}" y="24" fill="#e6eaf2" font-size="14" font-family="{FONT}" font-weight="600">{esc(title)}</text>',
    ]

    # vertical grid
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        v = lo + t * span
        xx = x(v)
        parts.append(f'<line x1="{xx:.1f}" y1="{top}" x2="{xx:.1f}" y2="{top + plot_h}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(
            f'<text x="{xx:.1f}" y="{top + plot_h + 14}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="{FONT}">{format(v, fmt)}</text>'
        )

    if zero_line and lo < 0 < hi:
        zx = x(0)
        parts.append(f'<line x1="{zx:.1f}" y1="{top}" x2="{zx:.1f}" y2="{top + plot_h}" stroke="#8b95a8" stroke-width="1.2" stroke-dasharray="5 3"/>')

    for ref in ref_lines or []:
        v = float(ref["value"])
        if not (lo <= v <= hi):
            continue
        xx = x(v)
        parts.append(
            f'<line x1="{xx:.1f}" y1="{top}" x2="{xx:.1f}" y2="{top + plot_h}" stroke="#8b95a8" stroke-dasharray="{ref.get("dash", "4 3")}"/>'
        )
        parts.append(
            f'<text x="{xx:.1f}" y="{top - 6}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="{FONT}">{esc(ref.get("label", ""))}</text>'
        )

    bar_h = 14
    x0 = x(0) if zero_line else left
    for i, r in enumerate(rows):
        v = float(r["value"])
        yy = row_y(i)
        x1 = x(v)
        bx = min(x0, x1)
        bw = max(1.5, abs(x1 - x0))
        parts.append(
            f'<rect x="{bx:.1f}" y="{yy - bar_h / 2:.1f}" width="{bw:.1f}" height="{bar_h}" fill="{r["color"]}" opacity="0.9">'
            f'<title>{esc(r["label"])}: {format(v, fmt)}</title></rect>'
        )
        parts.append(
            f'<text x="{left - 10}" y="{yy:.1f}" fill="#c8ceda" font-size="12" text-anchor="end" dominant-baseline="middle" font-family="{FONT}">{esc(r["label"])}</text>'
        )
        # value at bar end
        parts.append(
            f'<text x="{x1 + 6:.1f}" y="{yy:.1f}" fill="#e6eaf2" font-size="11" dominant-baseline="middle" font-family="{FONT}">{format(v, fmt)}</text>'
        )

    if y_label:
        parts.append(
            f'<text x="{(left + W - right) / 2:.0f}" y="{H - 6}" fill="#8b95a8" font-size="11" text-anchor="middle" font-family="{FONT}">{esc(y_label)}</text>'
        )
    if note:
        parts.append(
            f'<text x="{left}" y="{H - 8}" fill="#8b95a8" font-size="10" font-family="{FONT}">{esc(note)}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts)


def config_metric_chart(
    runs: list[dict],
    *,
    title: str,
    get_value,
    higher_is_better: bool = True,
    y_label: str = "",
    fmt: str = ".3f",
    ref_lines: list[dict] | None = None,
    note: str = "",
) -> str:
    ordered = sort_runs(runs, get_value, higher_is_better=higher_is_better)
    rows = [
        {"label": short_label(r), "value": get_value(r), "color": r["_color"]}
        for r in ordered
    ]
    return hbar_chart(
        title=title,
        rows=rows,
        y_label=y_label,
        fmt=fmt,
        ref_lines=ref_lines,
        note=note,
        zero_line=True,
    )


def wobble_chart(runs: list[dict], *, title: str) -> str:
    """h1 ensemble ◆ vs per-run IC dots — horizontal layout by config."""
    ordered = sort_runs(runs, lambda r: h1(r).get("ensemble_mean_ic"), higher_is_better=True)
    n = len(ordered)
    labels = [short_label(r) for r in ordered]
    left = max(140, label_width(labels))
    right = 24
    top = 40
    bottom = 40
    row_h = 32
    W = 920
    H = top + bottom + n * row_h

    dots, ens = [], []
    for r in ordered:
        cell = h1(r)
        e = cell.get("ensemble_mean_ic")
        if e is not None:
            ens.append(e)
        for v in cell.get("per_run_ic") or []:
            if v is not None:
                dots.append(v)
    vals = [v for v in ens + dots if v is not None]
    if not vals:
        return hbar_chart(title=title, rows=[])

    lo, hi = min(vals + [0]), max(vals + [0])
    span = hi - lo or 1
    pad = span * 0.12
    lo -= pad if lo < 0 else 0
    hi += pad
    span = hi - lo
    plot_w = W - left - right

    def x(v: float) -> float:
        return left + ((v - lo) / span) * plot_w

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{left}" y="24" fill="#e6eaf2" font-size="14" font-family="{FONT}" font-weight="600">{esc(title)}</text>',
    ]
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        v = lo + t * span
        xx = x(v)
        parts.append(f'<line x1="{xx:.1f}" y1="{top}" x2="{xx:.1f}" y2="{top + n * row_h}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(
            f'<text x="{xx:.1f}" y="{top + n * row_h + 14}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="{FONT}">{v:.3f}</text>'
        )
    if lo < 0 < hi:
        parts.append(f'<line x1="{x(0):.1f}" y1="{top}" x2="{x(0):.1f}" y2="{top + n * row_h}" stroke="#8b95a8" stroke-dasharray="5 3"/>')

    for i, r in enumerate(ordered):
        yy = top + i * row_h + row_h / 2
        cell = h1(r)
        for v in cell.get("per_run_ic") or []:
            if v is None:
                continue
            parts.append(f'<circle cx="{x(v):.1f}" cy="{yy:.1f}" r="4.5" fill="{r["_color"]}" opacity="0.55"/>')
        e = cell.get("ensemble_mean_ic")
        if e is not None:
            xx = x(e)
            parts.append(
                f'<polygon points="{xx:.1f},{yy - 7:.1f} {xx + 6:.1f},{yy + 4:.1f} {xx - 6:.1f},{yy + 4:.1f}" fill="{r["_color"]}"/>'
            )
        parts.append(
            f'<text x="{left - 10}" y="{yy:.1f}" fill="#c8ceda" font-size="12" text-anchor="end" dominant-baseline="middle" font-family="{FONT}">{esc(short_label(r))}</text>'
        )

    parts.append(
        f'<text x="{left}" y="{H - 10}" fill="#8b95a8" font-size="10" font-family="{FONT}">dots = per-run IC · ◆ = ensemble mean IC · h1 only · sorted by ensemble IC</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)


def line_by_date(runs: list[dict], *, title: str, get_series) -> str:
    """Line chart with end labels deconflicted and full names in a bottom legend."""
    ordered = sort_runs(
        runs,
        lambda r: (list((get_series(r) or {}).values()) or [None])[-1],
        higher_is_better=False,
    )
    all_dates = sorted({d for r in ordered for d in (get_series(r) or {})})
    if not all_dates:
        return hbar_chart(title=title, rows=[])

    legend_rows = (len(ordered) + 2) // 3
    left, right, top = 56, 24, 40
    bottom = 28 + legend_rows * 16
    W = 960
    H = 300 + legend_rows * 16
    iW = W - left - right
    iH = H - top - bottom
    vals = [v for r in ordered for v in (get_series(r) or {}).values() if v is not None]
    lo, hi = min(vals + [0]), max(vals + [0])
    span = hi - lo or 1
    pad = span * 0.1
    lo -= pad if lo < 0 else 0
    hi += pad
    span = hi - lo

    def x(i: int) -> float:
        return left + (i / max(len(all_dates) - 1, 1)) * iW

    def y(v: float) -> float:
        return top + iH - ((v - lo) / span) * iH

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{left}" y="24" fill="#e6eaf2" font-size="14" font-family="{FONT}" font-weight="600">{esc(title)}</text>',
    ]
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        v = lo + t * span
        yy = y(v)
        parts.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{W - right}" y2="{yy:.1f}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(
            f'<text x="{left - 8}" y="{yy:.1f}" fill="#8b95a8" font-size="11" text-anchor="end" dominant-baseline="middle" font-family="{FONT}">{v:.3f}</text>'
        )

    for r in ordered:
        series = get_series(r) or {}
        pts = []
        for i, d in enumerate(all_dates):
            v = series.get(d)
            if v is None:
                continue
            pts.append(f"{x(i):.1f},{y(v):.1f}")
        if len(pts) >= 2:
            parts.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{r["_color"]}" stroke-width="2"/>')

    step = max(1, len(all_dates) // 7)
    for i, d in enumerate(all_dates):
        if i % step and i != len(all_dates) - 1:
            continue
        parts.append(
            f'<text x="{x(i):.1f}" y="{top + iH + 14}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="{FONT}">{esc(d[:7])}</text>'
        )

    # legend at bottom — full labels, no overflow
    for i, r in enumerate(ordered):
        col = i % 3
        row = i // 3
        lx = left + col * ((W - left - right) / 3)
        ly = top + iH + 28 + row * 16
        parts.append(f'<rect x="{lx:.0f}" y="{ly - 8}" width="10" height="10" fill="{r["_color"]}"/>')
        parts.append(
            f'<text x="{lx + 14:.0f}" y="{ly:.0f}" fill="#c8ceda" font-size="11" dominant-baseline="middle" font-family="{FONT}">{esc(short_label(r))}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts)


def sophistication_charts(payload: dict, runs: list[dict]) -> tuple[str, str]:
    rc = payload.get("rationale_codes") or {}
    soph = rc.get("sophistication") or {}
    configs = rc.get("configs") or []
    shorts_list = rc.get("short") or []
    means = soph.get("mean") or []
    dists = soph.get("dist") or []
    if not configs:
        empty = hbar_chart(title="Mean sophistication", rows=[])
        return empty, empty

    # Keep only configs present in this study set; map colors from runs.
    color_by = {r.get("config_stem"): r["_color"] for r in runs}
    study_stems = set(color_by)

    items = []
    for i, c in enumerate(configs):
        if study_stems and c not in study_stems:
            continue
        items.append({
            "stem": c,
            "label": shorts_list[i] if i < len(shorts_list) else c,
            "mean": means[i] if i < len(means) else None,
            "dist": dists[i] if i < len(dists) else [0] * 5,
            "color": color_by.get(c, COLORS[i % len(COLORS)]),
        })
    # Sort both charts by mean sophistication (high → top)
    items.sort(key=lambda x: (-(x["mean"] or -1), x["label"]))

    mean_svg = hbar_chart(
        title="Mean sophistication (L0–L4)",
        rows=[{"label": it["label"], "value": it["mean"], "color": it["color"]} for it in items],
        y_label="mean sophistication level · sorted high → low",
        fmt=".2f",
        zero_line=False,
        note="Sorted by mean sophistication (high → low)",
    )

    # stacked distribution — same order as mean chart
    level_names = ["L0", "L1", "L2", "L3", "L4"]
    level_colors = ["#2a1650", "#5b2a6b", "#6e6e8e", "#d97742", "#f5b042"]
    n = len(items)
    labels = [it["label"] for it in items]
    left = max(140, label_width(labels))
    right, top, bottom = 24, 40, 36
    row_h = 28
    W = 920
    H = top + bottom + n * row_h
    plot_w = W - left - right

    def x(v: float) -> float:
        return left + v * plot_w

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Sophistication distribution">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{left}" y="24" fill="#e6eaf2" font-size="14" font-family="{FONT}" font-weight="600">Sophistication level distribution (L0–L4)</text>',
    ]
    for t in (0, 0.25, 0.5, 0.75, 1):
        xx = x(t)
        parts.append(f'<line x1="{xx:.1f}" y1="{top}" x2="{xx:.1f}" y2="{top + n * row_h}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(
            f'<text x="{xx:.1f}" y="{top + n * row_h + 14}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="{FONT}">{int(t * 100)}%</text>'
        )

    bar_h = 14
    for i, it in enumerate(items):
        yy = top + i * row_h + row_h / 2
        acc = 0.0
        for lv, share in enumerate(it["dist"]):
            if share <= 0:
                continue
            parts.append(
                f'<rect x="{x(acc):.1f}" y="{yy - bar_h / 2:.1f}" width="{max(1, share * plot_w):.1f}" height="{bar_h}" fill="{level_colors[lv]}" opacity="0.92"/>'
            )
            acc += share
        parts.append(
            f'<text x="{left - 10}" y="{yy:.1f}" fill="#c8ceda" font-size="12" text-anchor="end" dominant-baseline="middle" font-family="{FONT}">{esc(it["label"])}</text>'
        )

    lx = left
    for lv, name in enumerate(level_names):
        parts.append(f'<rect x="{lx}" y="{H - 16}" width="10" height="10" fill="{level_colors[lv]}"/>')
        parts.append(f'<text x="{lx + 14}" y="{H - 7}" fill="#c8ceda" font-size="10" font-family="{FONT}">{name}</text>')
        lx += 48
    parts.append("</svg>")
    return mean_svg, "\n".join(parts)


def factor_charts(runs: list[dict]) -> tuple[str, str]:
    r2 = config_metric_chart(
        runs,
        title="Mean R² (style + sector controls) · h1",
        get_value=lambda r: r.get("mean_r_squared"),
        y_label="mean R² · sorted low → high (more idiosyncratic left/top)",
        fmt=".3f",
        higher_is_better=False,
    )

    # Collect factors; sort configs by mean |β| then show one hbar panel per factor? 
    # Simpler: for each significant factor, horizontal bars across configs.
    factors = sorted({b["factor"] for r in runs for b in (r.get("sig_betas") or [])})
    if not factors:
        beta = hbar_chart(title="Style-factor loadings", rows=[])
        return r2, beta

    # Compact factor display names (full, not truncated mid-word)
    def fname(f: str) -> str:
        return (
            f.replace("leverage.", "")
            .replace("momentum.", "mom ")
            .replace("value.", "val ")
            .replace("quality.", "qual ")
            .replace("size.", "size ")
            .replace("vol.", "vol ")
            .replace("_", " ")
        )

    # Multi-panel: one row-group of configs per factor is too tall.
    # Instead: grouped horizontal — each config row, show strongest betas as text? 
    # Best readability: for each factor, a small hbar of configs that load it.
    panels = []
    for f in factors:
        rows = []
        for r in sort_runs(
            runs,
            lambda rr, ff=f: next((b["beta"] for b in (rr.get("sig_betas") or []) if b["factor"] == ff), None),
            higher_is_better=True,
        ):
            b = next((x for x in (r.get("sig_betas") or []) if x["factor"] == f), None)
            if not b:
                continue
            rows.append({"label": short_label(r), "value": b["beta"], "color": r["_color"]})
        if rows:
            panels.append(hbar_chart(
                title=f"β · {fname(f)}  (|t| ≥ 2)",
                rows=rows,
                y_label="β",
                fmt=".2f",
                zero_line=True,
            ))

    # Stack panels into one tall SVG by concatenating viewBoxes via nested? 
    # Easier: write separate files — but API returns one. Combine vertically.
    if not panels:
        return r2, hbar_chart(title="Style betas", rows=[])

    # Parse heights from viewBox and stack
    total_h = 0
    widths = []
    bodies = []
    for svg in panels:
        # extract viewBox and inner (strip outer svg tags)
        start = svg.find("viewBox=")
        vb = svg[start:].split('"')[1]
        _, _, w, h = vb.split()
        widths.append(int(float(w)))
        total_h += int(float(h)) + 12
        inner = svg[svg.find(">") + 1 : svg.rfind("</svg>")].strip()
        bodies.append((int(float(w)), int(float(h)), inner))

    W = max(widths)
    H = total_h
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Style-factor loadings">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
    ]
    yoff = 0
    for w, h, inner in bodies:
        # shift group
        parts.append(f'<g transform="translate(0,{yoff})">{inner}</g>')
        yoff += h + 12
    parts.append("</svg>")
    return r2, "\n".join(parts)


def write(path: Path, svg: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(REPO)}")


def export_set(payload: dict, batches: list[str], out: Path, prefix: str) -> None:
    runs = good_runs(payload, batches)
    if not runs:
        print(f"  no runs for {prefix}")
        return

    write(out / f"{prefix}-residual-mean-ic.svg", config_metric_chart(
        runs,
        title="Residual mean IC (h1) · headline KPI",
        get_value=lambda r: h1(r).get("residual_mean_ic"),
        y_label="residual mean IC · sorted high → low",
        fmt=".3f",
        note="h1 only",
    ))
    write(out / f"{prefix}-residual-nw-t.svg", config_metric_chart(
        runs,
        title="Residual NW t (h1) · headline KPI",
        get_value=lambda r: h1(r).get("residual_nw_t"),
        y_label="NW t · sorted high → low",
        fmt=".2f",
        ref_lines=[
            {"value": 1.96, "label": "1.96", "dash": "5 3"},
            {"value": 3.0, "label": "3.0 credible", "dash": "2 4"},
        ],
        note="h1 only · dashed lines at |t|=1.96 and t=3.0",
    ))
    write(out / f"{prefix}-ensemble-wobble.svg", wobble_chart(
        runs, title="Ensemble vs single-run IC (h1)",
    ))
    write(out / f"{prefix}-stochasticity.svg", config_metric_chart(
        runs,
        title="Mean score std across K repeats",
        get_value=lambda r: (r.get("output") or {}).get("mean_score_std"),
        higher_is_better=False,
        y_label="mean score std · sorted high → low (noisier on top)",
        fmt=".3f",
        note="Lower = more reproducible",
    ))
    write(out / f"{prefix}-score-std-by-date.svg", line_by_date(
        runs,
        title="Mean score std by decision date",
        get_series=lambda r: (r.get("output") or {}).get("score_std_by_date") or {},
    ))
    r2, beta = factor_charts(runs)
    write(out / f"{prefix}-mean-r2.svg", r2)
    write(out / f"{prefix}-style-betas.svg", beta)

    if prefix == "main":
        mean_s, dist_s = sophistication_charts(payload, runs)
        write(out / "main-sophistication-mean.svg", mean_s)
        write(out / "main-sophistication-dist.svg", dist_s)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", type=Path, default=REPO / "static" / "data")
    ap.add_argument("--out-dir", type=Path, default=REPO / "static" / "charts")
    args = ap.parse_args()

    data = args.data_dir
    out = args.out_dir
    man = json.loads((data / "manifest.json").read_text())

    print("Exporting paper charts (h1 only, horizontal labels)…")
    export_set(
        json.loads((data / man["compare_files"]["main"]).read_text()),
        man["sets"]["main"],
        out,
        "main",
    )
    export_set(
        json.loads((data / man["compare_files"]["ablation"]).read_text()),
        man["sets"]["ablation"],
        out,
        "ablation",
    )
    print("Done.")


if __name__ == "__main__":
    main()
