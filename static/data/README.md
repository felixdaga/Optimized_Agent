# Study data (paper charts + replication)

Exported from Delorean with `scripts/export_study_data.py`.

| Path | Contents |
|------|----------|
| `manifest.json` | Batch sets (`main` = 9-config grid, `ablation` = 3 cells) |
| `compare-main.json` | Compare payload for cross-config charts (from `report.json`) |
| `compare-ablation.json` | Ablation compare payload |
| `reports/*_report/report.json` | Full Delorean reports (~600 KB each) |
| `decisions/{run_id}/*.json` | Raw agent decision files (one per quarterly date) |

## Re-export

```bash
python scripts/export_study_data.py --delorean-root ../delorean
python scripts/export_study_data.py --skip-decisions   # charts only
```

Charts on the blog load `compare-*.json` at read time; dynamic per-config charts fetch `reports/{batch}/report.json` for `per_cell` variance and per-ticker score series.
