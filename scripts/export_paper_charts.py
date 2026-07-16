#!/usr/bin/env python3
"""Export static SVG charts for the Optimized Agent paper from compare JSON.

Usage:
  python scripts/export_paper_charts.py
  python scripts/export_paper_charts.py --data-dir static/data --out-dir static/charts
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
    return s


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


def bar_chart(
    *,
    title: str,
    labels: list[str],
    series: list[dict],
    y_label: str = "",
    zero_line: bool = True,
    ref_lines: list[dict] | None = None,
    width: int | None = None,
    height: int = 320,
    fmt: str = ".3f",
) -> str:
    """series: [{label, color, values: [float|None,...]} ] one value per group label."""
    n = max(len(labels), 1)
    ns = max(len(series), 1)
    W = width or max(720, 80 + n * max(90, 28 * ns))
    H = height
    P = {"t": 36, "r": 24, "b": 88, "l": 56}
    iW = W - P["l"] - P["r"]
    iH = H - P["t"] - P["b"]

    vals = [v for s in series for v in s["values"] if v is not None and math.isfinite(v)]
    if not vals:
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 80"><text x="20" y="40" fill="#8b95a8">No data</text></svg>'

    lo, hi = min(vals), max(vals)
    if zero_line:
        lo = min(lo, 0.0)
        hi = max(hi, 0.0)
    span = hi - lo or 1.0
    pad = span * 0.12
    lo -= pad if lo < 0 else 0
    hi += pad
    span = hi - lo

    def y(v: float) -> float:
        return P["t"] + iH - ((v - lo) / span) * iH

    group_w = iW / n
    bar_w = min(28.0, (group_w * 0.7) / ns)
    gap = bar_w * 0.15

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{P["l"]}" y="22" fill="#e6eaf2" font-size="14" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">{esc(title)}</text>',
    ]

    # grid
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        v = lo + t * span
        yy = y(v)
        parts.append(
            f'<line x1="{P["l"]}" y1="{yy:.1f}" x2="{W - P["r"]}" y2="{yy:.1f}" stroke="#2a3140" stroke-dasharray="4 4"/>'
        )
        parts.append(
            f'<text x="{P["l"] - 8}" y="{yy:.1f}" fill="#8b95a8" font-size="11" text-anchor="end" dominant-baseline="middle" font-family="ui-sans-serif,system-ui,sans-serif">{format(v, fmt)}</text>'
        )

    if zero_line and lo < 0 < hi:
        zy = y(0)
        parts.append(
            f'<line x1="{P["l"]}" y1="{zy:.1f}" x2="{W - P["r"]}" y2="{zy:.1f}" stroke="#8b95a8" stroke-width="1.2" stroke-dasharray="5 3"/>'
        )

    for ref in ref_lines or []:
        v = ref["value"]
        if v < lo or v > hi:
            continue
        yy = y(v)
        parts.append(
            f'<line x1="{P["l"]}" y1="{yy:.1f}" x2="{W - P["r"]}" y2="{yy:.1f}" stroke="#8b95a8" stroke-dasharray="{ref.get("dash", "4 3")}" opacity="0.85"/>'
        )
        parts.append(
            f'<text x="{W - P["r"]}" y="{yy - 4:.1f}" fill="#8b95a8" font-size="10" text-anchor="end" font-family="ui-sans-serif,system-ui,sans-serif">{esc(ref.get("label", ""))}</text>'
        )

    for gi, lab in enumerate(labels):
        cx = P["l"] + gi * group_w + group_w / 2
        for si, s in enumerate(series):
            v = s["values"][gi] if gi < len(s["values"]) else None
            if v is None or not math.isfinite(v):
                continue
            x = cx - (ns * bar_w + (ns - 1) * gap) / 2 + si * (bar_w + gap)
            y0 = y(0) if zero_line else y(lo)
            y1 = y(v)
            top, bot = min(y0, y1), max(y0, y1)
            h = max(1.5, bot - top)
            parts.append(
                f'<rect x="{x:.1f}" y="{top:.1f}" width="{bar_w:.1f}" height="{h:.1f}" fill="{s["color"]}" opacity="0.9">'
                f'<title>{esc(s["label"])} · {esc(lab)}: {format(v, fmt)}</title></rect>'
            )
        # x label — wrap long names
        lab_s = lab if len(lab) <= 18 else lab[:16] + "…"
        parts.append(
            f'<text x="{cx:.1f}" y="{H - 48}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" transform="rotate(-28 {cx:.1f},{H - 48})">{esc(lab_s)}</text>'
        )

    if y_label:
        parts.append(
            f'<text x="14" y="{P["t"] + iH / 2}" fill="#8b95a8" font-size="11" text-anchor="middle" transform="rotate(-90 14,{P["t"] + iH / 2})" font-family="ui-sans-serif,system-ui,sans-serif">{esc(y_label)}</text>'
        )

    # legend
    lx = P["l"]
    ly = H - 14
    if len(series) > 1:
        for s in series:
            parts.append(f'<rect x="{lx}" y="{ly - 8}" width="10" height="10" fill="{s["color"]}"/>')
            parts.append(
                f'<text x="{lx + 14}" y="{ly}" fill="#c8ceda" font-size="10" font-family="ui-sans-serif,system-ui,sans-serif">{esc(s["label"])}</text>'
            )
            lx += 14 + min(160, 8 * len(s["label"])) + 16

    parts.append("</svg>")
    return "\n".join(parts)


def grouped_config_bars(
    runs: list[dict],
    *,
    title: str,
    get_value,
    higher_is_better: bool = True,
    y_label: str = "",
    fmt: str = ".3f",
    ref_lines: list[dict] | None = None,
) -> str:
    ordered = sorted(
        runs,
        key=lambda r: (
            get_value(r) is None,
            -(get_value(r) or 0) if higher_is_better else (get_value(r) or 0),
        ),
    )
    labels = [short_label(r) for r in ordered]
    values = [get_value(r) for r in ordered]
    colors = [r["_color"] for r in ordered]

    n = max(len(labels), 1)
    W = max(720, 80 + n * 90)
    H = 320
    P = {"t": 36, "r": 24, "b": 88, "l": 56}
    iW = W - P["l"] - P["r"]
    iH = H - P["t"] - P["b"]
    vals = [v for v in values if v is not None and math.isfinite(v)]
    if not vals:
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 80"><text x="20" y="40" fill="#8b95a8">No data</text></svg>'
    lo, hi = min(vals + [0.0]), max(vals + [0.0])
    span = hi - lo or 1.0
    pad = span * 0.12
    lo -= pad if lo < 0 else 0
    hi += pad
    span = hi - lo

    def y(v: float) -> float:
        return P["t"] + iH - ((v - lo) / span) * iH

    group_w = iW / n
    bar_w = min(42.0, group_w * 0.55)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{P["l"]}" y="22" fill="#e6eaf2" font-size="14" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">{esc(title)}</text>',
    ]
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        v = lo + t * span
        yy = y(v)
        parts.append(f'<line x1="{P["l"]}" y1="{yy:.1f}" x2="{W - P["r"]}" y2="{yy:.1f}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(f'<text x="{P["l"] - 8}" y="{yy:.1f}" fill="#8b95a8" font-size="11" text-anchor="end" dominant-baseline="middle" font-family="ui-sans-serif,system-ui,sans-serif">{format(v, fmt)}</text>')
    if lo < 0 < hi:
        parts.append(f'<line x1="{P["l"]}" y1="{y(0):.1f}" x2="{W - P["r"]}" y2="{y(0):.1f}" stroke="#8b95a8" stroke-dasharray="5 3"/>')
    for ref in ref_lines or []:
        v = ref["value"]
        if lo <= v <= hi:
            yy = y(v)
            parts.append(f'<line x1="{P["l"]}" y1="{yy:.1f}" x2="{W - P["r"]}" y2="{yy:.1f}" stroke="#8b95a8" stroke-dasharray="{ref.get("dash", "4 3")}"/>')
            parts.append(f'<text x="{W - P["r"]}" y="{yy - 4:.1f}" fill="#8b95a8" font-size="10" text-anchor="end" font-family="ui-sans-serif,system-ui,sans-serif">{esc(ref.get("label", ""))}</text>')
    for i, (lab, v, col) in enumerate(zip(labels, values, colors)):
        if v is None or not math.isfinite(v):
            continue
        cx = P["l"] + i * group_w + group_w / 2
        x = cx - bar_w / 2
        y0, y1 = y(0), y(v)
        top, bot = min(y0, y1), max(y0, y1)
        parts.append(f'<rect x="{x:.1f}" y="{top:.1f}" width="{bar_w:.1f}" height="{max(1.5, bot - top):.1f}" fill="{col}" opacity="0.9"><title>{esc(lab)}: {format(v, fmt)}</title></rect>')
        lab_s = lab if len(lab) <= 16 else lab[:14] + "…"
        parts.append(f'<text x="{cx:.1f}" y="{H - 48}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" transform="rotate(-28 {cx:.1f},{H - 48})">{esc(lab_s)}</text>')
    if y_label:
        parts.append(f'<text x="14" y="{P["t"] + iH / 2}" fill="#8b95a8" font-size="11" text-anchor="middle" transform="rotate(-90 14,{P["t"] + iH / 2})" font-family="ui-sans-serif,system-ui,sans-serif">{esc(y_label)}</text>')
    parts.append("</svg>")
    return "\n".join(parts)


def horizon_bars(
    runs: list[dict],
    *,
    title: str,
    field: str,
    fmt: str = ".3f",
    ref_lines: list[dict] | None = None,
    y_label: str = "",
    sort_h: str = "1",
    higher_is_better: bool = True,
) -> str:
    ordered = sorted(
        runs,
        key=lambda r: (
            ((r.get("horizons") or {}).get(sort_h) or {}).get(field) is None,
            -(((r.get("horizons") or {}).get(sort_h) or {}).get(field) or 0)
            if higher_is_better
            else (((r.get("horizons") or {}).get(sort_h) or {}).get(field) or 0),
        ),
    )
    # collect horizons present
    hk = sorted(
        {h for r in runs for h in (r.get("horizons") or {})},
        key=lambda x: int(x) if str(x).isdigit() else 99,
    )
    if not hk:
        hk = ["1"]
    # Prefer h1 only for headline clarity if many horizons clutter
    groups = [f"h{h}" for h in hk]
    series = []
    for r in ordered:
        series.append({
            "label": short_label(r),
            "color": r["_color"],
            "values": [
                ((r.get("horizons") or {}).get(h) or {}).get(field)
                for h in hk
            ],
        })
    return bar_chart(
        title=title,
        labels=groups,
        series=series,
        y_label=y_label,
        fmt=fmt,
        ref_lines=ref_lines,
        zero_line=True,
        width=max(900, 120 + len(hk) * max(100, 22 * len(series))),
    )


def wobble_chart(runs: list[dict], *, title: str, h: str = "1") -> str:
    """Ensemble ◆ vs per-run IC dots for one horizon."""
    ordered = sorted(
        runs,
        key=lambda r: -(((r.get("horizons") or {}).get(h) or {}).get("ensemble_mean_ic") or -999),
    )
    n = len(ordered)
    W = max(900, 100 + n * 90)
    H = 320
    P = {"t": 36, "r": 24, "b": 88, "l": 56}
    iW = W - P["l"] - P["r"]
    iH = H - P["t"] - P["b"]

    dots = []
    ens = []
    for r in ordered:
        cell = (r.get("horizons") or {}).get(h) or {}
        e = cell.get("ensemble_mean_ic")
        ens.append(e)
        for v in cell.get("per_run_ic") or []:
            if v is not None:
                dots.append(v)
    vals = [v for v in ens + dots if v is not None]
    if not vals:
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80"><text x="20" y="40" fill="#8b95a8">No data</text></svg>'
    lo, hi = min(vals + [0]), max(vals + [0])
    span = hi - lo or 1
    pad = span * 0.12
    lo -= pad if lo < 0 else 0
    hi += pad
    span = hi - lo

    def y(v: float) -> float:
        return P["t"] + iH - ((v - lo) / span) * iH

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{P["l"]}" y="22" fill="#e6eaf2" font-size="14" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">{esc(title)}</text>',
    ]
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        v = lo + t * span
        yy = y(v)
        parts.append(f'<line x1="{P["l"]}" y1="{yy:.1f}" x2="{W - P["r"]}" y2="{yy:.1f}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(f'<text x="{P["l"] - 8}" y="{yy:.1f}" fill="#8b95a8" font-size="11" text-anchor="end" dominant-baseline="middle" font-family="ui-sans-serif,system-ui,sans-serif">{v:.3f}</text>')
    if lo < 0 < hi:
        parts.append(f'<line x1="{P["l"]}" y1="{y(0):.1f}" x2="{W - P["r"]}" y2="{y(0):.1f}" stroke="#8b95a8" stroke-dasharray="5 3"/>')

    slot = iW / n
    for i, r in enumerate(ordered):
        cx = P["l"] + slot * i + slot / 2
        cell = (r.get("horizons") or {}).get(h) or {}
        for v in cell.get("per_run_ic") or []:
            if v is None:
                continue
            parts.append(f'<circle cx="{cx:.1f}" cy="{y(v):.1f}" r="4" fill="{r["_color"]}" opacity="0.55"/>')
        e = cell.get("ensemble_mean_ic")
        if e is not None:
            parts.append(
                f'<polygon points="{cx:.1f},{y(e) - 7:.1f} {cx + 6:.1f},{y(e) + 4:.1f} {cx - 6:.1f},{y(e) + 4:.1f}" fill="{r["_color"]}"/>'
            )
        lab = short_label(r)
        lab_s = lab if len(lab) <= 16 else lab[:14] + "…"
        parts.append(
            f'<text x="{cx:.1f}" y="{H - 48}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" transform="rotate(-28 {cx:.1f},{H - 48})">{esc(lab_s)}</text>'
        )
    parts.append(
        f'<text x="{P["l"]}" y="{H - 12}" fill="#8b95a8" font-size="10" font-family="ui-sans-serif,system-ui,sans-serif">dots = per-run IC · ◆ = ensemble mean IC (h{h})</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)


def line_by_date(runs: list[dict], *, title: str, get_series) -> str:
    """get_series(r) -> {date: value}."""
    all_dates = sorted({d for r in runs for d in (get_series(r) or {})})
    if not all_dates:
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80"><text x="20" y="40" fill="#8b95a8">No data</text></svg>'
    W = max(900, 80 + len(all_dates) * 40)
    H = 300
    P = {"t": 36, "r": 160, "b": 48, "l": 56}
    iW = W - P["l"] - P["r"]
    iH = H - P["t"] - P["b"]
    vals = [v for r in runs for v in (get_series(r) or {}).values() if v is not None]
    lo, hi = min(vals + [0]), max(vals + [0])
    span = hi - lo or 1
    pad = span * 0.1
    lo -= pad if lo < 0 else 0
    hi += pad
    span = hi - lo

    def x(i: int) -> float:
        return P["l"] + (i / max(len(all_dates) - 1, 1)) * iW

    def y(v: float) -> float:
        return P["t"] + iH - ((v - lo) / span) * iH

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{P["l"]}" y="22" fill="#e6eaf2" font-size="14" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">{esc(title)}</text>',
    ]
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        v = lo + t * span
        yy = y(v)
        parts.append(f'<line x1="{P["l"]}" y1="{yy:.1f}" x2="{W - P["r"]}" y2="{yy:.1f}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(f'<text x="{P["l"] - 8}" y="{yy:.1f}" fill="#8b95a8" font-size="11" text-anchor="end" dominant-baseline="middle" font-family="ui-sans-serif,system-ui,sans-serif">{v:.3f}</text>')

    for r in runs:
        series = get_series(r) or {}
        pts = []
        for i, d in enumerate(all_dates):
            v = series.get(d)
            if v is None:
                continue
            pts.append(f"{x(i):.1f},{y(v):.1f}")
        if len(pts) >= 2:
            parts.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{r["_color"]}" stroke-width="2"/>')
        # end label
        last = None
        for d in reversed(all_dates):
            if d in series:
                last = (d, series[d])
                break
        if last:
            i = all_dates.index(last[0])
            parts.append(
                f'<text x="{W - P["r"] + 6}" y="{y(last[1]):.1f}" fill="{r["_color"]}" font-size="10" dominant-baseline="middle" font-family="ui-sans-serif,system-ui,sans-serif">{esc(short_label(r))}</text>'
            )

    step = max(1, len(all_dates) // 7)
    for i, d in enumerate(all_dates):
        if i % step and i != len(all_dates) - 1:
            continue
        parts.append(
            f'<text x="{x(i):.1f}" y="{H - 12}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">{esc(d[:7])}</text>'
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
        empty = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80"><text x="20" y="40" fill="#8b95a8">No sophistication data</text></svg>'
        return empty, empty

    color_by = {}
    for r in runs:
        stem = r.get("config_stem") or ""
        color_by[stem] = r["_color"]

    labels = [shorts_list[i] if i < len(shorts_list) else c for i, c in enumerate(configs)]

    mean_svg = grouped_config_bars(
        [
            {
                "short": labels[i],
                "config_stem": configs[i],
                "_color": color_by.get(configs[i], COLORS[i % len(COLORS)]),
                "_mean": means[i] if i < len(means) else None,
            }
            for i in range(len(configs))
        ],
        title="Mean sophistication (L0–L4)",
        get_value=lambda r: r.get("_mean"),
        y_label="mean level",
        fmt=".2f",
        higher_is_better=True,
    )

    # stacked distribution
    level_names = ["L0", "L1", "L2", "L3", "L4"]
    level_colors = ["#2a1650", "#5b2a6b", "#6e6e8e", "#d97742", "#f5b042"]
    n = len(configs)
    W = max(900, 80 + n * 90)
    H = 320
    P = {"t": 36, "r": 24, "b": 72, "l": 48}
    iW = W - P["l"] - P["r"]
    iH = H - P["t"] - P["b"]
    group_w = iW / n
    bar_w = min(48, group_w * 0.5)

    def y(v: float) -> float:
        return P["t"] + iH - v * iH

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Sophistication distribution">',
        f'<rect width="{W}" height="{H}" fill="#0f1117"/>',
        f'<text x="{P["l"]}" y="22" fill="#e6eaf2" font-size="14" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">Sophistication level distribution (L0–L4)</text>',
    ]
    for t in (0, 0.25, 0.5, 0.75, 1):
        yy = y(t)
        parts.append(f'<line x1="{P["l"]}" y1="{yy:.1f}" x2="{W - P["r"]}" y2="{yy:.1f}" stroke="#2a3140" stroke-dasharray="4 4"/>')
        parts.append(f'<text x="{P["l"] - 6}" y="{yy:.1f}" fill="#8b95a8" font-size="11" text-anchor="end" dominant-baseline="middle" font-family="ui-sans-serif,system-ui,sans-serif">{int(t*100)}%</text>')

    for i, c in enumerate(configs):
        dist = dists[i] if i < len(dists) else [0] * 5
        cx = P["l"] + i * group_w + group_w / 2
        x = cx - bar_w / 2
        acc = 0.0
        for lv, share in enumerate(dist):
            if share <= 0:
                continue
            top = y(acc + share)
            bot = y(acc)
            parts.append(
                f'<rect x="{x:.1f}" y="{top:.1f}" width="{bar_w:.1f}" height="{max(1, bot - top):.1f}" fill="{level_colors[lv]}" opacity="0.92"/>'
            )
            acc += share
        lab = labels[i]
        lab_s = lab if len(lab) <= 16 else lab[:14] + "…"
        parts.append(
            f'<text x="{cx:.1f}" y="{H - 40}" fill="#8b95a8" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" transform="rotate(-28 {cx:.1f},{H - 40})">{esc(lab_s)}</text>'
        )

    lx = P["l"]
    for lv, name in enumerate(level_names):
        parts.append(f'<rect x="{lx}" y="{H - 16}" width="10" height="10" fill="{level_colors[lv]}"/>')
        parts.append(f'<text x="{lx + 14}" y="{H - 7}" fill="#c8ceda" font-size="10" font-family="ui-sans-serif,system-ui,sans-serif">{name}</text>')
        lx += 50
    parts.append("</svg>")
    return mean_svg, "\n".join(parts)


def factor_charts(runs: list[dict]) -> tuple[str, str]:
    # mean R²
    r2 = grouped_config_bars(
        runs,
        title="Mean R² (style + sector controls)",
        get_value=lambda r: r.get("mean_r_squared"),
        y_label="mean R²",
        fmt=".3f",
        higher_is_better=False,
    )
    # significant betas across factors
    factors = sorted({b["factor"] for r in runs for b in (r.get("sig_betas") or [])})
    if not factors:
        beta = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80"><text x="20" y="40" fill="#8b95a8">No significant style betas (|t|≥2)</text></svg>'
    else:
        series = []
        for r in runs:
            by = {b["factor"]: b["beta"] for b in (r.get("sig_betas") or [])}
            series.append({
                "label": short_label(r),
                "color": r["_color"],
                "values": [by.get(f) for f in factors],
            })
        # shorten factor names
        labs = [f.replace("leverage.", "").replace("momentum.", "mom.")[:22] for f in factors]
        beta = bar_chart(
            title="Style-factor loadings (significant β, |t| ≥ 2)",
            labels=labs,
            series=series,
            y_label="β",
            fmt=".2f",
            zero_line=True,
            width=max(1000, 100 + len(factors) * max(80, 18 * len(series))),
        )
    return r2, beta


def write(path: Path, svg: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(REPO)}")


def export_set(payload: dict, batches: list[str], out: Path, prefix: str) -> None:
    runs = good_runs(payload, batches)
    if not runs:
        print(f"  no runs for {prefix}")
        return

    write(out / f"{prefix}-residual-mean-ic.svg", horizon_bars(
        runs,
        title="Residual mean IC by horizon (headline KPI)",
        field="residual_mean_ic",
        y_label="residual mean IC",
        fmt=".3f",
    ))
    write(out / f"{prefix}-residual-nw-t.svg", horizon_bars(
        runs,
        title="Residual NW t by horizon (headline KPI)",
        field="residual_nw_t",
        y_label="NW t",
        fmt=".2f",
        ref_lines=[
            {"value": 1.96, "label": "1.96 · 95%", "dash": "5 3"},
            {"value": -1.96, "label": "−1.96", "dash": "5 3"},
            {"value": 3.0, "label": "3.0 · credible", "dash": "2 4"},
        ],
    ))
    write(out / f"{prefix}-ensemble-wobble.svg", wobble_chart(
        runs, title="Ensemble vs single-run IC (h1)", h="1",
    ))
    write(out / f"{prefix}-stochasticity.svg", grouped_config_bars(
        runs,
        title="Mean score std across K repeats (lower = more reproducible)",
        get_value=lambda r: (r.get("output") or {}).get("mean_score_std"),
        higher_is_better=False,
        y_label="mean score std",
        fmt=".3f",
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
    main_batches = man["sets"]["main"]
    abl_batches = man["sets"]["ablation"]

    print("Exporting paper charts…")
    export_set(
        json.loads((data / man["compare_files"]["main"]).read_text()),
        main_batches,
        out,
        "main",
    )
    export_set(
        json.loads((data / man["compare_files"]["ablation"]).read_text()),
        abl_batches,
        out,
        "ablation",
    )
    print("Done.")


if __name__ == "__main__":
    main()
