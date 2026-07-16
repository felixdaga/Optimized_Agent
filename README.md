# Optimized Agent

Research on **systematically optimizing AI agents for alpha generation** — framework paper, DJIA demonstration, and (soon) the **Delorean** backtesting platform.

**Live site:** https://felixdaga.github.io/Optimized_Agent/

**Latest post:** [Optimizing AI agents for alpha generation](https://felixdaga.github.io/Optimized_Agent/posts/2026-07-16-optimizing-ai-agents-for-alpha-generation/)

If you want the paper or Delorean when it ships, **[star this repo ⭐](https://github.com/felixdaga/Optimized_Agent)**.

---

## Delorean

**Delorean** is the AI-native backtesting platform used in the demonstration — PIT-safe, K-repeat ensembling, residual IC promotion, twin continuity, and the full CLI workflow (`configure`, `run` / `repeat`, `report`, `compare`).

**Status:** not published yet. **Delorean will be open-sourced in this repo** when ready. Star the repo above to follow along.

---

## Local preview (blog)

Requires [Hugo Extended](https://gohugo.io/installation/):

```bash
git submodule update --init --recursive
hugo server -D
```

Open http://localhost:1313/Optimized_Agent/

## Publish

Push to `main`. GitHub Actions builds with [Hugo PaperMod](https://github.com/adityatelange/hugo-PaperMod) and deploys to GitHub Pages.

## Study data & charts

Paper embeds **static SVG charts** under `static/charts/`, built from Pearson `report.json` files in `static/data/`.

```bash
python scripts/export_study_data.py --delorean-root ../delorean
python scripts/export_paper_charts.py
```

Then commit `static/data/` + `static/charts/` and push.
