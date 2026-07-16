(function () {
  "use strict";

  function dataBase() {
    const meta = document.querySelector('meta[name="paper-data-base"]');
    if (meta?.content) return meta.content.replace(/\/$/, "");
    const scripts = document.querySelectorAll("script[src*='paper-charts']");
    for (const s of scripts) {
      const m = s.src.match(/^(.*)\/js\/paper-charts-mount\.js/);
      if (m) return m[1] + "/data";
    }
    return "/Optimized_Agent/data";
  }

  const BASE = dataBase();
  let _manifest = null;

  async function manifest() {
    if (!_manifest) {
      _manifest = await fetch(`${BASE}/manifest.json`).then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status}`);
        return r.json();
      });
    }
    return _manifest;
  }

  async function loadCompare(set) {
    const man = await manifest();
    const file = man.compare_files[set] || `compare-${set}.json`;
    return fetch(`${BASE}/${file}`).then((r) => {
      if (!r.ok) throw new Error(`compare ${r.status}`);
      return r.json();
    });
  }

  function prepareRuns(payload, batchList) {
    const runs = batchList.map((b) => {
      const r = payload.batches?.[b];
      if (!r) return { batch: b, short: b, error: "missing batch" };
      if (r.error) return { batch: b, short: b, error: r.error };
      return r;
    });
    const good = runs.filter((r) => !r.error);
    good.forEach((r, i) => {
      r._color = cmpColor(i);
    });
    _cmpRationaleCodes = payload.rationale_codes || null;
    _cmpCrossConfig = payload.cross_config || null;
    _cmpItems = good;
    return good;
  }

  function horizonKeys(runs) {
    const allHk = runs.length ? Object.keys(runs[0].horizons || {}) : [];
    return cmpHorizonKeys(allHk.length ? allHk : ["1"]);
  }

  function renderLayer1ResidualKpi(runs, hk) {
    const sortH = cmpFurthestH(hk);
    const sortNote = cmpSortNoteH(sortH);
    const byResidIc = cmpSortBy(runs, (r) => r.horizons[sortH]?.residual_mean_ic, { higherIsBetter: true });
    const icChart = buildCmpBarChart({
      groups: hk.map((h) => `h${h}`),
      series: byResidIc.map((r) => ({
        label: r.short,
        color: r._color,
        values: hk.map((h) => r.horizons[h]?.residual_mean_ic ?? null),
      })),
      yLabel: `Residual mean IC by horizon — factor-neutralised alpha magnitude. ${sortNote}`,
      zeroLine: true,
      fmt: (v) => v.toFixed(3),
    });
    const byResidNw = cmpSortBy(runs, (r) => r.horizons[sortH]?.residual_nw_t, { higherIsBetter: true });
    const nwChart = buildCmpBarChart({
      groups: hk.map((h) => `h${h}`),
      series: byResidNw.map((r) => ({
        label: r.short,
        color: r._color,
        values: hk.map((h) => r.horizons[h]?.residual_nw_t ?? null),
      })),
      yLabel: `Residual mean-IC NW t (HAC, lag = h−1) — significance. ±1.96 = 95%, +3.0 = credible. ${sortNote}`,
      zeroLine: true,
      fmt: (v) => v.toFixed(2),
      refLines: [
        { value: 1.96, label: "1.96 · 95%", color: "var(--muted)", dash: "5 3" },
        { value: -1.96, label: "−1.96", color: "var(--muted)", dash: "5 3" },
        { value: 3.0, label: "3.0 · credible", color: "var(--muted)", dash: "2 4" },
      ],
    });
    return `<div class="chart-block"><h3 class="chart-title">Residual mean IC by horizon (headline KPI)</h3>${icChart}</div>
<div class="chart-block"><h3 class="chart-title">Residual NW t by horizon (headline KPI)</h3>${nwChart}</div>`;
  }

  function renderLayer3Charts(runs) {
    const byStoch = cmpSortBy(runs, (r) => r.output?.mean_score_std, { higherIsBetter: false });
    const bar = buildCmpRunChart({
      runs: byStoch,
      metrics: [
        { label: "mean score std", color: cssVar("--success", "#7ee787"), axis: 0, get: (r) => r.output?.mean_score_std ?? null },
        { label: "mean sign agreement", color: cssVar("--accent2", "#6ea8fe"), axis: 1, get: (r) => r.output?.mean_sign_agreement ?? null },
        { label: "mean rank corr", color: cssVar("--accent-strong", "#ffb000"), axis: 1, get: (r) => r.output?.mean_rank_corr ?? null },
        { label: "mean rationale sim", color: cssVar("--accent3", "#c792ea"), axis: 1, get: (r) => r.output?.mean_rationale_sim ?? null },
      ],
      yLabel: "Left: mean score std. Right: reproducibility metrics (0–1).",
      yLabel2: "",
      zeroLine: true,
      fmt: (v) => v.toFixed(3),
      fmt2: (v) => v.toFixed(2),
    });
    const line = buildCmpScoreStdLineChart({
      runs,
      yLabel: "Mean score std across K repeats per decision date (one line per config).",
    });
    const ticker = buildCmpScoreByTickerChart(runs);
    return `<div class="chart-block"><h3 class="chart-title">Output stochasticity across run</h3>${bar}</div>
<div class="chart-block"><h3 class="chart-title">Mean score std by period</h3>${line}</div>
<div class="chart-block"><h3 class="chart-title">Decision score by ticker (all configs)</h3>${ticker}</div>`;
  }

  function renderLayer2Ensemble(runs, hk) {
    const sortH = cmpFurthestH(hk);
    const sortNote = cmpSortNoteH(sortH);
    const byEns = cmpSortBy(runs, (r) => r.horizons[sortH]?.ensemble_mean_ic, { higherIsBetter: true });
    const stepA = buildCmpWobbleChart({
      runs: byEns,
      hk,
      getRepeats: (r, h) => r.horizons[h]?.per_run_ic || null,
      getEnsemble: (r, h) => r.horizons[h]?.ensemble_mean_ic ?? null,
      yLabel: `Ensemble vs single-run IC: dots = per-run rank-IC, ◆ = ensemble mean IC. ${sortNote}`,
      fmt: (v) => v.toFixed(3),
    });
    return `<div class="chart-block"><h3 class="chart-title">Ensemble vs single-run IC (wobble)</h3>${stepA}</div>`;
  }

  async function renderDynamicStochasticity(batchList, el) {
    const man = await manifest();
    const options = batchList
      .map((b) => `<option value="${b}">${_esc(b.replace(/_report$/, "").replace(/_pearson_report$/, ""))}</option>`)
      .join("");
    el.innerHTML = `<div class="chart-toolbar">
      <span class="chart-toolbar-label">Config</span>
      <select id="paperDynConfig">${options}</select>
    </div>
    <div id="paperDynPlot" class="paper-loading">Loading…</div>`;
    const sel = el.querySelector("#paperDynConfig");
    const plot = el.querySelector("#paperDynPlot");
    async function refresh() {
      const batch = sel.value;
      plot.innerHTML = '<p class="paper-loading">Loading report…</p>';
      try {
        const report = await fetch(`${BASE}/reports/${batch}/report.json`).then((r) => r.json());
        const out = report.output || {};
        const perCell = out.per_cell || [];
        const varChart = buildVarianceChart(perCell);
        const scoreChart = buildScoreTimeseriesChart(out);
        plot.innerHTML = `<div class="chart-block"><h3 class="chart-title">Score std &amp; sign agreement by period</h3>${varChart || '<p class="empty-note">No per-cell variance data.</p>'}</div>
<div class="chart-block"><h3 class="chart-title">Per-ticker scores (K runs)</h3>${scoreChart || '<p class="empty-note">No per-run score series.</p>'}</div>`;
      } catch (e) {
        plot.innerHTML = `<p class="empty-note">Failed to load report: ${_esc(String(e))}</p>`;
      }
    }
    sel.addEventListener("change", refresh);
    await refresh();
  }

  const SECTIONS = {
    "layer1-residual-kpi": (runs, hk) => renderLayer1ResidualKpi(runs, hk),
    "layer3-stochasticity": (runs, hk) => renderLayer3Charts(runs),
    "layer2-ensemble-ic": (runs, hk) => renderLayer2Ensemble(runs, hk),
    "factor-loadings": (runs) => renderCmpBetas(runs),
    "sophistication": (runs) => renderCmpCoherenceSoph(runs),
    ablation: (runs, hk) =>
      renderCmpBetas(runs) +
      renderLayer3Charts(runs) +
      renderLayer2Ensemble(runs, hk),
  };

  async function mount(el) {
    const section = el.dataset.section;
    const set = el.dataset.batchSet || "main";
    el.innerHTML = '<p class="paper-loading">Loading study data…</p>';
    try {
      const man = await manifest();
      const batches = man.sets[set];
      if (!batches?.length) throw new Error(`unknown batch set: ${set}`);
      if (section === "layer3-dynamic") {
        el.classList.add("paper-charts");
        await renderDynamicStochasticity(batches, el);
        return;
      }
      const payload = await loadCompare(set);
      const runs = prepareRuns(payload, batches);
      if (!runs.length) throw new Error("no valid configs in compare payload");
      const hk = horizonKeys(runs);
      const fn = SECTIONS[section];
      if (!fn) throw new Error(`unknown section: ${section}`);
      el.classList.add("paper-charts");
      el.innerHTML = fn(runs, hk);
    } catch (err) {
      el.classList.add("paper-charts");
      el.innerHTML = `<p class="empty-note">Chart failed to load: ${_esc(String(err))}</p>`;
    }
  }

  function boot() {
    document.querySelectorAll("[data-paper-chart]").forEach((el) => mount(el));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
