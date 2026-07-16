# Study data (paper charts + replication)

Exported from Delorean with:

```bash
python scripts/export_study_data.py --delorean-root ../delorean
python scripts/export_paper_charts.py
```

| Path | Contents |
|------|----------|
| `manifest.json` | Batch sets (`main`, `ablation`) — **Pearson-face** reports |
| `compare-main.json` / `compare-ablation.json` | Compare payloads for chart export |
| `reports/*_pearson_report/report.json` | Full Delorean reports |
| `decisions/{run_id}/*.json` | Raw agent decision files |
| `../charts/*.svg` | Static SVGs embedded in the post |

Charts are **static SVGs** (not live JS). Re-run both scripts after new Delorean results, then commit `static/data/` and `static/charts/`.
