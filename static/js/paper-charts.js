// ── shared ────────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const cssVar = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const theme = {
  accentStrong: cssVar("--accent-strong", "#ffb000"),
  accent2: cssVar("--accent2", "#00d9ff"),
  danger: cssVar("--danger", "#ff4d1f"),
  violet: cssVar("--violet", "#b66cff"),
  success: cssVar("--success", "#68ff9a"),
  muted: cssVar("--muted", "#8b95a8"),
};
let symbolsReady;
let cacheLoaded = false;

// ── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`#tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "cache" && !cacheLoaded) {
      symbolsReady.then(loadData);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — Cache Data
// ══════════════════════════════════════════════════════════════════════════════

let rows = [];
let filtered = [];
let sortCol = null;
let sortAsc = true;
let page = 0;

async function loadSymbols() {
  const res = await fetch("/api/symbols");
  const symbols = await res.json();
  const sel = $("#symbol");
  sel.innerHTML = symbols.map((s) => `<option value="${s}">${s}</option>`).join("");
}

function flattenValue(v) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function rowToFlat(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    out[k] = flattenValue(v);
  }
  return out;
}

async function loadData() {
  cacheLoaded = true;
  const symbol = $("#symbol").value;
  const dataset = $("#dataset").value;
  $("#meta").textContent = "Loading…";
  $("#filter").value = "";
  page = 0;
  sortCol = null;

  const res = await fetch(`/api/data/${encodeURIComponent(symbol)}/${dataset}`);
  if (!res.ok) {
    rows = []; filtered = []; render();
    $("#meta").textContent = `Error: ${res.status}`;
    return;
  }
  const payload = await res.json();
  rows = (payload.rows || []).map(rowToFlat);
  filtered = rows.slice();
  const meta = payload.meta || {};
  $("#meta").textContent = [
    meta.coverage ? `coverage: ${meta.coverage}` : null,
    meta.note || null,
    `${rows.length} row(s)`,
  ].filter(Boolean).join(" · ");
  render();
}

function applyFilter() {
  const q = $("#filter").value.trim().toLowerCase();
  filtered = q
    ? rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)))
    : rows.slice();
  page = 0; render();
}

function sortRows(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = true; }
  filtered.sort((a, b) => {
    const av = a[col] ?? "", bv = b[col] ?? "";
    const an = Number(av), bn = Number(bv);
    const bothNum = av !== "" && bv !== "" && !Number.isNaN(an) && !Number.isNaN(bn);
    const cmp = bothNum ? an - bn : String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });
  render();
}

function render() {
  const pageSize = Number($("#pageSize").value);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.min(page, pages - 1);
  const start = page * pageSize;
  const slice = filtered.slice(start, start + pageSize);
  const thead = $("#table thead"), tbody = $("#table tbody");

  if (!slice.length) {
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td class="empty" colspan="99">No rows</td></tr>`;
    $("#pageInfo").textContent = "0 rows";
    $("#prev").disabled = true; $("#next").disabled = true;
    return;
  }

  const cols = Object.keys(slice[0]);
  thead.innerHTML = "<tr>" + cols.map((c) => {
    const arrow = sortCol === c ? (sortAsc ? " ▲" : " ▼") : "";
    return `<th data-col="${c}">${c}${arrow}</th>`;
  }).join("") + "</tr>";
  thead.querySelectorAll("th").forEach((th) =>
    th.addEventListener("click", () => sortRows(th.dataset.col))
  );
  tbody.innerHTML = slice.map((r) => {
    const tds = cols.map((c) => {
      const v = r[c] ?? "";
      const cls = /^-?\d+(\.\d+)?$/.test(v) ? "num" : "";
      const title = v.length > 40 ? v : "";
      return `<td class="${cls}" title="${title.replace(/"/g, "&quot;")}">${v}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  $("#pageInfo").textContent = `Page ${page + 1} / ${pages} · showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total}`;
  $("#prev").disabled = page <= 0;
  $("#next").disabled = page >= pages - 1;
}

$("#symbol").addEventListener("change", loadData);
$("#dataset").addEventListener("change", loadData);
$("#filter").addEventListener("input", applyFilter);
$("#pageSize").addEventListener("change", () => { page = 0; render(); });
$("#prev").addEventListener("click", () => { page -= 1; render(); });
$("#next").addEventListener("click", () => { page += 1; render(); });

symbolsReady = document.getElementById("symbol") ? loadSymbols() : Promise.resolve();

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Analytics
// ══════════════════════════════════════════════════════════════════════════════

// ── Commentary parser ─────────────────────────────────────────────────────────
// Primary: extract by <!-- section:key --> markers the agent embeds.
// Fallback: extract by H2 heading text with keyword matching.
// Either way the result is { key: "body markdown" }.
function parseCommentarySections(md) {
  if (!md) return {};
  // Try explicit markers first: <!-- section:gate --> etc.
  const markerRe = /<!--\s*section\s*:\s*(\w+)\s*-->/gi;
  const markers = [];
  let m;
  while ((m = markerRe.exec(md)) !== null) markers.push({ key: m[1].toLowerCase(), idx: m.index + m[0].length });
  if (markers.length >= 2) {
    const map = {};
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].idx;
      const end   = i + 1 < markers.length ? markers[i + 1].idx - markers[i + 1].key.length - 20 : md.length;
      let body = md.slice(start, Math.max(start, end)).trim();
      body = body.replace(/^## .+\n?/, "").trim(); // strip the heading line itself
      map[markers[i].key] = body;
    }
    return map;
  }
  // Fallback: split by H2 headings, match by keywords in getSection
  const map = {};
  let key = null, buf = [];
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) {
      if (key !== null) map[key] = buf.join("\n").trim();
      key = line.slice(3).trim(); buf = [];
    } else if (key !== null) { buf.push(line); }
  }
  if (key !== null) map[key] = buf.join("\n").trim();
  return map;
}

function getSection(map, ...keywords) {
  for (const [k, v] of Object.entries(map)) {
    if (keywords.some((kw) => k.toLowerCase().includes(kw))) return v;
  }
  return null;
}

// ── Minimal Markdown → HTML ───────────────────────────────────────────────────
// Handles: ### headings, | tables |, - / 1. lists, **bold**, *italic*, `code`, ---
function mdToHtml(md) {
  if (!md) return "";
  const out = [];
  let mode = ""; // "" | "ul" | "ol" | "table"
  let para = [];
  let tableHdr = false;

  const fmt = (s) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
     .replace(/`([^`]+)`/g, "<code>$1</code>");

  function flushPara() {
    if (para.length) { out.push(`<p>${para.join(" ")}</p>`); para = []; }
  }
  function closeMode() {
    flushPara();
    if (mode === "ul") out.push("</ul>");
    if (mode === "ol") out.push("</ol>");
    if (mode === "table") { if (!tableHdr) out.push("</thead>"); out.push("</tbody></table></div>"); }
    mode = ""; tableHdr = false;
  }

  for (const raw of md.split("\n")) {
    const indent = raw.search(/\S/); // leading-space count for nesting detection
    const ln = raw.trim();
    if (!ln) { closeMode(); continue; }
    if (ln === "---") { closeMode(); out.push("<hr>"); continue; }
    if (ln.startsWith("### ")) { closeMode(); out.push(`<h4 class="md-h4">${fmt(ln.slice(4))}</h4>`); continue; }

    if (ln.startsWith("|")) {
      flushPara();
      if (mode !== "table") { closeMode(); mode = "table"; tableHdr = false; out.push('<div class="table-wrap mini-table"><table><thead>'); }
      const cells = ln.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^[-: ]+$/.test(c))) {
        out.push("</thead><tbody>"); tableHdr = true;
      } else {
        const tag = tableHdr ? "td" : "th";
        out.push(`<tr>${cells.map((c) => `<${tag}>${fmt(c)}</${tag}>`).join("")}</tr>`);
      }
      continue;
    } else if (mode === "table") { closeMode(); }

    if (/^[-*] /.test(ln)) {
      flushPara();
      if (mode === "ol" && indent >= 2) {
        // Indented bullet under a numbered item — keep the ol open, render as sub-item
        out.push(`<li class="sub-li">${fmt(ln.slice(2))}</li>`);
      } else {
        if (mode === "ol") { out.push("</ol>"); mode = ""; }
        if (mode !== "ul") { out.push("<ul>"); mode = "ul"; }
        out.push(`<li>${fmt(ln.slice(2))}</li>`);
      }
      continue;
    }
    if (/^\d+\. /.test(ln)) {
      flushPara();
      if (mode === "ul") { out.push("</ul>"); mode = ""; }
      if (mode !== "ol") { out.push("<ol>"); mode = "ol"; }
      out.push(`<li>${fmt(ln.replace(/^\d+\. /, ""))}</li>`);
      continue;
    }
    if (mode === "ul" || mode === "ol") { closeMode(); }
    para.push(fmt(ln));
  }
  closeMode();
  return out.join("\n");
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function fmtNum(v, d = 3) {
  if (v == null || v === "") return "—";
  return typeof v === "number" ? v.toFixed(d) : v;
}

// adjusted_ir_ci can be {ci_low, ci_high, ...} (new) or [lo, hi] (legacy)
function extractCI(adj) {
  if (!adj) return null;
  if (Array.isArray(adj)) return adj.length === 2 ? adj : null;
  if (typeof adj === "object") {
    const lo = adj.ci_low, hi = adj.ci_high;
    if (lo != null && hi != null) return [lo, hi];
  }
  return null;
}
function fmtCI(adj) {
  const ci = extractCI(adj);
  return ci ? `[${fmtNum(ci[0], 2)}, ${fmtNum(ci[1], 2)}]` : "—";
}
function ciExcludesZero(adj) {
  const ci = extractCI(adj);
  return ci != null && ci[0] > 0;
}

function statGrid(items) {
  return `<div class="stat-grid">${items
    .map(([lbl, val]) => `<div class="stat-cell"><div class="stat-val">${val ?? "—"}</div><div class="stat-key">${lbl}</div></div>`)
    .join("")}</div>`;
}

function miniTable(rows, cols) {
  if (!rows?.length) return `<p class="empty-note">No data.</p>`;
  const head = `<thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`;
  const body = rows
    .map((r) => `<tr>${cols.map((c) => {
      const v = r[c];
      return `<td class="${typeof v === "number" ? "num" : ""}">${typeof v === "number" ? fmtNum(v) : (v ?? "—")}</td>`;
    }).join("")}</tr>`)
    .join("");
  return `<div class="table-wrap mini-table"><table>${head}<tbody>${body}</tbody></table></div>`;
}

// ── Interactive sortable/filterable table ─────────────────────────────────────
const _tblState = {};

function _tblHtml(id) {
  const { rows, cols, sortCol, sortAsc } = _tblState[id];
  const head = `<thead><tr>${cols.map((c) => {
    const arrow = sortCol === c ? (sortAsc ? " ▲" : " ▼") : "";
    return `<th onclick="tblSort('${id}','${c}')">${c}${arrow}</th>`;
  }).join("")}</tr></thead>`;
  const body = rows.map((r) => `<tr>${cols.map((c) => {
    const v = r[c];
    return `<td class="${typeof v === "number" ? "num" : ""}">${typeof v === "number" ? fmtNum(v) : (v ?? "—")}</td>`;
  }).join("")}</tr>`).join("");
  return `<div class="table-wrap mini-table" id="${id}-tbl"><table>${head}<tbody>${body}</tbody></table></div>`;
}

function tblSort(id, col) {
  const s = _tblState[id]; if (!s) return;
  s.sortAsc = s.sortCol === col ? !s.sortAsc : true;
  s.sortCol = col;
  s.rows.sort((a, b) => {
    const av = a[col] ?? "", bv = b[col] ?? "";
    const an = Number(av), bn = Number(bv);
    const num = av !== "" && bv !== "" && !isNaN(an) && !isNaN(bn);
    const cmp = num ? an - bn : String(av).localeCompare(String(bv));
    return s.sortAsc ? cmp : -cmp;
  });
  const el = document.getElementById(`${id}-tbl`);
  if (el) el.outerHTML = _tblHtml(id);
}

function tblFilter(id, q) {
  const s = _tblState[id]; if (!s) return;
  const lq = q.trim().toLowerCase();
  s.rows = lq
    ? s.allRows.filter((r) => s.cols.some((c) => String(r[c] ?? "").toLowerCase().includes(lq)))
    : s.allRows.slice();
  // reset sort on new filter
  s.sortCol = null; s.sortAsc = true;
  const el = document.getElementById(`${id}-tbl`);
  if (el) el.outerHTML = _tblHtml(id);
  const cnt = document.getElementById(`${id}-cnt`);
  if (cnt) cnt.textContent = `${s.rows.length} / ${s.allRows.length}`;
}

function interactiveTable(rows, cols, id) {
  if (!rows?.length) return `<p class="empty-note">No data.</p>`;
  _tblState[id] = { allRows: rows, rows: rows.slice(), cols, sortCol: null, sortAsc: true };
  return `<div class="itbl-wrap">
  <div class="itbl-bar">
    <input class="itbl-filter" placeholder="filter rows…" oninput="tblFilter('${id}',this.value)">
    <span class="itbl-cnt" id="${id}-cnt">${rows.length}</span>
  </div>
  ${_tblHtml(id)}
</div>`;
}

function commentaryBlock(md) {
  if (!md) return "";
  return `<div class="commentary-block">${mdToHtml(md)}</div>`;
}

// ── Return chart with per-run min-max run-spread band ────────────────────────
function buildReturnChart(returns) {
  if (!returns?.dates?.length || !returns.series?.length) return "";
  const { dates, series, note, per_run_labels = [] } = returns;

  const ensLabel = series.find((s) => s.label.startsWith("ensemble_") || s.label === "ensemble")?.label;
  const perRun   = series.filter((s) => per_run_labels.includes(s.label));
  const ens      = series.find((s) => s.label === ensLabel);
  const bench    = series.find((s) => s.label === "benchmark");

  const W = 800, H = 260, P = { t: 18, r: 18, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = dates.length;

  const allV = series.flatMap((s) => s.values);
  const lo = Math.min(...allV), hi = Math.max(...allV), span = hi - lo || 0.01, pad = span * 0.06;
  const x = (i) => P.l + (i / Math.max(n - 1, 1)) * iW;
  const y = (v) => P.t + iH - ((v - lo + pad) / (span + 2 * pad)) * iH;
  const toPath = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = lo - pad + t * (span + 2 * pad);
    const yy = y(v).toFixed(1);
    const pct = Math.round((v - 1) * 100);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${pct >= 0 ? "+" : ""}${pct}%</text>`;
  }).join("");
  const step = Math.max(1, Math.floor(n / 6));
  const xLabels = dates.filter((_, i) => i % step === 0 || i === n - 1).map((d) => {
    const i = dates.indexOf(d);
    return `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  // Shaded band = min-max envelope of per-run series
  let band = "";
  if (perRun.length >= 2) {
    const mins = Array.from({ length: n }, (_, i) => Math.min(...perRun.map((s) => s.values[i])));
    const maxs = Array.from({ length: n }, (_, i) => Math.max(...perRun.map((s) => s.values[i])));
    const fwd = mins.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const rev = [...maxs].reverse().map((v, i) => `L${x(n - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    band = `<path d="${fwd} ${rev} Z" class="ci-band"/>`;
  }

  const RUN_C = [theme.danger, theme.violet, theme.accent2, theme.success];
  const runPaths = perRun.map((s, i) =>
    `<path d="${toPath(s.values)}" stroke="${RUN_C[i % RUN_C.length]}" stroke-width="1" stroke-opacity="0.45" stroke-dasharray="3 3" fill="none"/>`
  ).join("");
  const ensPath   = ens   ? `<path d="${toPath(ens.values)}"   stroke="${theme.accentStrong}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` : "";
  const benchPath = bench ? `<path d="${toPath(bench.values)}" stroke="${theme.muted}" stroke-width="1.5" stroke-dasharray="5 3" fill="none"/>` : "";

  const lgd = [
    perRun.length >= 2 ? `<span class="lgd-band"></span><span>run spread</span>` : "",
    perRun.length      ? `<span class="lgd-run"></span><span>per-run</span>` : "",
    ens                ? `<span class="lgd-ens"></span><span>ensemble</span>` : "",
    bench              ? `<span class="lgd-bench"></span><span>benchmark</span>` : "",
  ].filter(Boolean).join('<span class="lgd-sep"> · </span>');

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${grid}${band}${runPaths}${ensPath}${benchPath}${xLabels}
</svg>
<div class="chart-legend">${lgd}</div>
${note ? `<p class="chart-note">${note}</p>` : ""}
</figure>`;
}

// ── Bucket cumulative returns: top / mid / bottom score tertiles, each w/ band ─
function buildBucketChart(data) {
  if (!data || data.error) return `<p class="empty-note">${data?.error || "No bucket data."}</p>`;
  const { dates, buckets, note } = data;
  if (!dates?.length || !buckets?.length) return '<p class="empty-note">No bucket data.</p>';

  const BUCKET_COLOR = {
    positive: theme.success,
    neutral: theme.muted,
    negative: theme.danger,
  };
  const BUCKET_FILL = {
    positive: "rgba(104, 255, 154, 0.13)",
    neutral: "rgba(139, 149, 168, 0.10)",
    negative: "rgba(255, 77, 31, 0.13)",
  };

  const W = 800, H = 280, P = { t: 18, r: 18, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = dates.length;
  const allV = buckets.flatMap((b) => b.ensemble.concat(b.mins, b.maxs));
  const lo = Math.min(...allV), hi = Math.max(...allV), span = hi - lo || 0.01, pad = span * 0.06;
  const x = (i) => P.l + (i / Math.max(n - 1, 1)) * iW;
  const y = (v) => P.t + iH - ((v - lo + pad) / (span + 2 * pad)) * iH;
  const toPath = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = lo - pad + t * (span + 2 * pad);
    const yy = y(v).toFixed(1);
    const pct = Math.round((v - 1) * 100);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${pct >= 0 ? "+" : ""}${pct}%</text>`;
  }).join("");
  const step = Math.max(1, Math.floor(n / 6));
  const xLabels = dates.filter((_, i) => i % step === 0 || i === n - 1).map((d) => {
    const i = dates.indexOf(d);
    return `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  const layers = buckets.map((b) => {
    const mins = b.mins, maxs = b.maxs;
    const fwd = mins.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const rev = [...maxs].reverse().map((v, i) => `L${x(n - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const band = `<path d="${fwd} ${rev} Z" fill="${BUCKET_FILL[b.name]}" stroke="none"/>`;
    const line = `<path d="${toPath(b.ensemble)}" stroke="${BUCKET_COLOR[b.name]}" stroke-width="2.25" fill="none" stroke-linecap="round"/>`;
    return band + line;
  }).join("");

  const lgd = buckets.map((b) =>
    `<span class="lgd-bucket" style="background:${BUCKET_FILL[b.name]};border-color:${BUCKET_COLOR[b.name]}"></span><span style="color:${BUCKET_COLOR[b.name]}">${b.name}</span>`
  ).join('<span class="lgd-sep"> · </span>') +
    '<span class="lgd-sep"> · </span><span class="lgd-bucket-band"></span><span>run spread</span>';

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${grid}${layers}${xLabels}
</svg>
<div class="chart-legend">${lgd}</div>
${note ? `<p class="chart-note">${note}</p>` : ""}
</figure>`;
}

// ── Tilt vs timing: AP decomposition time series (Lo 2008 / Grinblatt-Titman) ─
// active return_t = tilt_t + timing_t, cumulated over periods.
//   tilt   = Σ w̄_i·r_it      (return from holding each ticker's time-avg active weight)
//   timing = Σ (w_it − w̄_i)·r_it  (return from time-varying the weight)
// Lines = ensemble (mean across K runs) cumulative contribution; shaded bands =
// min–max across runs. total_active = tilt + timing (identity check, dashed).
function buildTimingTiltChart(data) {
  if (!data || data.error) return `<p class="empty-note">${data?.error || "No timing data."}</p>`;
  const { decomp = [], decomp_dates = [], per_period = [], tilt_ic, timing_ic, final = {}, tilt_share, note } = data;
  if (!decomp_dates.length || !decomp.length)
    return '<p class="empty-note">No decomposition data.</p>';

  const byName = Object.fromEntries(decomp.map((d) => [d.name, d]));
  const tilt = byName.tilt, timing = byName.timing, total = byName.total_active;
  if (!tilt || !timing || !total) return '<p class="empty-note">Decomposition incomplete.</p>';

  const W = 800, H = 300, P = { t: 22, r: 18, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = decomp_dates.length;
  const allV = decomp.flatMap((d) => d.ensemble.concat(d.mins, d.maxs));
  const lo = Math.min(...allV, 0), hi = Math.max(...allV), span = (hi - lo) || 0.01, pad = span * 0.08;
  const x = (i) => P.l + (i / Math.max(n - 1, 1)) * iW;
  const y = (v) => P.t + iH - ((v - lo + pad) / (span + 2 * pad)) * iH;
  const toPath = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const band = (d, fill) => {
    const fwd = d.mins.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const rev = [...d.maxs].reverse().map((v, i) => `L${x(n - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return `<path d="${fwd} ${rev} Z" fill="${fill}" stroke="none"/>`;
  };

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = lo - pad + t * (span + 2 * pad);
    const yy = y(v).toFixed(1);
    const pct = (v * 100).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${pct >= 0 ? "+" : ""}${pct}%</text>`;
  }).join("");
  const zeroY = (lo < 0 && hi > 0) ? `<line x1="${P.l}" y1="${y(0).toFixed(1)}" x2="${W - P.r}" y2="${y(0).toFixed(1)}" stroke="${theme.muted}" stroke-width="1" stroke-dasharray="4 4"/>` : "";
  const step = Math.max(1, Math.floor(n / 6));
  const xLabels = decomp_dates.filter((_, i) => i % step === 0 || i === n - 1).map((d) => {
    const i = decomp_dates.indexOf(d);
    return `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  const C = { tilt: theme.accentStrong, timing: theme.accent2, total_active: theme.muted };
  const F = { tilt: "rgba(255, 176, 0, 0.12)", timing: "rgba(0, 217, 255, 0.12)" };
  const bandEl = band(tilt, F.tilt) + band(timing, F.timing);
  const tiltLine   = `<path d="${toPath(tilt.ensemble)}" stroke="${C.tilt}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const timLine    = `<path d="${toPath(timing.ensemble)}" stroke="${C.timing}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const totalLine  = `<path d="${toPath(total.ensemble)}" stroke="${C.total_active}" stroke-width="1.8" stroke-dasharray="5 4" fill="none"/>`;

  const lgd = [
    `<span class="lgd-tilt"></span><span>tilt (static)</span>`,
    `<span class="lgd-timing"></span><span>timing (dynamic)</span>`,
    `<span class="lgd-total"></span><span>total active = tilt + timing</span>`,
  ].join('<span class="lgd-sep"> · </span>');

  // stat row
  const f = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
  const shareTxt = tilt_share == null ? "" : ` · tilt share ${f(tilt_share)}`;
  const stats = `<div class="chart-legend tt-stats">
    <span>cum tilt <b style="color:${C.tilt}">${f(final.tilt)}</b></span><span class="lgd-sep"> · </span>
    <span>cum timing <b style="color:${C.timing}">${f(final.timing)}</b></span><span class="lgd-sep"> · </span>
    <span>cum active <b>${f(final.total_active)}</b></span><span class="lgd-sep"> · </span>
    <span>tilt IC ${tilt_ic?.pooled == null ? "—" : tilt_ic.pooled.toFixed(2)}</span><span class="lgd-sep"> · </span>
    <span>timing IC ${timing_ic?.pooled == null ? "—" : timing_ic.pooled.toFixed(2)}</span>
    <span class="lgd-sep"> · </span><span>${shareTxt.slice(3) || ""}</span>
  </div>`;

  // per-period contribution bars (tilt vs timing), centered on 0
  const bars = buildTiltTimingBars(per_period, decomp_dates, { tilt: C.tilt, timing: C.timing });

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${grid}${zeroY}${bandEl}${totalLine}${tiltLine}${timLine}${xLabels}
</svg>
<div class="chart-legend">${lgd}</div>
${stats}
${bars}
${note ? `<p class="chart-note">${note}</p>` : ""}
<p class="chart-footnote">Cumulative contribution of the static <b>tilt</b> (holding each ticker's time-average active weight) vs the dynamic <b>timing</b> (profit from varying the weight over time). Identity: tilt + timing = total active return each period (dashed line = the sum, a consistency check). Bands = run spread. <b>tilt share</b> = cum tilt ÷ cum active. A tilt-driven agent picks the right names; a timing-driven agent rotates them well.</p>
</figure>`;
}

function buildTiltTimingBars(per_period, dates, C) {
  const rows = per_period.filter((r) => r.tilt != null && r.timing != null);
  if (!rows.length) return "";
  const W = 800, H = 150, P = { t: 12, r: 18, b: 30, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = rows.length;
  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.tilt), Math.abs(r.timing)]), 0.001);
  const zeroY = P.t + iH / 2;
  const slot = iW / n, bw = Math.max(3, slot * 0.32);
  const bx = (i) => P.l + slot * i + slot / 2;
  const yv = (v) => P.t + iH - ((v + maxAbs) / (2 * maxAbs)) * iH;

  const grid = [-1, -0.5, 0.5, 1].map((t) => {
    const v = t * maxAbs, yy = yv(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${(v * 100).toFixed(1)}%</text>`;
  }).join("");
  const zeroLine = `<line x1="${P.l}" y1="${zeroY.toFixed(1)}" x2="${W - P.r}" y2="${zeroY.toFixed(1)}" stroke="${theme.muted}" stroke-width="1"/>`;

  const bars = rows.map((r, i) => {
    const draw = (v, color, dx) => {
      const top = v >= 0 ? yv(v) : zeroY;
      const h = Math.max(1, Math.abs(yv(v) - zeroY));
      return `<rect x="${(bx(i) + dx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" fill-opacity="0.7"/>`;
    };
    return draw(r.tilt, C.tilt, -bw * 0.55) + draw(r.timing, C.timing, bw * 0.55);
  }).join("");

  const step = Math.max(1, Math.floor(n / 7));
  const xLabels = rows.filter((_, i) => i % step === 0 || i === n - 1).map((r) => {
    const i = rows.indexOf(r);
    return `<text x="${bx(i).toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">${r.date.slice(0, 7)}</text>`;
  }).join("");

  return `<div class="tt-bars-wrap">
  <p class="tt-bars-label">Per-period contribution: tilt (orange) vs timing (cyan)</p>
  <svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
    ${grid}${zeroLine}${bars}${xLabels}
  </svg>
</div>`;
}

// ── Variance chart: score_std + sign_agreement by period ─────────────────────
function buildVarianceChart(perCell) {
  if (!perCell?.length) return "";
  const byDate = {};
  for (const r of perCell) {
    const d = (r.date || "").slice(0, 10);
    if (!d) continue;
    (byDate[d] = byDate[d] || { stds: [], signs: [] });
    if (r.score_std    != null) byDate[d].stds.push(r.score_std);
    if (r.sign_agreement != null) byDate[d].signs.push(r.sign_agreement);
  }
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return "";
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const aggStd  = dates.map((d) => avg(byDate[d].stds));
  const aggSign = dates.map((d) => avg(byDate[d].signs));

  const W = 800, H = 200, P = { t: 14, r: 54, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = dates.length;
  const maxStd = Math.max(...aggStd, 0.01);
  const slot = iW / n, bw = Math.max(4, slot * 0.55);
  const bx  = (i) => P.l + slot * i + slot / 2;
  const stdY  = (v) => P.t + iH - (v / maxStd) * iH;
  const signY = (v) => P.t + iH - v * iH;

  const grid = [0, 0.5, 1].map((t) => {
    const v = t * maxStd, yy = stdY(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${v.toFixed(2)}</text>`;
  }).join("");
  const rightAxis = [0, 0.5, 1].map((v) =>
    `<text x="${W - P.r + 6}" y="${signY(v).toFixed(1)}" class="axis-label" fill="${theme.accent2}" dominant-baseline="middle">${Math.round(v * 100)}%</text>`
  ).join("");

  const bars = dates.map((_, i) => {
    const bh = Math.max(2, (aggStd[i] / maxStd) * iH);
    return `<rect x="${(bx(i) - bw / 2).toFixed(1)}" y="${(P.t + iH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" class="var-bar"/>`;
  }).join("");
  const signPath = aggSign.map((v, i) => `${i ? "L" : "M"}${bx(i).toFixed(1)},${signY(v).toFixed(1)}`).join(" ");
  const signEl = `<path d="${signPath}" stroke="${theme.accent2}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  ${aggSign.map((v, i) => `<circle cx="${bx(i).toFixed(1)}" cy="${signY(v).toFixed(1)}" r="3" fill="${theme.accent2}"/>`).join("")}`;

  const step = Math.max(1, Math.floor(n / 7));
  const xLabels = dates.filter((_, i) => i % step === 0 || i === n - 1).map((d) => {
    const i = dates.indexOf(d);
    return `<text x="${bx(i).toFixed(1)}" y="${H - 5}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${grid}${bars}${signEl}${rightAxis}${xLabels}
</svg>
<div class="chart-legend">
  <span class="lgd-varbar"></span><span>score std · left axis</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-sign"></span><span>sign agreement · right axis</span>
</div>
</figure>`;
}

// ── Expanding-window ICIR by period (stability diagnostic) ───────────────────
// Plots cumulative_icir vs date, one line per horizon. A line that decays from
// a high early value toward a modest one = small-sample inflation; a line that
// converges or grows = a persistent edge. This is the intuitive visual for the
// "is the headline ICIR real or inflated by T" question.
const WF_HORIZON_COLORS = { 1: theme.accentStrong, 2: theme.accent2, 3: theme.violet, 4: theme.accent || "#c4a35a" };

function buildCumulativeIcirChart(wf) {
  if (!wf) return "";
  const horizons = Object.keys(wf).map(Number).sort((a, b) => a - b);
  if (!horizons.length) return "";
  const series = horizons.map((h) => {
    const rows = (wf[String(h)]?.per_window || []).filter((r) => r.cumulative_icir != null);
    return { h, rows, summary: wf[String(h)]?.summary || {} };
  }).filter((s) => s.rows.length);
  if (!series.length) return "";

  // Union x-axis of dates across horizons (sorted).
  const dateSet = new Set();
  series.forEach((s) => s.rows.forEach((r) => dateSet.add((r.date || "").slice(0, 10))));
  const dates = [...dateSet].sort();
  const n = dates.length;
  const idx = (d) => dates.indexOf(d);

  const allV = series.flatMap((s) => s.rows.map((r) => r.cumulative_icir));
  const lo = Math.min(0, ...allV), hi = Math.max(0, ...allV), span = hi - lo || 1, pad = span * 0.08;

  const W = 800, H = 220, P = { t: 16, r: 54, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const x = (i) => P.l + (i / Math.max(n - 1, 1)) * iW;
  const y = (v) => P.t + iH - ((v - lo + pad) / (span + 2 * pad)) * iH;
  const yZero = y(0).toFixed(1);

  // Positive zone: faint green shade above the zero line — "positive" reads
  // at a glance as "line in the green band."
  const posZone = hi > 0
    ? `<rect x="${P.l}" y="${y(hi).toFixed(1)}" width="${iW}" height="${(y(0) - y(hi)).toFixed(1)}" fill="${theme.success}" opacity="0.06"/>`
    : "";

  const grid = [0, 0.5, 1].map((t) => {
    const v = lo - pad + t * (span + 2 * pad);
    const yy = y(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${fmtNum(v, 2)}</text>`;
  }).join("");
  const zero = `<line x1="${P.l}" y1="${yZero}" x2="${W - P.r}" y2="${yZero}" stroke="${theme.muted}" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>
    <text x="${P.l - 5}" y="${yZero}" class="axis-label" text-anchor="end" dominant-baseline="middle" fill="${theme.muted}">0</text>`;

  const step = Math.max(1, Math.floor(n / 7));
  const xLabels = dates.filter((_, i) => i % step === 0 || i === n - 1).map((d) => {
    const i = idx(d);
    return `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  const paths = series.map((s) => {
    const c = WF_HORIZON_COLORS[s.h] || theme.muted;
    const pts = s.rows.map((r, k) => {
      const i = idx((r.date || "").slice(0, 10));
      const v = r.cumulative_icir;
      return `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    }).join(" ");
    const dots = s.rows.map((r) => `<circle cx="${x(idx((r.date || "").slice(0, 10))).toFixed(1)}" cy="${y(r.cumulative_icir).toFixed(1)}" r="2.5" fill="${c}"/>`).join("");
    // Endpoint marker + final-ICIR label so the converged value is readable.
    const last = s.rows[s.rows.length - 1];
    const lx = x(idx((last.date || "").slice(0, 10))).toFixed(1);
    const ly = y(last.cumulative_icir).toFixed(1);
    const label = `<circle cx="${lx}" cy="${ly}" r="3.5" fill="${c}" stroke="var(--bg,#0d1117)" stroke-width="1"/>
      <text x="${(parseFloat(lx) + 6).toFixed(1)}" y="${(parseFloat(ly) - 6).toFixed(1)}" class="axis-label" fill="${c}" font-weight="600">${fmtNum(last.cumulative_icir, 2)}</text>`;
    return `<path d="${pts}" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>${dots}${label}`;
  }).join("");

  const lgd = series.map((s) =>
    `<span class="lgd-ens" style="background:${WF_HORIZON_COLORS[s.h] || theme.muted}"></span><span>h=${s.h}</span>`
  ).join('<span class="lgd-sep"> · </span>');

  // Per-horizon metric strip: first→last cumulative ICIR and the std of the
  // cumulative series across the expanding window. Objective quantities only —
  // no verdict tag, so the reader judges stability from the numbers + line.
  const strip = series.map((s) => {
    const sm = s.summary;
    const first = sm.first_cumulative_icir, last = sm.last_cumulative_icir, std = sm.cumulative_icir_std;
    return `<span class="wf-chip">
      <span class="wf-chip-h" style="color:${WF_HORIZON_COLORS[s.h] || theme.muted}">h=${s.h}</span>
      <span class="wf-chip-v">${first != null ? fmtNum(first, 2) : "—"} → ${last != null ? fmtNum(last, 2) : "—"}</span>
      <span class="wf-chip-s">σ ${std != null ? fmtNum(std, 2) : "—"}</span>
    </span>`;
  }).join("");

  return `<figure class="chart-figure">
<div class="wf-strip">${strip}</div>
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${posZone}${grid}${zero}${paths}${xLabels}
</svg>
<div class="chart-legend">${lgd}</div>
</figure>`;
}

// ── Per-period IC bars (the dispersion behind the ICIR) ──────────────────────
// Bars = each period's own rank-IC per horizon, around a zero line. Uses the
// FULL per-period IC series (every scored date with a realisable forward
// return), so it spans the whole sample — including the first periods that
// the walk-forward windows fold into their initial cumulative. Shows how few
// periods drive the ICIR and how dispersed they are.
function buildPerPeriodIcChart(wf) {
  if (!wf) return "";
  const horizons = Object.keys(wf).map(Number).sort((a, b) => a - b);
  if (!horizons.length) return "";
  const series = horizons.map((h) => {
    const rows = (wf[String(h)]?.per_period_ic || []).filter((r) => r.ic != null);
    return { h, rows };
  }).filter((s) => s.rows.length);
  if (!series.length) return "";

  const dateSet = new Set();
  series.forEach((s) => s.rows.forEach((r) => dateSet.add((r.date || "").slice(0, 10))));
  const dates = [...dateSet].sort();
  const nDates = dates.length;
  const nH = series.length;

  const allV = series.flatMap((s) => s.rows.map((r) => r.ic));
  const hi = Math.max(0.1, ...allV.map(Math.abs));
  const lo = -hi;

  const W = 800, H = 200, P = { t: 14, r: 18, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const slot = iW / nDates, groupW = slot * 0.78, bw = groupW / nH;
  const cx = (i) => P.l + slot * i + slot / 2;
  const y = (v) => P.t + iH / 2 - (v / hi) * (iH / 2);
  const yZero = y(0).toFixed(1);

  const grid = [-1, -0.5, 0, 0.5, 1].map((t) => {
    const v = t * hi, yy = y(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${v.toFixed(2)}</text>`;
  }).join("");
  const zero = `<line x1="${P.l}" y1="${yZero}" x2="${W - P.r}" y2="${yZero}" stroke="${theme.muted}" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>`;

  const bars = series.map((s, hi2) => {
    const c = WF_HORIZON_COLORS[s.h] || theme.muted;
    return s.rows.map((r) => {
      const i = dates.indexOf((r.date || "").slice(0, 10));
      if (i < 0) return "";
      const v = r.ic;
      const bx = cx(i) - groupW / 2 + hi2 * bw + bw / 2;
      const top = y(Math.max(v, 0)), bot = y(Math.min(v, 0));
      const h = Math.max(2, Math.abs(bot - top));
      return `<rect x="${(bx - bw / 2).toFixed(1)}" y="${Math.min(top, bot).toFixed(1)}" width="${(bw * 0.8).toFixed(1)}" height="${h.toFixed(1)}" fill="${c}" opacity="${v < 0 ? 0.45 : 0.85}" rx="1"/>`;
    }).join("");
  }).join("");

  const step = Math.max(1, Math.floor(nDates / 7));
  const xLabels = dates.filter((_, i) => i % step === 0 || i === nDates - 1).map((d) => {
    const i = dates.indexOf(d);
    return `<text x="${cx(i).toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  const lgd = series.map((s) =>
    `<span class="lgd-ens" style="background:${WF_HORIZON_COLORS[s.h] || theme.muted}"></span><span>h=${s.h} IC</span>`
  ).join('<span class="lgd-sep"> · </span>');

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${grid}${zero}${bars}${xLabels}
</svg>
<div class="chart-legend">${lgd}</div>
</figure>`;
}

// ── Decision score timeseries chart (per-run, ticker picker, dual axis) ───────
const RUN_COLORS = () => [theme.accentStrong, theme.accent2, theme.violet, theme.danger, theme.success];
let _scoreChartState = null;

function _shortRunLabel(rid) {
  const m = rid.match(/_r(\d+)(?:#\d+)?$/);
  return m ? `r${m[1]}` : rid;
}

function _scoreChartTickers(perRunScores) {
  const runIds = Object.keys(perRunScores);
  return [...new Set(runIds.flatMap((r) => Object.keys(perRunScores[r])))].sort();
}

function _defaultScoreTicker(perRunScores) {
  const tickers = _scoreChartTickers(perRunScores);
  if (tickers.length <= 1) return tickers[0] || "";
  const runIds = Object.keys(perRunScores);
  const variance = (ticker) => {
    const scores = runIds.flatMap((r) => (perRunScores[r][ticker] || []).map((d) => d.score));
    if (scores.length < 2) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  };
  return tickers.sort((a, b) => variance(b) - variance(a))[0];
}

function _scoreChartSvg(perRunScores, ticker) {
  const runIds = Object.keys(perRunScores);
  const dateSet = new Set(runIds.flatMap((r) => (perRunScores[r][ticker] || []).map((d) => d.date)));
  const dates = [...dateSet].sort();
  if (!dates.length) return "";

  const n = dates.length;
  const colors = RUN_COLORS();
  const runSeries = runIds.map((rid, ri) => {
    const byDate = Object.fromEntries((perRunScores[rid][ticker] || []).map((d) => [d.date, d]));
    return {
      label: _shortRunLabel(rid),
      color: colors[ri % colors.length],
      scores: dates.map((d) => byDate[d]?.score ?? null),
      convictions: dates.map((d) => byDate[d]?.conviction ?? null),
    };
  });

  const W = 800, H = 280, P = { t: 22, r: 54, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const slot = iW / n;
  const k = runSeries.length;
  const barW = Math.max(3, (slot * 0.72) / Math.max(k, 1));

  const allScores = runSeries.flatMap((s) => s.scores.filter((v) => v !== null));
  const lo = Math.min(...allScores, 0), hi = Math.max(...allScores, 0);
  const span = hi - lo || 0.2, pad = span * 0.12;
  const yLo = lo - pad, yHi = hi + pad;

  const bx = (i) => P.l + slot * i + slot / 2;
  const scoreY = (v) => P.t + iH - ((v - yLo) / (yHi - yLo)) * iH;
  const convY = (v) => P.t + iH - Math.max(0, Math.min(1, v)) * iH;

  const zeroY = scoreY(0).toFixed(1);
  const grid = [
    `<line x1="${P.l}" y1="${zeroY}" x2="${W - P.r}" y2="${zeroY}" stroke="${theme.muted}" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"/>`,
    `<text x="${P.l - 5}" y="${zeroY}" class="axis-label" text-anchor="end" dominant-baseline="middle">0</text>`,
    `<text x="${P.l - 5}" y="${(P.t + 4).toFixed(1)}" class="axis-label" text-anchor="end" font-size="9" fill="${theme.muted}">score</text>`,
  ];
  [lo, hi].forEach((v) => {
    if (Math.abs(v) < 0.01) return;
    const yy = scoreY(v).toFixed(1);
    grid.push(`<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>`);
    grid.push(`<text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${v.toFixed(2)}</text>`);
  });

  const rightAxis = [0, 0.5, 1].map((v) =>
    `<text x="${W - P.r + 6}" y="${convY(v).toFixed(1)}" class="axis-label" fill="${theme.muted}" dominant-baseline="middle">${Math.round(v * 100)}%</text>`
  ).join("");
  grid.push(`<text x="${W - P.r + 6}" y="${(P.t + 4).toFixed(1)}" class="axis-label" font-size="9" fill="${theme.muted}">conv</text>`);

  const step = Math.max(1, Math.floor(n / 7));
  const xLabels = dates
    .filter((_, i) => i % step === 0 || i === n - 1)
    .map((d) => {
      const i = dates.indexOf(d);
      return `<text x="${bx(i).toFixed(1)}" y="${H - 5}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
    })
    .join("");

  // Conviction bars — grouped per date, color-matched to run
  const convBars = runSeries.flatMap(({ color, convictions }, ri) =>
    convictions.map((conv, i) => {
      if (conv == null) return "";
      const bh = Math.max(2, (conv) * iH);
      const cx = bx(i) - (k * barW) / 2 + ri * barW + barW / 2;
      return `<rect x="${(cx - barW / 2).toFixed(1)}" y="${(P.t + iH - bh).toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" opacity="0.55" rx="1"/>`;
    })
  ).join("");

  // Score lines + dots (left axis)
  const scoreElems = runSeries.map(({ color, scores }) => {
    const segments = [];
    let seg = [];
    scores.forEach((v, i) => {
      if (v !== null) {
        seg.push(`${seg.length ? "L" : "M"}${bx(i).toFixed(1)},${scoreY(v).toFixed(1)}`);
      } else if (seg.length) {
        segments.push(seg.join(" "));
        seg = [];
      }
    });
    if (seg.length) segments.push(seg.join(" "));
    const paths = segments.map((d) =>
      `<path d="${d}" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    ).join("");
    const dots = scores.map((v, i) =>
      v !== null ? `<circle cx="${bx(i).toFixed(1)}" cy="${scoreY(v).toFixed(1)}" r="4" fill="${color}" stroke="var(--bg)" stroke-width="1.5"/>` : ""
    ).join("");
    return paths + dots;
  }).join("");

  const lgd = runSeries.map(({ label, color }) =>
    `<span style="display:inline-block;width:12px;height:3px;background:${color};margin-right:4px;vertical-align:middle;border-radius:2px"></span><span>${label}</span>`
  ).join('<span class="lgd-sep"> · </span>');

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${grid.join("")}${convBars}${scoreElems}${rightAxis}${xLabels}
</svg>
<div class="chart-legend">
  ${lgd}
  <span class="lgd-sep"> · </span>
  <span class="lgd-line"></span><span>score · left</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-bar"></span><span>conviction · right</span>
</div>
<p class="chart-footnote">One line per run (score, left axis). Grouped bars = conviction per run, color-matched (right axis, 0–100%).</p>
</figure>`;
}

function scoreChartPick(ticker) {
  if (!_scoreChartState?.perRunScores) return;
  const plot = document.getElementById("scoreChartPlot");
  const label = document.getElementById("scoreChartTickerLabel");
  if (!plot) return;
  plot.innerHTML = _scoreChartSvg(_scoreChartState.perRunScores, ticker) || '<p class="empty-note">No data for this symbol.</p>';
  if (label) label.textContent = ticker;
}

function buildScoreTimeseriesChart(output) {
  const perRunScores = output?.per_run_scores;
  if (!perRunScores || !Object.keys(perRunScores).length) return "";

  const tickers = _scoreChartTickers(perRunScores);
  if (!tickers.length) return "";

  const defaultTicker = _defaultScoreTicker(perRunScores);
  _scoreChartState = { perRunScores, defaultTicker };

  const opts = tickers.map((t) =>
    `<option value="${t}"${t === defaultTicker ? " selected" : ""}>${t}</option>`
  ).join("");

  const initial = _scoreChartSvg(perRunScores, defaultTicker);

  return `<div class="score-chart-wrap">
  <div class="chart-toolbar">
    <span class="chart-toolbar-label">Showing</span>
    <strong id="scoreChartTickerLabel">${defaultTicker}</strong>
    ${tickers.length > 1 ? `<label class="chart-toolbar-pick">Change
      <select id="scoreChartTicker" onchange="scoreChartPick(this.value)">${opts}</select>
    </label>` : ""}
  </div>
  <div id="scoreChartPlot">${initial}</div>
</div>`;
}


function profileId(r) {
  return r.profile?.id || (r.ir?.transform === "single_name" ? "single_active" : "portfolio_rank");
}
function isSingleActive(r) {
  return profileId(r) === "single_active";
}
// "IR" for single_active (active-return Sharpe), "RankICIR" for the multi-name
// rank case. Mirrors the report_methodology.md RankICIR-vs-portfolio-IR split.
function metricLabel(r) {
  return isSingleActive(r) ? "IR" : "RankICIR";
}

// ── Section renderers ─────────────────────────────────────────────────────────

function renderHeader(r) {
  const k  = r.behaviour?.summary?.k ?? (r.run_ids || []).length;
  const t  = Object.values(r.ir?.by_horizon || {})[0]?.n_periods ?? "?";
  const runs = (r.run_ids || []).join(", ") || "—";
  const cadence = r.ir?.cadence ? ` · ${r.ir.cadence}` : "";
  const prof = r.profile?.display_name || profileId(r);
  return `<div class="report-header">
  <h1 class="report-title">${r.batch_name || runs}</h1>
  <p class="report-meta">Profile: ${prof} · K=${k} runs · T=${t} periods${cadence} · ${runs}</p>
</div>`;
}

function renderSummary(r, sections) {
  const ir = r.ir || {};
  const single = isSingleActive(r);
  const horizons = Object.keys(ir.by_horizon || {}).map(Number).sort((a, b) => a - b);
  const cadenceLabel = ir.cadence ? ir.cadence.replace(/ly$/, "") : null;

  const irCards = horizons.map((h) => {
    const bh = ir.by_horizon[h] || {};
    const nw = bh.mean_ic_nw || {};
    const t = nw.t;
    const ok = !single && t != null && Math.abs(t) >= 1.96;
    const hLabel = cadenceLabel ? `${h} ${cadenceLabel}${h > 1 ? "s" : ""} forward` : `horizon ${h}`;
    const metric = metricLabel(r);
    const tStr = t != null ? `${fmtNum(t, 2)}${Math.abs(t) >= 3 ? " ★" : Math.abs(t) >= 1.96 ? " ✓" : ""}` : "—";
    if (single) {
      const ptOk = bh.ensemble_pt_pvalue != null && bh.ensemble_pt_pvalue < 0.05;
      const ptLabel = bh.ensemble_pt_pvalue != null
        ? `p=${fmtNum(bh.ensemble_pt_pvalue, 3)}${ptOk ? " ✓" : ""}`
        : "—";
      return `<div class="ir-card${ok ? " ir-card-ok" : ""}">
  <div class="ir-card-label">Signal ${metric} · ${hLabel} · T=${bh.n_periods ?? "?"}${ok ? " ✓" : ""}</div>
  <div class="ir-card-val">${fmtNum(bh.ensemble_icir, 2)}</div>
  <div class="ir-card-ci"><span class="ir-ci-label">NW t</span> ${tStr} · <span class="ir-ci-label">hit rate</span> ${fmtPct(bh.ensemble_hit_rate)} · <span class="ir-ci-label">PT</span> ${ptLabel}</div>
</div>`;
    }
    return `<div class="ir-card${ok ? " ir-card-ok" : ""}">
  <div class="ir-card-label">Adj. ${metric} · ${hLabel} · T=${bh.n_periods ?? "?"}${ok ? " ✓" : ""}</div>
  <div class="ir-card-val">${fmtNum(bh.ensemble_icir, 2)}</div>
  <div class="ir-card-ci"><span class="ir-ci-label">NW t (mean IC)</span> ${tStr} · <span class="ir-ci-label">lag</span> ${nw.lag ?? "—"}</div>
</div>`;
  }).join("");

  const rChart = buildReturnChart(ir.returns);
  const vChart = buildVarianceChart(r.output?.per_cell);
  const sChart = buildScoreTimeseriesChart(r.output);
  const wfChart = buildCumulativeIcirChart(ir.walk_forward);
  const icChart = buildPerPeriodIcChart(ir.walk_forward);
  const summaryCommentary = getSection(sections || {}, "summary");
  const returnTitle = single
    ? "Cumulative returns — OW/UW strategy vs neutral"
    : "Cumulative returns — active weight vs benchmark";
  const returnFoot = single
    ? "Strategy = neutral buy-hold + active_budget × score × return (active_budget is chart-only scaling; IR is scale-invariant). Ensemble = mean signal across K runs. Spread = agent stochasticity."
    : "Active-weight: each run scores stocks OW/UW vs equal-weight by rank signal. Ensemble = mean signal across K runs. Shaded band = range of K individual return paths. Benchmark = equal-weight.";
  const varTitle = single
    ? "Score disagreement by decision period"
    : "Output variance by decision period";

  return `<section class="report-section">
  <h2 class="section-title">Summary</h2>
  <div class="ir-cards">${irCards}</div>
  <div class="charts-col">
    <div class="chart-block">
      <h3 class="chart-title">${returnTitle}</h3>
      ${rChart || '<p class="empty-note">Returns not available.</p>'}
      <p class="chart-footnote">${returnFoot}</p>
    </div>
    <div class="chart-block">
      <h3 class="chart-title">Cumulative returns by score bucket — positive / neutral / negative</h3>
      <div id="bucketChart"><p class="empty-note">Loading bucket analysis…</p></div>
      <p class="chart-footnote">Each period names are grouped by the <em>sign</em> of the agent's score. Lines = ensemble (mean across K runs) equal-weight forward return per bucket; shaded band = min–max across runs for that bucket. Positive &gt; negative over time = the agent's long/short sign calls add value; neutral ≈ benchmark drift.</p>
    </div>
    <div class="chart-block">
      <h3 class="chart-title">Tilt vs timing — active return decomposition (AP / Grinblatt-Titman)</h3>
      <div id="timingTiltChart"><p class="empty-note">Loading timing analysis…</p></div>
    </div>
    <div class="chart-block">
      <h3 class="chart-title">Expanding-window ICIR — does the estimate stabilize?</h3>
      ${wfChart || '<p class="empty-note">Walk-forward data not available.</p>'}
      <p class="chart-footnote">Each point = cumulative ICIR using all scored periods up to that date (annualised). Strip shows <em>first → last</em> cumulative ICIR and <em>σ</em> (std of the cumulative series across the expanding window). Green band = above-zero (positive) region; dashed line = zero. Lower σ = the estimate is less sensitive to which periods are included; a flat/rising line = the edge accumulates; a falling line = early periods contributed more than later ones. With T=5–9 these are descriptive, not a significance test.</p>
    </div>
    <div class="chart-block">
      <h3 class="chart-title">Per-period rank-IC — what's behind the ICIR</h3>
      ${icChart || '<p class="empty-note">Walk-forward data not available.</p>'}
      <p class="chart-footnote">Bars = each period's own cross-sectional rank-IC (Spearman, score vs forward return) per horizon, around zero. ICIR = mean/std of these. A single tall bar propping up an otherwise flat/negative series = the ICIR is fragile and period-specific. Wide dispersion → noisier mean → less reliable ICIR.</p>
    </div>
    <div class="chart-block">
      <h3 class="chart-title">${varTitle}</h3>
      ${vChart || '<p class="empty-note">Output data not available.</p>'}
      <p class="chart-footnote">Bars = mean score std across K runs per period (higher = more agent disagreement). Line = mean sign agreement (% of cells all K runs agreed on direction).</p>
    </div>
    <div class="chart-block">
      <h3 class="chart-title">Decision score &amp; conviction by run</h3>
      ${sChart || '<p class="empty-note">Per-run scores not available.</p>'}
    </div>
  </div>
  ${summaryCommentary ? `<h3 class="sub-heading">Commentary</h3>${commentaryBlock(summaryCommentary)}` : ""}
</section>`;
}

function fmtPct(x) {
  if (x == null || Number.isNaN(Number(x))) return "—";
  return `${(Number(x) * 100).toFixed(1)}%`;
}

function renderGate(r, sections) {
  const w = r.world || {};
  const commentary = getSection(sections, "gate", "world");
  const mismatched = w.n_mismatched ?? 0;
  const pass = (w.answer_agreement ?? 0) >= 0.99 && mismatched === 0;
  const stats = [
    ["Answer agreement",   fmtNum(w.answer_agreement)],
    ["Matched calls",      w.n_matched ?? "—"],
    ["Mismatched calls",   mismatched],
    ["Autonomy-only calls", w.n_autonomy_only ?? "—"],
    ["Runs compared",      (w.run_ids || []).join(", ") || "—"],
  ];
  return `<section class="report-section">
  <h2 class="section-title"><span class="stag ${pass ? "stag-pass" : "stag-warn"}">${pass ? "✓ passed" : "⚠ check"}</span> Gate · World Validity</h2>
  ${commentaryBlock(commentary)}
  ${statGrid(stats)}
</section>`;
}

function buildSessionTopologyChart(topo) {
  const rows = topo?.per_date || [];
  if (!rows.length) return "";
  const dates = rows.map((r) => (r.date || "").slice(0, 10));
  const spawnRanges = rows.map((r) => r.spawn_count_range ?? 0);
  const thinkRanges = rows.map((r) => r.thinking_depth_range ?? 0);
  const synStds = rows.map((r) => r.synthesis_len_std ?? 0);

  const W = 800, H = 220, P = { t: 18, r: 18, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = dates.length;
  const maxBar = Math.max(...spawnRanges, ...thinkRanges, 0.01);
  const maxSyn = Math.max(...synStds, 1);
  const bx = (i) => P.l + (i + 0.5) * (iW / n);
  const bw = Math.max(4, (iW / n) * 0.35);
  const barY = (v) => P.t + iH - (v / maxBar) * iH;
  const lineY = (v) => P.t + iH - (v / maxSyn) * iH;

  const bars = spawnRanges.map((v, i) => {
    const bh = Math.max(2, (v / maxBar) * iH);
    return `<rect x="${(bx(i) - bw / 2).toFixed(1)}" y="${(P.t + iH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" class="var-bar"/>`;
  }).join("");
  const thinkPath = thinkRanges.map((v, i) => `${i ? "L" : "M"}${bx(i).toFixed(1)},${lineY(v).toFixed(1)}`).join(" ");
  const synPath = synStds.map((v, i) => `${i ? "L" : "M"}${bx(i).toFixed(1)},${lineY(v).toFixed(1)}`).join(" ");

  const step = Math.max(1, Math.floor(n / 7));
  const xLabels = dates.filter((_, i) => i % step === 0 || i === n - 1).map((d) => {
    const i = dates.indexOf(d);
    return `<text x="${bx(i).toFixed(1)}" y="${H - 5}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${bars}
  <path d="${thinkPath}" stroke="${theme.accent2}" stroke-width="1.8" fill="none"/>
  <path d="${synPath}" stroke="${theme.violet}" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  ${xLabels}
</svg>
<div class="chart-legend">
  <span class="lgd-varbar"></span><span>spawn range</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-sign"></span><span>thinking depth range</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-run"></span><span>synthesis len std</span>
</div>
</figure>`;
}

function renderSessionTopologySection(topo, runIds) {
  if (!topo?.per_date?.length) return "";
  const ts = topo.summary || {};
  const stats = [
    ["Mean spawn range", fmtNum(ts.mean_spawn_range, 2)],
    ["Dates w/ spawn divergence", ts.dates_with_spawn_divergence ?? "—"],
    ["Mean thinking depth range", fmtNum(ts.mean_thinking_depth_range, 2)],
    ["Mean synthesis len std", fmtNum(ts.mean_synthesis_len_std, 0)],
  ];
  const topoRows = topo.per_date.map((row) => ({
    date: row.date,
    spawn_range: row.spawn_count_range,
    think_range: row.thinking_depth_range,
    syn_std: row.synthesis_len_std,
    spawn_counts: Object.entries(row.spawn_count_per_run || {}).map(([r, n]) => `${r}:${n}`).join(" "),
  }));
  const chart = buildSessionTopologyChart(topo);
  return `<h3 class="sub-heading">Session topology · orchestrator stochasticity</h3>
  ${statGrid(stats)}
  ${chart}
  <p class="chart-footnote">Spawn range = max−min sub-agents spawned across K runs on the same date. Thinking depth range = max−min orchestrator thinking blocks. Synthesis std = cross-run dispersion of final synthesis length.</p>
  <h3 class="sub-heading">Per-date spawn counts</h3>
  ${miniTable(topoRows, ["date", "spawn_range", "think_range", "syn_std", "spawn_counts"])}`;
}

function renderBehaviour(r, sections) {
  const beh = r.behaviour || {}, s = beh.summary || {};
  const commentary = getSection(sections, "behaviour", "layer 1");
  const stats = [
    ["K runs",                s.k ?? "—"],
    ["Cells",                 s.n_cells ?? "—"],
    ["Calls / run (mean±std)", s.total_calls_mean != null ? `${fmtNum(s.total_calls_mean, 0)} ± ${fmtNum(s.total_calls_std, 1)}` : "—"],
    ["Cell call std (mean)",  fmtNum(s.mean_call_count_std)],
    ["Cell call std (max)",   fmtNum(s.max_call_count_std)],
    ["Toolset stability",     fmtNum(s.mean_toolset_stability)],
    ["Identical toolset cells", s.cells_identical_toolset ?? "—"],
    ["Coverage",              fmtNum(s.coverage_rate)],
  ];
  const cols = ["date", "ticker", "coverage", "n_calls_mean", "n_calls_std", "n_calls_range", "toolset_stability", "orch_n_calls_mean"];
  // Flatten orch_session_ids dict into a readable string for display
  const flatRows = (beh.per_cell || []).map((r) => ({
    ...r,
    ticker: r.ticker || r.subject || "—",
    orch_session_ids: r.orch_session_ids
      ? Object.entries(r.orch_session_ids).map(([run, sid]) => `${run}: ${String(sid).slice(0, 20)}`).join(" | ")
      : "—",
  }));
  const displayCols = [...cols, "orch_session_ids"];
  const topoBlock = isSingleActive(r) ? renderSessionTopologySection(beh.session_topology, r.run_ids) : "";
  return `<section class="report-section">
  <h2 class="section-title"><span class="stag stag-l1">Layer 1</span> Behaviour Variance</h2>
  ${commentaryBlock(commentary)}
  ${statGrid(stats)}
  <h3 class="sub-heading">Per-cell breakdown</h3>
  ${interactiveTable(flatRows, displayCols, "beh-cells")}
  ${topoBlock}
</section>`;
}

function renderOutput(r, sections) {
  const out = r.output || {}, s = out.summary || {};
  const commentary = getSection(sections, "output", "layer 2");
  const stats = [
    ["Cells",               s.n_cells != null ? fmtNum(s.n_cells, 0) : "—"],
    ["Coverage",            fmtNum(s.coverage_rate)],
    ["Score std (mean)",    fmtNum(s.mean_score_std)],
    ["Score std (max)",     fmtNum(s.max_score_std)],
    ["Sign agreement (mean)", fmtNum(s.mean_sign_agreement)],
    ["Rank corr (mean)",    fmtNum(s.mean_rank_corr)],
    ["Unanimous cells",     s.cells_unanimous_sign != null ? fmtNum(s.cells_unanimous_sign, 0) : "—"],
  ];
  const cols = ["date", "ticker", "coverage", "score_mean", "score_std", "score_range",
                 "sign_agreement", "conviction_mean", "conviction_std", "modal_sign"];
  return `<section class="report-section">
  <h2 class="section-title"><span class="stag stag-l2">Layer 2</span> Output Variance</h2>
  ${commentaryBlock(commentary)}
  ${statGrid(stats)}
  <h3 class="sub-heading">Per-cell breakdown</h3>
  ${interactiveTable(out.per_cell, cols, "out-cells")}
</section>`;
}

function renderSignalIR(r, sections) {
  const ir = r.ir || {};
  const single = isSingleActive(r);
  const metric = metricLabel(r);
  const commentary = getSection(sections, "signal", "layer 3", "ir");
  const horizons = Object.keys(ir.by_horizon || {}).map(Number).sort((a, b) => a - b);
  const irRows = horizons.map((h) => {
    const bh = ir.by_horizon[h] || {};
    const t = bh.mean_ic_nw?.t;
    const tStr = t != null ? `${fmtNum(t, 2)}${Math.abs(t) >= 3 ? " ★" : Math.abs(t) >= 1.96 ? " ✓" : ""}` : "—";
    if (single) {
      const ptSig = bh.ensemble_pt_pvalue != null && bh.ensemble_pt_pvalue < 0.05 ? " ✓" : "";
      return {
        h,
        [`single ${metric} (mean±std)`]: bh.single_run_icir_mean != null ? `${fmtNum(bh.single_run_icir_mean, 2)} ± ${fmtNum(bh.single_run_icir_std, 2)}` : "—",
        [`signal ${metric}`]: fmtNum(bh.ensemble_icir, 2),
        "NW t": tStr,
        "time IC": fmtNum(bh.ensemble_time_ic, 2),
        "hit rate": fmtPct(bh.ensemble_hit_rate),
        "PT p-val": bh.ensemble_pt_pvalue != null ? `${fmtNum(bh.ensemble_pt_pvalue, 3)}${ptSig}` : "—",
        "ens. benefit": fmtNum(bh.ensemble_benefit, 2),
        T: bh.n_periods ?? "—",
      };
    }
    return {
      h,
      [`single ${metric} (mean±std)`]: bh.single_run_icir_mean != null ? `${fmtNum(bh.single_run_icir_mean, 2)} ± ${fmtNum(bh.single_run_icir_std, 2)}` : "—",
      [`adj. ${metric}`]: fmtNum(bh.ensemble_icir, 2),
      "NW t": tStr,
      "ens. benefit": fmtNum(bh.ensemble_benefit, 2),
      T: bh.n_periods ?? "—",
    };
  });
  const irCols = single
    ? ["h", `single ${metric} (mean±std)`, `signal ${metric}`, "NW t", "time IC", "hit rate", "PT p-val", "ens. benefit", "T"]
    : ["h", `single ${metric} (mean±std)`, `adj. ${metric}`, "NW t", "ens. benefit", "T"];
  const perRunRows = [];
  for (const [run, hMap] of Object.entries(ir.per_run_ic || {})) {
    for (const [h, d] of Object.entries(hMap)) {
      const row = { run, h: Number(h), mean_ic: d.mean_ic, icir: d.icir, T: d.n_periods };
      if (single) {
        row.time_ic = d.time_ic;
        row.hit_rate = d.hit_rate != null ? fmtPct(d.hit_rate) : "—";
        row["PT p"] = d.pt_pvalue != null ? fmtNum(d.pt_pvalue, 3) : "—";
      }
      perRunRows.push(row);
    }
  }
  const perRunCols = single
    ? ["run", "h", "mean_ic", "icir", "time_ic", "hit_rate", "PT p", "T"]
    : ["run", "h", "mean_ic", "icir", "T"];
  const layerTitle = single ? `Signal ${metric} · OW/UW vs neutral` : `Signal ${metric} · rank`;
  return `<section class="report-section">
  <h2 class="section-title"><span class="stag stag-l3">Layer 3</span> ${layerTitle}</h2>
  ${commentaryBlock(commentary)}
  <h3 class="sub-heading">Ensemble vs single-run · transform: ${ir.transform || "—"} · profile: ${profileId(r)}</h3>
  ${miniTable(irRows, irCols)}
  ${perRunRows.length ? `<h3 class="sub-heading">Per-run IC detail</h3>${miniTable(perRunRows, perRunCols)}` : ""}
</section>`;
}


// ── Layer 4: factor attribution ──────────────────────────────────────────────

// Horizontal stacked bar: factor-explained (R²) vs residual (1−R²) variance share.
function buildVarianceDecompChart(r2) {
  if (r2 == null || Number.isNaN(Number(r2))) return "";
  const explained = Math.max(0, Math.min(1, Number(r2)));
  const residual = 1 - explained;
  const W = 800, H = 56, P = { t: 10, r: 12, b: 10, l: 12 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const exW = iW * explained;
  const exPct = (explained * 100).toFixed(1);
  const resPct = (residual * 100).toFixed(1);
  const exLabel = explained >= 0.12
    ? `<text x="${(P.l + exW / 2).toFixed(1)}" y="${(P.t + iH / 2).toFixed(1)}" class="attr-seg-pct" text-anchor="middle" dominant-baseline="middle">${exPct}%</text>` : "";
  const resLabel = residual >= 0.12
    ? `<text x="${(P.l + exW + iW * residual / 2).toFixed(1)}" y="${(P.t + iH / 2).toFixed(1)}" class="attr-seg-pct" text-anchor="middle" dominant-baseline="middle">${resPct}%</text>` : "";
  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  <rect x="${P.l}" y="${P.t}" width="${exW.toFixed(1)}" height="${iH}" class="attr-seg-explained" rx="2"/>
  <rect x="${(P.l + exW).toFixed(1)}" y="${P.t}" width="${(iW - exW).toFixed(1)}" height="${iH}" class="attr-seg-residual" rx="2"/>
  ${exLabel}${resLabel}
</svg>
<div class="chart-legend">
  <span class="lgd-expl"></span><span>factor-explained (R² = ${fmtNum(explained, 2)})</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-resid"></span><span>residual / orthogonal (1 − R² = ${fmtNum(residual, 2)})</span>
</div>
</figure>`;
}

// Per-period factor-explained R²: one vertical bar per decision date, mean line.
// Shows whether the factor bundle's explanatory power is stable across the sample.
function buildPerPeriodR2Chart(perDate) {
  const entries = Object.entries(perDate || {})
    .map(([d, r]) => ({ d, r2: r && r.r_squared }))
    .filter((e) => e.r2 != null && !Number.isNaN(Number(e.r2)))
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  if (!entries.length) return "";
  const r2s = entries.map((e) => Number(e.r2));
  const yMax = 1.0; // R² is bounded in [0,1]; fixed ceiling keeps scales comparable
  const W = 820, H = 230, P = { t: 18, r: 70, b: 52, l: 40 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = entries.length;
  const slot = iW / n, bw = Math.max(4, Math.min(slot * 0.62, 34));
  const xFor = (i) => P.l + slot * i + (slot - bw) / 2;
  const yFor = (v) => P.t + iH - (Math.max(0, v) / yMax) * iH;

  const ticks = [0, 0.25, 0.5, 0.75, 1.0].map((t) => {
    const yy = yFor(t).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 6}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${t.toFixed(2)}</text>`;
  }).join("");

  const bars = entries.map((e, i) => {
    const v = Number(e.r2);
    const x = xFor(i), y = yFor(v), h = Math.max(1, P.t + iH - y);
    const cx = (x + bw / 2).toFixed(1);
    const valLabel = v >= 0.08
      ? `<text x="${cx}" y="${(y - 4).toFixed(1)}" class="axis-label" text-anchor="middle">${v.toFixed(2)}</text>` : "";
    const label = e.d.slice(5); // MM-DD (year shown on first/last only to avoid clutter)
    const yr = (i === 0 || i === n - 1 || e.d.endsWith("-01-01")) ? e.d.slice(0, 4) : "";
    const yrLabel = yr ? `<text x="${cx}" y="${H - 6}" class="axis-label" text-anchor="middle">${yr}</text>` : "";
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" class="attr-seg-explained" rx="1"/>
    ${valLabel}
    <text x="${cx}" y="${H - P.b + 14}" class="axis-label" text-anchor="end" transform="rotate(-40 ${cx} ${H - P.b + 14})">${label}</text>
    ${yrLabel}`;
  }).join("");

  const meanR2 = r2s.reduce((a, b) => a + b, 0) / r2s.length;
  const meanY = yFor(meanR2).toFixed(1);
  const meanLine = `<line x1="${P.l}" y1="${meanY}" x2="${W - P.r}" y2="${meanY}" class="beta-axis" stroke-dasharray="5 4"/>
    <text x="${W - P.r + 5}" y="${meanY}" class="axis-label" dominant-baseline="middle">μ=${meanR2.toFixed(2)}</text>`;

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${ticks}
  ${bars}
  ${meanLine}
</svg>
<div class="chart-legend">
  <span class="lgd-expl"></span><span>factor-explained R² per period</span>
  <span class="lgd-sep"> · </span><span>dashed line = mean R² across periods</span>
</div>
</figure>`;
}

// Grouped bars per horizon: agent / factor-explained / residual RankICIR, with a zero line.
function buildIcDecompChart(irDecomp, metric) {
  const hs = Object.keys(irDecomp || {}).map(Number).sort((a, b) => a - b);
  if (!hs.length) return "";
  const rows = hs.map((h) => {
    const d = irDecomp[String(h)] || irDecomp[h] || {};
    return { h, agent: d.total_agent_ir, explained: d.factor_explained_ir, residual: d.residual_ir };
  });
  const vals = rows.flatMap((r) => [r.agent, r.explained, r.residual]).filter((v) => v != null && !Number.isNaN(v));
  if (!vals.length) return "";
  const maxAbs = Math.max(...vals.map(Math.abs), 0.01);
  const W = 800, H = 240, P = { t: 16, r: 54, b: 40, l: 54 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b, n = rows.length;
  const slot = iW / n, bw = Math.max(5, slot * 0.22), gap = bw * 0.25;
  const bx = (i) => P.l + slot * i + slot / 2;
  // symmetric y axis around 0
  const yFor = (v) => P.t + iH / 2 - (v / maxAbs) * (iH / 2);
  const zeroY = (P.t + iH / 2).toFixed(1);

  const ticks = [-1, -0.5, 0, 0.5, 1].map((t) => {
    const v = t * maxAbs, yy = yFor(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${fmtNum(v, 1)}</text>`;
  }).join("");

  const bars = rows.map((r, i) => {
    const cx = bx(i);
    const triple = [["agent", r.agent, "attr-decomp-bar-agent"],
                    ["explained", r.explained, "attr-decomp-bar-explained"],
                    ["residual", r.residual, "attr-decomp-bar-residual"]];
    return triple.map(([_, v, cls], j) => {
      if (v == null || Number.isNaN(v)) return "";
      const x = cx - (bw * 1.5 + gap) + j * (bw + gap) + gap / 2;
      const y0 = yFor(0), y1 = yFor(v);
      const yo = Math.min(y0, y1), h = Math.max(2, Math.abs(y1 - y0));
      const sig = (cls === "attr-decomp-bar-residual" && Math.abs(v) > 0.05) ? ' class="' + cls + ' beta-bar-sig"' : ' class="' + cls + '"';
      return `<rect x="${x.toFixed(1)}" y="${yo.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"${sig} rx="1"/>`;
    }).join("") + `<text x="${cx.toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">h${r.h}</text>`;
  }).join("");

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${ticks}
  <line x1="${P.l}" y1="${zeroY}" x2="${W - P.r}" y2="${zeroY}" class="attr-decomp-bar-zero"/>
  ${bars}
</svg>
<div class="chart-legend">
  <span class="lgd-agent"></span><span>agent ${metric}</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-expl"></span><span>factor-explained</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-resid"></span><span>residual (orthogonal alpha) — outlined if |val| &gt; 0.05</span>
</div>
</figure>`;
}

// Horizontal β bars per factor, coloured by sign, outlined if |t| ≥ 2 (rough significance).
function buildBetaBarChart(betaTable) {
  const rows = (betaTable || []).slice().sort((a, b) => Math.abs(b.beta_mean) - Math.abs(a.beta_mean));
  if (!rows.length) return "";
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.beta_mean || 0)), 0.01);
  const labelW = 220, W = 800, H = Math.max(120, rows.length * 28 + 30), P = { t: 8, r: 24, b: 8, l: labelW };
  const iW = W - P.l - P.r, rowH = (H - P.t - P.b) / rows.length;
  const cx = P.l; // zero axis x
  const xFor = (v) => cx + (v / maxAbs) * (iW / 2);

  const zeroLine = `<line x1="${cx}" y1="${P.t}" x2="${cx}" y2="${H - P.b}" class="beta-axis"/>`;
  const bars = rows.map((r, i) => {
    const v = r.beta_mean || 0;
    const y = P.t + i * rowH + rowH * 0.18;
    const bh = rowH * 0.64;
    const x0 = cx, x1 = xFor(v);
    const xo = Math.min(x0, x1), w = Math.max(2, Math.abs(x1 - x0));
    const cls = v >= 0 ? "beta-bar-pos" : "beta-bar-neg";
    const sig = Math.abs(r.t_stat || 0) >= 2 ? " beta-bar-sig" : "";
    const label = (r.factor || "").replace(/\.[a-z_]+$/, "");
    const interp = r.interpretation ? ` · ${r.interpretation}` : "";
    return `<text x="${P.l - 8}" y="${(y + bh / 2).toFixed(1)}" class="axis-label" text-anchor="end" dominant-baseline="middle">${label}</text>
    <rect x="${xo.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" class="${cls}${sig}" rx="1"/>
    <text x="${(x1 + (v >= 0 ? 4 : -4)).toFixed(1)}" y="${(y + bh / 2).toFixed(1)}" class="axis-label" text-anchor="${v >= 0 ? "start" : "end"}" dominant-baseline="middle">${fmtNum(v, 2)} (t=${fmtNum(r.t_stat, 1)})${interp}</text>`;
  }).join("");

  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="returns-chart" xmlns="http://www.w3.org/2000/svg">
  ${zeroLine}${bars}
</svg>
<div class="chart-legend">
  <span class="lgd-expl"></span><span>positive β</span>
  <span class="lgd-sep"> · </span>
  <span class="lgd-resid"></span><span>negative β</span>
  <span class="lgd-sep"> · </span>
  <span>outline = |t| ≥ 2 (rough significance)</span>
</div>
</figure>`;
}

function renderAttribution(r, sections) {
  const fa = r.factor_attribution;
  const faErr = r.factor_attribution_error;
  const metric = metricLabel(r);
  const commentary = getSection(sections, "attribution", "layer 4", "factor");
  if (!fa && !faErr) return "";
  if (!fa) {
    return `<section class="report-section">
  <h2 class="section-title"><span class="stag stag-l4">Layer 4</span> Factor Attribution</h2>
  ${commentaryBlock(commentary)}
  <p class="empty-note">Unavailable: ${faErr || "no factor attribution payload."}</p>
</section>`;
  }
  const s = fa.summary || {};
  const r2 = s.mean_r_squared;
  const controlFactors = fa.control_factors || [];
  const decomp = fa.ir_decomposition || {};
  const bh = fa.by_horizon || {};
  const h1 = bh["1"] || bh[1] || {};
  const perDateReg = fa.per_date_regression || {};
  const nSecCtrls = fa.n_sector_controls ?? (perDateReg.length
    ? Math.max(0, ...perDateReg.map((pd) => pd.n_sector_controls || 0))
    : (Object.values(perDateReg).length
        ? Math.max(0, ...Object.values(perDateReg).map((pd) => pd.n_sector_controls || 0))
        : null));

  const stats = [
    ["Mean R²", r2 != null ? `${fmtNum(r2, 2)} (${Math.round((r2 || 0) * 100)}% explained)` : "—"],
    ["Residual var share", r2 != null ? fmtNum(1 - r2, 2) : "—"],
    ["Dates analysed", s.n_dates ?? "—"],
    ["Periods per year", s.ppy != null ? fmtNum(s.ppy, 1) : "—"],
    ["Control factors", controlFactors.length],
    ["Sector controls", fa.sector_controls ? `${nSecCtrls ?? "—"} GICS dummies` : "off"],
    ["Agent transform", fa.transform || "—"],
  ];

  // β table (sorted by |β mean| desc for the table; chart sorts itself)
  const betaRows = (s.beta_table || []).map((row) => ({
    factor: row.factor,
    "β mean": row.beta_mean,
    "β std": row.beta_std,
    "t-stat": row.t_stat,
    "n dates": row.n_dates,
    "mean coverage": row.mean_coverage,
    interpretation: row.interpretation || "—",
  }));
  const betaCols = ["factor", "β mean", "β std", "t-stat", "n dates", "mean coverage", "interpretation"];

  // RankICIR decomposition table
  const decompRows = Object.keys(decomp).map(Number).sort((a, b) => a - b).map((h) => {
    const d = decomp[String(h)] || decomp[h] || {};
    const fbh = bh[String(h)] || bh[h] || {};
    const nw = fbh.residual_mean_ic_nw || {};
    const t = nw.t;
    const tStr = t != null ? `${fmtNum(t, 2)}${Math.abs(t) >= 3 ? " ★" : Math.abs(t) >= 1.96 ? " ✓" : ""}` : "—";
    return {
      h,
      [`agent ${metric}`]: d.total_agent_ir,
      [`factor-explained ${metric}`]: d.factor_explained_ir,
      [`residual ${metric}`]: d.residual_ir,
      "resid. NW t": tStr,
      "resid. var share": d.residual_var_share,
      T: fbh.n_periods ?? "—",
    };
  });
  const decompColNames = [
    "h", `agent ${metric}`, `factor-explained ${metric}`, `residual ${metric}`,
    "resid. NW t", "resid. var share", "T",
  ];

  // Per-factor standalone ICIR (h=1)
  const facIcir = h1.factor_icir || {};
  const facIc = h1.factor_ic || {};
  const facRows = Object.keys(facIcir).sort().map((fn) => ({
    factor: fn,
    "ICIR (h=1)": facIcir[fn],
    "IC (h=1)": facIc[fn],
  }));
  const facCols = ["factor", "ICIR (h=1)", "IC (h=1)"];

  const r2Chart = buildVarianceDecompChart(r2);
  const perPeriodR2Chart = buildPerPeriodR2Chart(fa.per_date_regression);
  const icChart = buildIcDecompChart(decomp, metric);
  const betaChart = buildBetaBarChart(s.beta_table);

  return `<section class="report-section">
  <h2 class="section-title"><span class="stag stag-l4">Layer 4</span> Factor Attribution</h2>
  ${commentaryBlock(commentary)}
  <p class="chart-footnote" style="margin-bottom:1rem">Decomposes the agent signal into a factor-explained component (Fama-MacBeth cross-sectional regression on the control bundle) and an orthogonal residual. The residual ${metric} is the alpha <em>relative to these factors</em>. The IC layer is benchmark-agnostic; only the active-weight translation (Layer 3 charts) uses equal-weight.</p>
  <h3 class="sub-heading">Summary · ${controlFactors.length} control factors · transform: ${fa.transform || "—"}</h3>
  ${statGrid(stats)}
  <h3 class="sub-heading">Variance decomposition (cross-sectional)</h3>
  ${r2Chart || '<p class="empty-note">R² not available.</p>'}
  <h3 class="sub-heading">Per-period factor-explained R²</h3>
  ${perPeriodR2Chart || '<p class="empty-note">No per-period R² available.</p>'}
  <p class="chart-footnote">Cross-sectional R² from the per-date Fama-MacBeth regression. A flat series means the factor bundle explains a stable share of the agent signal across the sample; a drift (rising or falling) means the agent's alignment with these factors is time-varying, so the residual alpha is not drawn from a stationary decomposition. <strong>Caveat:</strong> the <code>sentiment.news_30d</code> control has no data before 2024-07 (Massive does not tag news articles with sentiment insights prior to that date), so on earlier periods the regression runs with 7 of 8 controls and the sentiment column is neutralized — R² on those dates is slightly understated relative to the later sample, and part of the upward drift seen across the window reflects this coverage thickening rather than a pure change in the agent's factor alignment.</p>
  <h3 class="sub-heading">Factor loadings · Fama-MacBeth β across dates</h3>
  ${betaChart}
  ${miniTable(betaRows, betaCols)}
  <h3 class="sub-heading">${metric} decomposition by horizon</h3>
  ${icChart}
  ${miniTable(decompRows, decompColNames)}
  ${facRows.length ? `<h3 class="sub-heading">Per-factor standalone ICIR (h=1)</h3>${miniTable(facRows, facCols)}` : ""}
  <p class="chart-footnote"><strong>agent / factor-explained / residual ${metric}</strong> are the annualised ICIR of the agent signal, the regression-fitted signal, and the residuals — computed on the same date set so the decomposition is internally consistent. <strong>resid. NW t</strong> = Newey–West (HAC, lag = h−1) t on the residual mean IC — the inference face for "does alpha survive the factor + sector controls at this horizon"; ✓ = |t| ≥ 1.96 (95%), ★ = |t| ≥ 3 (multiple-testing-credible). We show the NW t rather than a bootstrap CI on the residual ICIR because the ICIR is a small-n mean/std ratio whose bootstrap CI is right-skewed and can disagree with the t at the borderline. <strong>resid. var share</strong> = 1 − R². <strong>β t-stat</strong> is the Fama-MacBeth time-series t (mean β ÷ (std β ÷ √n_dates)); |t| ≳ 2 is a rough significance flag — with few dates this is low-powered.</p>
</section>`;
}


function renderGlossary(r) {
  const single = isSingleActive(r);
  const metric = metricLabel(r);
  const rankBlock = single ? "" : `
    <dt>RankIC / RankICIR</dt><dd>RankIC = Spearman rank correlation between the agent's signal and forward returns for one period. RankICIR = mean(RankIC) ÷ std(RankIC) × √ppy — the <em>signal-quality</em> Information Ratio, not a portfolio IR. Beta-neutral to the equal-weight cross-section of the universe by construction (a common market shift doesn't change ranks). An <em>upper bound</em> on the realised portfolio IR.</dd>
    <dt>NW t (mean IC)</dt><dd>Newey–West (HAC, lag = h−1) t-statistic on the ensemble mean IC — the report's inference face for "is the predictive direction reliably positive?". Overlap-robust (lag = h−1 corrects the serial correlation from overlapping forward returns). ✓ = |t| ≥ 1.96 (95% two-sided); ★ = |t| ≥ 3 (multiple-testing-credible, Harvey–Liu–Zhu 2016). We show the NW t rather than a bootstrap CI on the ICIR because the ICIR is a small-n mean/std ratio whose bootstrap CI is right-skewed and can disagree with the t at the borderline.</dd>`;
  const singleBlock = single ? `
    <dt>Signal IR (OW/UW)</dt><dd>Raw score clamped to [-1, +1]. Positive = overweight vs neutral hold; negative = underweight. Active return ≈ score × forward return × active_budget. Here "IR" is a genuine active-return Sharpe (the signal is the position tilt), not a RankICIR.</dd>
    <dt>active_budget</dt><dd><strong>Chart-only scaling factor</strong> (default 0.5). It scales the y-axis of the cumulative-return chart but cancels out in the IR and all other metrics. It is <em>not</em> a position-sizing risk limit.</dd>
    <dt>NW t (single_active)</dt><dd>Newey–West (HAC, lag = h−1) t on the ensemble mean IC — the inference face for "is the signal IR reliably positive?". Overlap-robust. ✓ = |t| ≥ 1.96 (95%); ★ = |t| ≥ 3 (credible). Shown in preference to a bootstrap CI on the IR, which is a small-n ratio and right-skewed/fragile.</dd>
    <dt>Time IC</dt><dd>Spearman correlation of scores vs returns across T periods (temporal analogue of cross-sectional IC).</dd>
    <dt>Hit rate</dt><dd>Raw fraction of periods where sign(score) matched sign(return). Base-rate biased — use PT p-val to judge significance.</dd>
    <dt>PT p-val</dt><dd>Pesaran–Timmermann (1992) one-tailed p-value. Tests directional skill beyond unconditional drift. p &lt; 0.05 → significant at 5%; annotated with ✓ in the IR table.</dd>
    <dt>Session topology</dt><dd>Cross-run dispersion of sub-agent spawns, thinking depth, and synthesis length — the primary lens for agent reasoning stochasticity.</dd>` : "";
  return `<details class="glossary-wrap">
  <summary>How to read this report (${profileId(r)})</summary>
  <dl class="glossary-dl">
    <dt>K</dt><dd>Number of parallel repeat runs of the same frozen config. The core unit: averaging K runs denoises agent stochasticity.</dd>
    <dt>T / n_periods</dt><dd>Number of decision dates used to compute IC. More periods → tighter, higher-power inference (the NW t gains degrees of freedom).</dd>
    <dt>h1, h2, h3, h4</dt><dd>Forward return windows in decision periods. h1 = 1 period forward, h2 = 2, etc. The <em>cadence</em> field shows the real-time equivalent (e.g. quarterly → h1 ≈ 3 months).</dd>
    ${rankBlock}
    <dt>Adj. ${metric} (ensemble ICIR)</dt><dd>ICIR computed on the mean ensemble signal across K runs. The headline metric.</dd>
    ${single ? "" : `<dt>Ensemble benefit</dt><dd>Adj. ${metric} minus single-run mean ${metric}. Positive = ensembling helped; negative = one run was an outlier and averaging diluted it.</dd>`}
    ${singleBlock}
    <dt>R² (Layer 4)</dt><dd>Mean cross-sectional R² of the Fama-MacBeth regression across dates — the share of the agent signal's cross-sectional variance explained by the control factor bundle. The residual share is 1 − R².</dd>
    <dt>Fama-MacBeth β</dt><dd>Per date, a cross-sectional OLS of the agent signal on z-scored factor scores; β is averaged across dates. β t-stat = mean(β) ÷ (std(β) ÷ √n_dates); |t| ≳ 2 is a rough loading flag. SVD-based solver (handles collinear factors).</dd>
    <dt>factor-explained ${metric}</dt><dd>The ${metric} of the regression-fitted signal — the signal-stage ${metric} attributable to the factor bundle.</dd>
    <dt>residual ${metric}</dt><dd>The ${metric} of the regression residuals — the agent's alpha <em>relative to these factors</em>. Its <strong>NW t</strong> (Newey–West, lag = h−1) tests whether residual alpha is reliably positive beyond the factor + sector controls; ✓ = |t| ≥ 1.96 (95%), ★ = |t| ≥ 3 (credible). No bootstrap CI is shown on the residual ICIR (small-n ratio, right-skewed/fragile).</dd>
    <dt>Control factors</dt><dd>The fixed factor bundle used for attribution (e.g. value, momentum, quality, size, growth, leverage, volatility, sentiment). A control bundle, not a complete model — "unexplained" ≠ "alpha" if a latent factor is missing.</dd>
    <dt>Benchmark coupling</dt><dd>The IC / RankICIR / attribution layers are benchmark-agnostic (rank correlation has no portfolio weights). The equal-weight benchmark only enters the Layer 3 active-weight drift charts — a portfolio-construction choice, swap-able via strategy profiles without changing the IC.</dd>
    <dt>World gate</dt><dd>Did all K runs see identical data? 100% agreement = experiment valid. Any unexplained mismatch contaminates downstream layers.</dd>
    <dt>Toolset stability</dt><dd>Fraction of (date, ticker) cells where all K runs used the exact same set of tools.</dd>
    <dt>Calls range</dt><dd>Max minus min tool calls across K runs for one cell. High range + 100% stability = depth variance. Low stability = strategy variance.</dd>
    <dt>Sign agreement</dt><dd>Fraction of K runs that agreed on direction (positive vs negative score) for a cell.</dd>
    <dt>Score std</dt><dd>Standard deviation of scores across K runs for a cell. Measures magnitude of output disagreement.</dd>
  </dl>
</details>`;
}

// ── Load & render ─────────────────────────────────────────────────────────────
function _showReportError(container, err, batch) {
  const msg = err?.message || String(err);
  container.innerHTML = `<div class="report-error">
  <p><strong>Failed to load report</strong></p>
  <p class="report-error-msg">${msg}</p>
  <button class="btn-primary" onclick="loadReport()">Retry</button>
  ${batch ? `<p class="report-error-hint">Batch: <code>${batch}</code> · Is the server running? <code>python scripts/cache_viewer.py</code></p>` : ""}
</div>`;
}

async function loadReport() {
  const batch = $("#batchSelect").value;
  if (!batch) return;
  const container = $("#reportSections");
  container.innerHTML = `<p class="empty-note" style="padding:2rem">Loading…</p>`;
  try {
    const [rRes, cRes] = await Promise.all([
      fetch(`/api/analytics/report?batch=${encodeURIComponent(batch)}`),
      fetch(`/api/analytics/commentary?batch=${encodeURIComponent(batch)}`),
    ]);
    if (!rRes.ok) {
      const body = await rRes.text().catch(() => "");
      throw new Error(`Server returned ${rRes.status}${body ? ": " + body.slice(0, 120) : ""}`);
    }
    const r = await rRes.json();
    const commentary = cRes.ok && cRes.status !== 204 ? await cRes.text() : "";
    const sections = parseCommentarySections(commentary);
    container.innerHTML = [
      renderHeader(r),
      renderSummary(r, sections),
      renderGate(r, sections),
      renderBehaviour(r, sections),
      renderOutput(r, sections),
      renderSignalIR(r, sections),
      renderAttribution(r, sections),
      renderGlossary(r),
    ].join("");
    loadBuckets(batch); // async — fills #bucketChart and #timingTiltChart
  } catch (err) {
    _showReportError(container, err, batch);
  }
}

async function loadBuckets(batch) {
  const bucketEl = document.getElementById("bucketChart");
  const ttEl = document.getElementById("timingTiltChart");
  async function fill(el, builder) {
    if (!el) return;
    try {
      const res = await fetch(`/api/analytics/buckets?batch=${encodeURIComponent(batch)}`);
      const data = await res.json();
      if (!res.ok) {
        el.innerHTML = `<p class="empty-note">${data?.error || "Bucket analysis unavailable."}</p>`;
        return;
      }
      el.innerHTML = builder(data) || '<p class="empty-note">No bucket data.</p>';
    } catch (err) {
      el.innerHTML = `<p class="empty-note">Bucket analysis unavailable: ${err.message}</p>`;
    }
  }
  await Promise.all([
    fill(bucketEl, buildBucketChart),
    fill(ttEl, buildTimingTiltChart),
  ]);
}

$("#loadReportBtn").addEventListener("click", loadReport);

async function initAnalyticsSelectors() {
  try {
    const batches = await (await fetch("/api/analytics/batches")).json();
    const sel = $("#batchSelect");
    batches.forEach((b) => sel.appendChild(new Option(b, b)));
    if (batches.length) { sel.value = batches[batches.length - 1]; loadReport(); }
  } catch (err) {
    const container = $("#reportSections");
    _showReportError(container, new Error("Cannot reach server. Start with: python scripts/cache_viewer.py"), null);
  }
}

initAnalyticsSelectors();

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3 — Web Search cache
// ══════════════════════════════════════════════════════════════════════════════

let _wsAllEntries = [];
let _wsFiltered = [];

function _wsEsc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function _wsPitBadge(toDate) {
  return `<span class="ws-pit-badge">PIT ≤ ${_wsEsc(toDate)}</span>`;
}

async function wsLoad() {
  $("#ws-index").innerHTML = `<p class="empty-note">Loading…</p>`;
  $("#ws-detail").style.display = "none";
  try {
    const res = await fetch("/api/web_search");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _wsAllEntries = await res.json();
  } catch (e) {
    $("#ws-index").innerHTML = `<p class="empty-note">Error: ${_wsEsc(e.message)}</p>`;
    return;
  }
  wsApplyFilter();
}

function wsApplyFilter() {
  const q = ($("#ws-filter").value || "").trim().toLowerCase();
  _wsFiltered = q
    ? _wsAllEntries.filter((e) =>
        e.query.toLowerCase().includes(q) ||
        (e.to_date || "").includes(q) ||
        (e.from_date || "").includes(q)
      )
    : _wsAllEntries.slice();
  wsRenderIndex();
}

function wsRenderIndex() {
  const index = $("#ws-index");
  const detail = $("#ws-detail");
  detail.style.display = "none";
  if (!_wsFiltered.length) {
    index.innerHTML = `<p class="empty-note">${_wsAllEntries.length ? "No matches." : "No cached web searches yet. Run a backtest with web_search enabled."}</p>`;
    return;
  }
  const rows = _wsFiltered.map((e) => `
<div class="ws-entry" data-id="${_wsEsc(e.id)}">
  <div class="ws-entry-header">
    <span class="ws-entry-query">${_wsEsc(e.query)}</span>
    ${_wsPitBadge(e.to_date)}
  </div>
  <div class="ws-entry-meta">
    <span class="ws-meta-item">window: ${_wsEsc(e.from_date)} → ${_wsEsc(e.to_date)}</span>
    <span class="ws-meta-item">${e.n_sources} source${e.n_sources !== 1 ? "s" : ""}</span>
    <span class="ws-meta-item muted">fetched: ${_wsEsc((e.fetched_at || "").slice(0, 16).replace("T", " "))} UTC</span>
  </div>
</div>`).join("");
  index.innerHTML = rows;
  index.querySelectorAll(".ws-entry").forEach((el) =>
    el.addEventListener("click", () => wsShowDetail(el.dataset.id))
  );
}

async function wsShowDetail(id) {
  const index = $("#ws-index");
  const detail = $("#ws-detail");
  const inner = $("#ws-detail-inner");
  index.style.display = "none";
  detail.style.display = "block";
  inner.innerHTML = `<p class="empty-note">Loading…</p>`;

  let entry;
  try {
    const res = await fetch(`/api/web_search/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    entry = await res.json();
  } catch (e) {
    inner.innerHTML = `<p class="empty-note">Error: ${_wsEsc(e.message)}</p>`;
    return;
  }

  // Load web_fetch cache entries to cross-reference
  let fetchMap = {};  // url -> {id, page_text_len}
  try {
    const fres = await fetch("/api/web_fetch");
    if (fres.ok) {
      const entries = await fres.json();
      for (const e of entries) {
        fetchMap[e.url] = e;
        if (e.final_url) fetchMap[e.final_url] = e;
      }
    }
  } catch (e) { /* ignore — fetch cache is optional */ }

  const sources = entry.sources || [];
  const sourcesHtml = sources.length
    ? sources.map((s) => {
        const fetched = fetchMap[s.url];
        const fetchBadge = fetched
          ? `<span class="ws-fetched-badge" title="Full page text cached (${fetched.page_text_len} chars)">📄 fetched ${fetched.page_text_len} chars</span>`
          : `<span class="ws-not-fetched-badge">snippet only</span>`;
        const fetchLink = fetched
          ? `<button class="ws-fetch-link" data-fetch-id="${_wsEsc(fetched.id)}">View page text</button>`
          : "";
        return `
<div class="ws-source">
  <div class="ws-source-header">
    <span class="ws-source-date">${_wsEsc(s.published_date || "?")}</span>
    <a class="ws-source-title" href="${_wsEsc(s.url)}" target="_blank" rel="noopener">${_wsEsc(s.title || s.url)}</a>
    <span class="ws-source-host muted">${_wsEsc(s.hostname || "")}</span>
    ${fetchBadge}
  </div>
  <p class="ws-source-snippet">${_wsEsc(s.snippet || "")}</p>
  ${fetchLink}
  <div class="ws-fetch-text" id="ws-fetch-${_wsEsc(fetched ? fetched.id : 'none')}" style="display:none"></div>
</div>`;
      }).join("")
    : `<p class="empty-note">No sources.</p>`;

  inner.innerHTML = `
<div class="ws-detail-title">
  <span class="ws-entry-query">${_wsEsc(entry.query)}</span>
  ${_wsPitBadge(entry.to_date)}
</div>
<div class="ws-entry-meta" style="margin-bottom:1.2rem">
  <span class="ws-meta-item">window: ${_wsEsc(entry.from_date)} → ${_wsEsc(entry.to_date)}</span>
  <span class="ws-meta-item">${sources.length} source${sources.length !== 1 ? "s" : ""}</span>
  <span class="ws-meta-item muted">fetched: ${_wsEsc((entry.fetched_at || "").slice(0, 16).replace("T", " "))} UTC</span>
</div>
<div class="ws-sources-list">${sourcesHtml}</div>`;

  // Wire up "View page text" buttons
  inner.querySelectorAll(".ws-fetch-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fid = btn.dataset.fetchId;
      const target = $(`#ws-fetch-${fid}`);
      if (!target) return;
      if (target.style.display !== "none") {
        target.style.display = "none";
        btn.textContent = "View page text";
        return;
      }
      btn.textContent = "Loading…";
      try {
        const res = await fetch(`/api/web_fetch/${encodeURIComponent(fid)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text = data.page_text || "";
        const preview = text.length > 2000 ? text.slice(0, 2000) + "\n\n… (truncated, " + text.length + " chars total)" : text;
        target.innerHTML = `<div class="ws-fetch-meta">fetched: ${_wsEsc((data.fetched_at || "").slice(0, 16).replace("T", " "))} UTC · content-type: ${_wsEsc(data.content_type || "?")} · final URL: <a href="${_wsEsc(data.final_url || data.url)}" target="_blank">${_wsEsc((data.final_url || data.url || "").slice(0, 60))}</a></div><pre class="ws-fetch-pre">${_wsEsc(preview)}</pre>`;
        target.style.display = "block";
        btn.textContent = "Hide page text";
      } catch (e) {
        target.innerHTML = `<p class="empty-note">Error: ${_wsEsc(e.message)}</p>`;
        target.style.display = "block";
        btn.textContent = "View page text";
      }
    });
  });
}

$("#ws-back").addEventListener("click", () => {
  $("#ws-detail").style.display = "none";
  $("#ws-index").style.display = "";
});
$("#ws-filter").addEventListener("input", wsApplyFilter);
$("#ws-refresh").addEventListener("click", wsLoad);

// Auto-load when tab becomes active
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "websearch") wsLoad();
    if (btn.dataset.tab === "compare") initComparePicker();
    // Restore index visibility when switching away and back
    if (btn.dataset.tab !== "websearch") {
      $("#ws-index").style.display = "";
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Compare (cross-config, four assessment layers)
// ══════════════════════════════════════════════════════════════════════════════

// First 5 are maximally distinct (the common 5-run compare case); 6–10 cover
// larger sweeps. Runs are coloured by position among the SELECTED set, so the
// compared runs never share a colour.
const CMP_COLORS = [
  "#ffb000", // 0 amber
  "#38bdf8", // 1 sky blue
  "#4ade80", // 2 green
  "#c084fc", // 3 violet
  "#fb7185", // 4 rose
  "#2dd4bf", // 5 teal
  "#f97316", // 6 orange
  "#818cf8", // 7 indigo
  "#facc15", // 8 yellow
  "#ec4899", // 9 pink
];
const cmpColor = (i) => CMP_COLORS[i % CMP_COLORS.length];
const MUTED_DOT = "#3a4150";

let _cmpAllBatches = [];
let _cmpSelected = new Set();
let _cmpPickerReady = false;
let _cmpItems = []; // ordered list of extracted run payloads currently shown
let _cmpCrossConfig = null; // cross-config similarity matrices (Study 2)
let _cmpRationaleCodes = null; // per-config sophistication stats (rationale_codes.parquet)

function _esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function _num(v, d = 3) {
  if (v == null || v === "" || (typeof v === "number" && Number.isNaN(v))) return null;
  return typeof v === "number" ? v : Number(v);
}
function _fmt(v, d = 3) {
  const n = _num(v);
  return n == null ? `<span class="cmp-na">—</span>` : n.toFixed(d);
}
function _fmtCI(pair) {
  if (!pair || pair[0] == null || pair[1] == null) return `<span class="cmp-na">—</span>`;
  const lo = pair[0], hi = pair[1];
  const crosses = lo <= 0 && hi >= 0;
  const cls = crosses ? "cmp-zero-cross" : "cmp-best";
  return `<span class="${cls}">[${lo.toFixed(2)}, ${hi.toFixed(2)}]</span>`;
}

// Compare-chart ordering: left = worse, right = better.
// higherIsBetter=true  → ascending (low perf left)
// higherIsBetter=false → descending (high stochasticity / corruption left)
function cmpMeanFinite(vals) {
  const v = (vals || []).filter((x) => x != null && isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function cmpSortBy(runs, getScore, { higherIsBetter = true } = {}) {
  return [...runs].sort((a, b) => {
    const va = getScore(a), vb = getScore(b);
    const aMiss = va == null || !isFinite(va);
    const bMiss = vb == null || !isFinite(vb);
    if (aMiss && bMiss) return 0;
    if (aMiss) return 1;  // missing → right
    if (bMiss) return -1;
    return higherIsBetter ? (va - vb) : (vb - va);
  });
}
// Furthest (longest) horizon among the currently shown keys — used to order
// performance charts so left→right reflects the mandate-relevant horizon.
function cmpFurthestH(hk) {
  if (!hk || !hk.length) return null;
  return String([...hk].map(Number).filter((n) => isFinite(n)).sort((a, b) => a - b).pop() ?? hk[hk.length - 1]);
}
const CMP_SORT_NOTE = "Ordered left → right: worse → better.";
function cmpSortNoteH(h) {
  return h ? `Ordered left → right: worse → better (by h${h}).` : CMP_SORT_NOTE;
}

async function initComparePicker() {
  if (_cmpPickerReady) return;
  const el = $("#comparePicker");
  try {
    const res = await fetch("/api/analytics/batches");
    _cmpAllBatches = await res.json();
    _cmpPickerReady = true;
    // Pre-select study configs (Pearson = default face)
    const preferred = [
      "floor_llm_v1_pearson_report",
      "floor_llm_v1_memory_pearson_report",
      "floor_llm_v1_glm_memory_pearson_report",
      "floor_llm_minimax_m3_memory_pearson_report",
      "floor_llm_grok_4_3_memory_pearson_report",
      "floor_llm_grok_4_5_memory_pearson_report",
      "agent_v1_memory_pearson_report",
      "tradingagent_v2_pearson_report",
      "optimized_agent_full_pearson_report",
      "optimized_agent_feedback_pearson_report",
      "optimized_agent_no_verify_pearson_report",
    ];
    preferred.forEach((b) => { if (_cmpAllBatches.includes(b)) _cmpSelected.add(b); });
    renderComparePicker();
    if (_cmpSelected.size) buildCompare();
  } catch (err) {
    el.innerHTML = `<p class="empty-note">Cannot reach server: ${_esc(err.message)}</p>`;
  }
}

// Friendly display names for the major runs (mirrors cache_viewer.py).
// Pearson IC is the default face (clean labels); Spearman dirs get `_s`.
const CMP_BASE_LABELS = {
  floor_llm_v1: "floor agent (MiMo) - no memory",
  floor_llm_v1_memory: "floor agent (MiMo)",
  floor_llm_v1_glm_memory: "floor agent (GLM)",
  floor_llm_minimax_m3_memory: "floor agent (MiniMax)",
  floor_llm_grok_4_3_memory: "floor agent (Grok 4.3)",
  floor_llm_grok_4_5_memory: "floor agent (Grok 4.5)",
  agent_v1_memory: "openclaw agent",
  tradingagent_v2: "trading agent",
  optimized_agent_full: "ex-ante agent",
  optimized_agent_feedback: "iterative agent (with memory and performance reflection)",
  optimized_agent_no_verify: "iterative agent (remove verifier)",
  tradingagent_v2_feedback: "trading agent (feedback · legacy)",
  tradingagent_v2_feedback_minimax_nocap: "trading agent (MiniMax · legacy)",
};
const CMP_DISPLAY_NAMES = {};
for (const [stem, label] of Object.entries(CMP_BASE_LABELS)) {
  CMP_DISPLAY_NAMES[`${stem}_pearson_report`] = label;
  const spearman = `${label}_s`;
  CMP_DISPLAY_NAMES[`${stem}_report`] = spearman;
  CMP_DISPLAY_NAMES[`${stem}_16p_report`] = spearman;
}
const cmpDisplayName = (b) => {
  if (CMP_DISPLAY_NAMES[b]) return CMP_DISPLAY_NAMES[b];
  const isPearson = b.includes("_pearson_report");
  const stem = b.replace("_pearson_report", "").replace("_16p_report", "").replace("_report", "");
  const base = CMP_BASE_LABELS[stem] || stem;
  return isPearson ? base : `${base}_s`;
};

function renderComparePicker() {
  const el = $("#comparePicker");
  if (!_cmpAllBatches.length) {
    el.innerHTML = `<p class="empty-note">No report batches found.</p>`;
    return;
  }
  const selectedOrder = [..._cmpSelected];
  el.innerHTML = _cmpAllBatches.map((b) => {
    const checked = _cmpSelected.has(b);
    const sIdx = selectedOrder.indexOf(b);
    const color = checked ? cmpColor(sIdx) : MUTED_DOT;
    return `<label class="cp-item" title="${_esc(b)}">
      <input type="checkbox" value="${_esc(b)}" ${checked ? "checked" : ""}>
      <span class="cp-dot" style="background:${color}"></span>${_esc(cmpDisplayName(b))}
    </label>`;
  }).join("");
  el.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) _cmpSelected.add(cb.value); else _cmpSelected.delete(cb.value);
      renderComparePicker(); // re-colour dots by new selection order
    });
  });
}

$("#compareAllBtn").addEventListener("click", () => {
  if (!_cmpPickerReady) return;
  _cmpAllBatches.forEach((b) => _cmpSelected.add(b));
  renderComparePicker();
});
$("#compareNoneBtn").addEventListener("click", () => {
  _cmpSelected.clear();
  renderComparePicker();
});
$("#buildCompareBtn").addEventListener("click", buildCompare);
$("#cmpMaxHorizon")?.addEventListener("change", () => {
  // Re-render in place when a comparison is already loaded — no refetch needed.
  if (_cmpItems && _cmpItems.length) renderCompare();
});

async function buildCompare() {
  const cont = $("#compareSections");
  const batches = [..._cmpSelected];
  if (!batches.length) {
    cont.innerHTML = `<p class="empty-note empty-note-large">Select at least one batch.</p>`;
    return;
  }
  cont.innerHTML = `<p class="empty-note" style="padding:2rem">Loading comparison…</p>`;
  try {
    const res = await fetch(`/api/analytics/compare?batches=${encodeURIComponent(batches.join(","))}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error || `HTTP ${res.status}`);
    const data = payload.batches || {};
    _cmpCrossConfig = payload.cross_config || null;
    _cmpRationaleCodes = payload.rationale_codes || null;
    // Colour by position among the SELECTED set (preserves selection order = the
    // complexity order the user picked), so compared runs never share a colour.
    _cmpItems = batches.map((b, i) => {
      const d = data[b];
      const color = cmpColor(i);
      if (!d || d.error) return { batch: b, short: cmpDisplayName(b), error: d?.error || "missing", _color: color };
      return { ...d, _color: color };
    });
    renderCompare();
  } catch (err) {
    cont.innerHTML = `<p class="empty-note">Comparison failed: ${_esc(err.message)}</p>`;
  }
}

// ── grouped bar chart (groups = x categories; one bar series per run) ───────
function buildCmpBarChart({ groups, series, yLabel = "", yLabel2 = "", zeroLine = false, errors = false, refLines = [], fmt = (v) => v.toFixed(2), fmt2 }) {
  const ng0 = groups.length || 1;
  // Wide canvas so long config names fit flat on the x-axis without overlapping.
  const W = Math.max(1100, 56 + 16 + ng0 * 150);
  const H = 300, P = { t: 16, r: 16, b: 56, l: 56 };
  const iH = H - P.t - P.b;
  const ng = groups.length, ns = series.length;
  if (!ng || !ns) return '<p class="empty-note">No chart data.</p>';

  // Optional right-hand axis: a series opts in with axis: 1.
  const hasAxis2 = series.some((s) => s.axis === 1);
  const padR = hasAxis2 ? 52 : P.r;
  const plotW = W - P.l - padR;

  const scale = (vals) => {
    if (!vals.length) return null;
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (zeroLine) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    let span = hi - lo || 1, pad = span * 0.08;
    hi += pad;
    if (lo < 0) lo -= pad;  // only pad below zero when there are genuine negatives
    span = hi - lo;
    return { lo, hi, span };
  };
  const valsByAxis = [[], []];
  series.forEach((s) => {
    const ax = s.axis === 1 ? 1 : 0;
    s.values.forEach((v, i) => {
      if (v != null) valsByAxis[ax].push(v);
      if (errors && s.ci?.[i] && ax === 0) {
        if (s.ci[i][0] != null) valsByAxis[ax].push(s.ci[i][0]);
        if (s.ci[i][1] != null) valsByAxis[ax].push(s.ci[i][1]);
      }
    });
  });
  if (!valsByAxis[0].length && !valsByAxis[1].length) return '<p class="empty-note">No numeric values.</p>';
  const sc0 = scale(valsByAxis[0]) || { lo: 0, hi: 1, span: 1 };
  const sc1 = scale(valsByAxis[1]) || { lo: 0, hi: 1, span: 1 };
  const yOf = (ax) => (v) => P.t + iH - ((v - (ax === 0 ? sc0.lo : sc1.lo)) / (ax === 0 ? sc0.span : sc1.span)) * iH;

  const groupW = plotW / ng;
  const barW = Math.min(28, (groupW * 0.82) / ns);
  const innerPad = (groupW - barW * ns) / 2;

  const axisTicks = (ax) => {
    const sc = ax === 0 ? sc0 : sc1;
    const f = ax === 0 ? fmt : (fmt2 || fmt);
    const y = yOf(ax);
    const x = ax === 0 ? P.l - 6 : W - padR + 6;
    const anchor = ax === 0 ? "end" : "start";
    return [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const v = sc.lo + t * sc.span;
      const yy = y(v).toFixed(1);
      return `<line x1="${P.l}" y1="${yy}" x2="${W - padR}" y2="${yy}" class="grid-line"/>
      <text x="${x}" y="${yy}" class="cmp-axis" text-anchor="${anchor}" dominant-baseline="middle">${f(v)}</text>`;
    }).join("");
  };
  const grid = axisTicks(0) + (hasAxis2 ? axisTicks(1) : "");

  const zLine = zeroLine ? `<line x1="${P.l}" y1="${yOf(0)(0).toFixed(1)}" x2="${W - padR}" y2="${yOf(0)(0).toFixed(1)}" class="cmp-zline"/>` : "";

  // Optional horizontal reference lines (e.g. ±1.96 for t-stats). Drawn on axis 0.
  const refLineSvg = (refLines || []).map((rl) => {
    const yy = yOf(0)(rl.value).toFixed(1);
    const dash = rl.dash ? `stroke-dasharray="${rl.dash}"` : "";
    const lbl = rl.label ? `<text x="${W - padR - 4}" y="${(yy - 4).toFixed(1)}" class="cmp-axis" text-anchor="end">${_esc(rl.label)}</text>` : "";
    return `<line x1="${P.l}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="${rl.color || "var(--muted)"}" stroke-width="1" ${dash} opacity="0.7"/>${lbl}`;
  }).join("");

  let bars = "";
  series.forEach((s, si) => {
    const ax = s.axis === 1 ? 1 : 0;
    const y = yOf(ax);
    const sc = ax === 0 ? sc0 : sc1;
    const f = ax === 0 ? fmt : (fmt2 || fmt);
    groups.forEach((g, gi) => {
      const v = s.values[gi];
      if (v == null) return;
      const gx = P.l + gi * groupW + innerPad + si * barW;
      const top = y(Math.max(v, zeroLine ? 0 : sc.lo));
      const bot = y(Math.min(v, zeroLine ? 0 : sc.lo));
      const h = Math.max(1, Math.abs(bot - top));
      const muted = errors && s.muteIf && s.ci?.[gi] ? s.muteIf(s.ci[gi]) : false;
      const fillAttr = muted
        ? `fill="${s.color}" opacity="0.22" stroke="${s.color}" stroke-width="1" stroke-dasharray="3 2"`
        : `fill="${s.color}" opacity="0.82"`;
      bars += `<rect class="cmp-bar" x="${gx.toFixed(1)}" y="${Math.min(top, bot).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" ${fillAttr} rx="2">
        <title>${_esc(s.label)} · ${_esc(g)}: ${f(v)}</title></rect>`;
      if (errors && s.ci?.[gi] && ax === 0 && s.ci[gi][0] != null && s.ci[gi][1] != null) {
        const [clo, chi] = s.ci[gi];
        const cx = (gx + barW / 2).toFixed(1);
        const ylo = y(clo).toFixed(1), yhi = y(chi).toFixed(1);
        bars += `<line class="cmp-err" stroke="${s.color}" x1="${cx}" y1="${yhi}" x2="${cx}" y2="${ylo}"/>
                 <line class="cmp-err" stroke="${s.color}" x1="${(+cx - 4).toFixed(1)}" y1="${yhi}" x2="${(+cx + 4).toFixed(1)}" y2="${yhi}"/>
                 <line class="cmp-err" stroke="${s.color}" x1="${(+cx - 4).toFixed(1)}" y1="${ylo}" x2="${(+cx + 4).toFixed(1)}" y2="${ylo}"/>`;
      }
    });
  });

  const xticks = groups.map((g, gi) => {
    const cx = P.l + gi * groupW + groupW / 2;
    return `<text x="${cx.toFixed(1)}" y="${H - 10}" class="cmp-xtick" text-anchor="middle">${_esc(g)}</text>`;
  }).join("");

  const legend = series.map((s) =>
    `<span class="cl-item"><span class="cp-dot" style="background:${s.color}"></span>${_esc(s.label)}</span>`
  ).join('<span class="lgd-sep"> · </span>');

  return `<figure class="chart-figure">
  <svg viewBox="0 0 ${W} ${H}" class="cmp-chart" xmlns="http://www.w3.org/2000/svg">
    ${grid}${zLine}${refLineSvg}${bars}${xticks}
  </svg>
  <div class="compare-legend">${legend}</div>
  ${yLabel ? `<p class="chart-note">${_esc(yLabel)}</p>` : ""}
  ${hasAxis2 && yLabel2 ? `<p class="chart-note" style="text-align:right">${_esc(yLabel2)}</p>` : ""}
</figure>`;
}

// runs-as-categories bar chart (one or two metric series across runs)
function buildCmpRunChart({ runs, metrics, zeroLine = false, fmt = (v) => v.toFixed(2), fmt2, yLabel = "", yLabel2 }) {
  // metrics: [{label, color, get: (run) => number|null, axis?: 0|1}]
  return buildCmpBarChart({
    groups: runs.map((r) => r.short),
    series: metrics.map((m) => ({
      label: m.label, color: m.color, axis: m.axis || 0,
      values: runs.map((r) => (r.error ? null : m.get(r))),
    })),
    zeroLine, fmt, fmt2, yLabel, yLabel2,
  });
}

// Per-run wobble chart: x = horizons, per config a vertical min–max range line
// with one dot per K repeat, in the config's colour. Visualises the across-K
// spread of the headline ICIR directly (no mean/std collapse).
function buildCmpWobbleChart({ runs, hk, getRepeats, getEnsemble, yLabel = "", fmt = (v) => v.toFixed(2) }) {
  const W = Math.max(1100, 56 + 16 + Math.max(hk.length, 1) * 150 + runs.length * 8), H = 320, P = { t: 16, r: 16, b: 44, l: 56 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const ng = hk.length, nr = runs.length;
  if (!ng || !nr) return '<p class="empty-note">No chart data.</p>';

  const vals = [];
  runs.forEach((r) => hk.forEach((h) => {
    const reps = getRepeats(r, h);
    if (reps) reps.forEach((v) => { if (v != null) vals.push(v); });
    if (getEnsemble) { const e = getEnsemble(r, h); if (e != null) vals.push(e); }
  }));
  if (!vals.length) return '<p class="empty-note">No per-run data.</p>';
  let lo = Math.min(...vals), hi = Math.max(...vals);
  lo = Math.min(lo, 0); hi = Math.max(hi, 0);
  let span = hi - lo || 1, pad = span * 0.08;
  hi += pad;
  if (lo < 0) lo -= pad;  // only pad below zero when there are genuine negatives
  span = hi - lo;
  const y = (v) => P.t + iH - ((v - lo) / span) * iH;

  const groupW = iW / ng;
  const cfgSlot = groupW / nr;

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = lo + t * span;
    const yy = y(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 6}" y="${yy}" class="cmp-axis" text-anchor="end" dominant-baseline="middle">${fmt(v)}</text>`;
  }).join("");
  const zLine = `<line x1="${P.l}" y1="${y(0).toFixed(1)}" x2="${W - P.r}" y2="${y(0).toFixed(1)}" class="cmp-zline"/>`;

  // Vertical separators between horizon groups (h1|h2|h3) for readability.
  const vseps = Array.from({ length: ng - 1 }, (_, i) => {
    const xx = (P.l + (i + 1) * groupW).toFixed(1);
    return `<line x1="${xx}" y1="${P.t}" x2="${xx}" y2="${P.t + iH}" class="cmp-vsep"/>`;
  }).join("");

  let dots = "";
  runs.forEach((r, ri) => {
    hk.forEach((h, hi) => {
      const reps = getRepeats(r, h);
      if (!reps) return;
      const vs = reps.filter((v) => v != null);
      if (!vs.length) return;
      const cx = P.l + hi * groupW + cfgSlot * (ri + 0.5);
      const mn = Math.min(...vs), mx = Math.max(...vs);
      dots += `<line class="cmp-err" stroke="${r._color}" x1="${cx.toFixed(1)}" y1="${y(mx).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y(mn).toFixed(1)}" opacity="0.45"/>`;
      reps.forEach((v, ki) => {
        if (v == null) return;
        dots += `<circle class="cmp-dot" cx="${cx.toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" fill="${r._color}" opacity="${(0.5 + 0.18 * ki).toFixed(2)}"><title>${_esc(r.short)} · h${h} · r${ki + 1}: ${fmt(v)}</title></circle>`;
      });
      if (getEnsemble) {
        const e = getEnsemble(r, h);
        if (e != null) {
          const ey = y(e).toFixed(1);
          // Diamond marker (rotated square) with dark edge = ensemble mean.
          dots += `<g transform="translate(${cx.toFixed(1)} ${ey})"><rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="${r._color}" stroke="var(--bg, #0d1117)" stroke-width="1.5" opacity="0.95"><title>${_esc(r.short)} · h${h} · ensemble: ${fmt(e)}</title></rect></g>`;
        }
      }
    });
  });

  const xticks = hk.map((h, hi) => {
    const cx = P.l + hi * groupW + groupW / 2;
    return `<text x="${cx.toFixed(1)}" y="${H - 8}" class="cmp-xtick" text-anchor="middle">h${h}</text>`;
  }).join("");

  const legend = runs.map((r) =>
    `<span class="cl-item"><span class="cp-dot" style="background:${r._color}"></span>${_esc(r.short)}</span>`
  ).join('<span class="lgd-sep"> · </span>') + (getEnsemble ? '<span class="lgd-sep"> · </span><span class="cl-item"><span class="cp-diamond"></span>ensemble mean</span>' : '');

  return `<figure class="chart-figure">
  <svg viewBox="0 0 ${W} ${H}" class="cmp-chart" xmlns="http://www.w3.org/2000/svg">
    ${grid}${zLine}${vseps}${dots}${xticks}
  </svg>
  <div class="compare-legend">${legend}</div>
  ${yLabel ? `<p class="chart-note">${_esc(yLabel)}</p>` : ""}
</figure>`;
}

// Layer 3 · output variance line chart: mean score_std per decision date, one
// line per config (config colour). Lower = more reproducible.
function buildCmpScoreStdLineChart({ runs, yLabel = "", fmt = (v) => v.toFixed(2) }) {
  const W = 1100, H = 280, P = { t: 16, r: 16, b: 44, l: 56 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const dateSet = new Set();
  runs.forEach((r) => Object.keys(r.output?.score_std_by_date || {}).forEach((d) => dateSet.add(d)));
  const dates = [...dateSet].sort();
  if (!dates.length) return '<p class="empty-note">No score-std series.</p>';
  const n = dates.length;
  const series = runs.map((r) => ({
    label: r.short, color: r._color,
    values: dates.map((d) => r.output?.score_std_by_date?.[d] ?? null),
  }));
  const vals = series.flatMap((s) => s.values.filter((v) => v != null));
  if (!vals.length) return '<p class="empty-note">No score-std values.</p>';
  let lo = 0, hi = Math.max(...vals);
  let span = hi - lo || 1, pad = span * 0.08;
  hi += pad; span = hi - lo;
  const x = (i) => P.l + (i / Math.max(n - 1, 1)) * iW;
  const y = (v) => P.t + iH - ((v - lo) / span) * iH;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = lo + t * span, yy = y(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 6}" y="${yy}" class="cmp-axis" text-anchor="end" dominant-baseline="middle">${fmt(v)}</text>`;
  }).join("");
  const paths = series.map((s) => {
    const segs = []; let seg = [];
    s.values.forEach((v, i) => {
      if (v != null) seg.push(`${seg.length ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      else if (seg.length) { segs.push(seg.join(" ")); seg = []; }
    });
    if (seg.length) segs.push(seg.join(" "));
    return segs.map((d) => `<path d="${d}" stroke="${s.color}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join("");
  }).join("");
  const dots = series.flatMap((s) => s.values.map((v, i) => v != null
    ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${s.color}"><title>${_esc(s.label)} · ${dates[i]}: ${fmt(v)}</title></circle>` : "")).join("");
  const step = Math.max(1, Math.floor(n / 7));
  const xticks = dates.filter((_, i) => i % step === 0 || i === n - 1)
    .map((d) => `<text x="${x(dates.indexOf(d)).toFixed(1)}" y="${H - 8}" class="cmp-xtick" text-anchor="middle">${d.slice(0, 7)}</text>`).join("");
  const legend = runs.map((r) =>
    `<span class="cl-item"><span class="cp-dot" style="background:${r._color}"></span>${_esc(r.short)}</span>`
  ).join('<span class="lgd-sep"> · </span>');
  return `<figure class="chart-figure">
  <svg viewBox="0 0 ${W} ${H}" class="cmp-chart" xmlns="http://www.w3.org/2000/svg">
    ${grid}${paths}${dots}${xticks}
  </svg>
  <div class="compare-legend">${legend}</div>
  ${yLabel ? `<p class="chart-note">${_esc(yLabel)}</p>` : ""}
</figure>`;
}

// Layer 3 · decision score by ticker, merged across configs. Each config's
// K=3 repeats share the config colour (lighter opacity = later repeat). No
// conviction. Ticker picker mirrors the single-run viewer.
let _cmpScoreChartState = null;
function cmpScoreChartPick(ticker) {
  if (!_cmpScoreChartState) return;
  const plot = document.getElementById("cmpScoreChartPlot");
  const label = document.getElementById("cmpScoreChartTickerLabel");
  if (!plot) return;
  plot.innerHTML = _cmpScoreByTickerSvg(_cmpScoreChartState.runs, ticker) || '<p class="empty-note">No data for this symbol.</p>';
  if (label) label.textContent = ticker;
}

function _cmpScoreTickers(runs) {
  const set = new Set();
  runs.forEach((r) => Object.keys(r.output?.per_run_scores || {}).forEach((rid) =>
    Object.keys(r.output.per_run_scores[rid] || {}).forEach((t) => set.add(t))));
  return [...set].sort();
}

function _cmpScoreByTickerSvg(runs, ticker) {
  const dateSet = new Set();
  runs.forEach((r) => {
    const prs = r.output?.per_run_scores || {};
    Object.keys(prs).forEach((rid) => (prs[rid][ticker] || []).forEach((d) => d.date && dateSet.add(d.date)));
  });
  const dates = [...dateSet].sort();
  if (!dates.length) return "";
  const n = dates.length;
  const series = [];
  runs.forEach((r) => {
    const prs = r.output?.per_run_scores || {};
    Object.keys(prs).forEach((rid, ki) => {
      const byDate = Object.fromEntries((prs[rid][ticker] || []).map((d) => [d.date, d]));
      series.push({
        label: `${r.short} r${ki + 1}`, color: r._color,
        opacity: Math.max(0.3, 1 - ki * 0.3),
        scores: dates.map((d) => byDate[d]?.score ?? null),
      });
    });
  });
  const W = 1100, H = 300, P = { t: 16, r: 16, b: 44, l: 56 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const allV = series.flatMap((s) => s.scores.filter((v) => v != null));
  if (!allV.length) return "";
  let lo = Math.min(...allV, 0), hi = Math.max(...allV, 0);
  let span = hi - lo || 0.2, pad = span * 0.12;
  hi += pad; if (lo < 0) lo -= pad; span = hi - lo;
  const x = (i) => P.l + (i / Math.max(n - 1, 1)) * iW;
  const y = (v) => P.t + iH - ((v - lo) / span) * iH;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = lo + t * span, yy = y(v).toFixed(1);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 6}" y="${yy}" class="cmp-axis" text-anchor="end" dominant-baseline="middle">${v.toFixed(2)}</text>`;
  }).join("");
  const zLine = `<line x1="${P.l}" y1="${y(0).toFixed(1)}" x2="${W - P.r}" y2="${y(0).toFixed(1)}" class="cmp-zline"/>`;
  const paths = series.map((s) => {
    const segs = []; let seg = [];
    s.scores.forEach((v, i) => {
      if (v != null) seg.push(`${seg.length ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      else if (seg.length) { segs.push(seg.join(" ")); seg = []; }
    });
    if (seg.length) segs.push(seg.join(" "));
    return segs.map((d) => `<path d="${d}" stroke="${s.color}" stroke-width="2" fill="none" stroke-linecap="round" opacity="${s.opacity}"/>`).join("");
  }).join("");
  const dots = series.map((s) => s.scores.map((v, i) => v != null
    ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${s.color}" opacity="${s.opacity}"><title>${_esc(s.label)} · ${dates[i]}: ${v.toFixed(2)}</title></circle>` : "").join("")).join("");
  const step = Math.max(1, Math.floor(n / 7));
  const xticks = dates.filter((_, i) => i % step === 0 || i === n - 1)
    .map((d) => `<text x="${x(dates.indexOf(d)).toFixed(1)}" y="${H - 8}" class="cmp-xtick" text-anchor="middle">${d.slice(0, 7)}</text>`).join("");
  const legend = runs.map((r) =>
    `<span class="cl-item"><span class="cp-dot" style="background:${r._color}"></span>${_esc(r.short)}</span>`
  ).join('<span class="lgd-sep"> · </span>');
  return `<figure class="chart-figure">
  <svg viewBox="0 0 ${W} ${H}" class="cmp-chart" xmlns="http://www.w3.org/2000/svg">
    ${grid}${zLine}${paths}${dots}${xticks}
  </svg>
  <div class="compare-legend">${legend}</div>
  <p class="chart-note">3 lines per config = its K=3 repeats (same colour, lighter = later repeat). Score on [-3,+3]; dashed line = zero. No conviction shown.</p>
</figure>`;
}

function buildCmpScoreByTickerChart(runs) {
  if (!runs.length) return "";
  const tickers = _cmpScoreTickers(runs);
  if (!tickers.length) return "";
  const defaultTicker = tickers[0];
  _cmpScoreChartState = { runs };
  const opts = tickers.map((t) => `<option value="${t}"${t === defaultTicker ? " selected" : ""}>${t}</option>`).join("");
  const initial = _cmpScoreByTickerSvg(runs, defaultTicker);
  return `<div class="score-chart-wrap">
    <div class="chart-toolbar">
      <span class="chart-toolbar-label">Showing</span>
      <strong id="cmpScoreChartTickerLabel">${defaultTicker}</strong>
      ${tickers.length > 1 ? `<label class="chart-toolbar-pick">Change
        <select id="cmpScoreChartTicker" onchange="cmpScoreChartPick(this.value)">${opts}</select></label>` : ""}
    </div>
    <div id="cmpScoreChartPlot">${initial || '<p class="empty-note">No data for this symbol.</p>'}</div>
  </div>`;
}

// ── table helpers ───────────────────────────────────────────────────────────
function cmpLegend() {
  return `<div class="compare-legend">${_cmpItems.map((r) =>
    `<span class="cl-item"><span class="cp-dot" style="background:${r._color}"></span>${_esc(r.short)}</span>`
  ).join('<span class="lgd-sep"> · </span>')}</div>`;
}

function cmpTable(rowDefs) {
  // rowDefs: [{ label, cells: [html per run], tone?: "best"|"na" }]
  const head = `<thead><tr><th>Field</th>${_cmpItems.map((r) =>
    `<th><span class="cmp-rowlabel"><span class="cp-dot" style="background:${r._color}"></span>${_esc(r.short)}</span></th>`).join("")}</tr></thead>`;
  const body = rowDefs.map((rd) =>
    `<tr><td>${rd.label}</td>${rd.cells.map((c) => `<td>${c}</td>`).join("")}</tr>`
  ).join("");
  return `<div class="table-wrap mini-table cmp-table-wrap"><table class="cmp-table">${head}<tbody>${body}</tbody></table></div>`;
}

function kpiPlaceholder(label, note) {
  return `<div class="kpi-placeholder">
    <span class="kpi-tag">KPI · ${_esc(label)}</span>
    <span class="kpi-text"><strong>not yet scored</strong> — <em>${_esc(note)}</em></span>
  </div>`;
}

// Horizons shown across the compare report. Controlled by #cmpMaxHorizon
// (default h1 — primary inference horizon). Longer horizons are overlap-biased
// at small T — leave them opt-in rather than hard-masked.
function cmpHorizonKeys(available) {
  const sel = $("#cmpMaxHorizon");
  const maxH = Math.max(1, Math.min(4, Number(sel?.value || 1) || 1));
  const want = [];
  for (let h = 1; h <= maxH; h++) want.push(String(h));
  const avail = new Set((available || []).map(String));
  return want.filter((h) => avail.has(h));
}

// ── layer renderers ─────────────────────────────────────────────────────────
function renderCompare() {
  const cont = $("#compareSections");
  const runs = _cmpItems;
  const errs = runs.filter((r) => r.error);
  const good = runs.filter((r) => !r.error);
  const allHk = good.length ? Object.keys(good[0].horizons || {}) : [];
  const horizonKeys = cmpHorizonKeys(allHk);

  cont.innerHTML = [
    cmpLegend(),
    errs.length ? `<div class="kpi-placeholder"><span class="kpi-tag">errors</span><span class="kpi-text">${errs.map((r) => `${_esc(r.short)}: ${_esc(r.error)}`).join(" · ")}</span></div>` : "",
    renderCmpLayer1(good, horizonKeys),
    renderCmpBetas(good),
    renderCmpLayer2(good, horizonKeys),
    renderCmpLayer3(good),
    renderCmpCoherenceSoph(good),
    renderCmpCrossConfig(good),
  ].join("");

  // Wire illustrative-returns field cells (Layer 2) and kick off first fetch.
  const fields = $("#cmpWeightFields");
  if (fields) {
    fields.querySelectorAll("input, select").forEach((el) => {
      if (el.id === "cmpRetMode") return; // handled via onchange
      el.addEventListener("change", scheduleCmpIllustrativeReturns);
      if (el.tagName === "INPUT") el.addEventListener("input", scheduleCmpIllustrativeReturns);
    });
    cmpIllusModeChanged({ skipFetch: true });
    refreshCmpIllustrativeReturns();
  }
}

function renderCmpLayer1(runs, hk) {
  if (!runs.length) return "";
  const sortH = cmpFurthestH(hk);
  const sortNote = cmpSortNoteH(sortH);

  // Tier badge helper — shared between Layer 1 and Layer 2
  const tierBadge = (tier) => {
    if (!tier) return "";
    const cls = tier === "primary" ? "tier-primary" : tier === "supporting" ? "tier-supporting" : "tier-descriptive";
    return ` <span class="tier-badge ${cls}" title="Inference tier: ${tier}">${tier[0].toUpperCase()}</span>`;
  };

  // ── Residual performance table — lean face (symmetric with Layer 2) ──────
  // Combined pre→post cell: shows agent/ensemble (pre-neutralisation) →
  // residual (post-neutralisation) in one cell so the factor-neutralisation
  // effect is visible at a glance. Δ = post − pre.
  const prePostCell = (pre, post, d, postFlag = "") => {
    const p = _num(pre), q = _num(post);
    if (p == null && q == null) return _fmt(null, d);
    const delta = (p != null && q != null) ? (q - p) : null;
    const deltaStr = delta != null
      ? ` <span class="cmp-delta ${delta < 0 ? "neg" : "pos"}" title="post − pre (neutralisation effect)">${delta >= 0 ? "+" : ""}${delta.toFixed(d)}</span>`
      : "";
    return `<span class="cmp-prepost" title="pre (before neutralisation) → post (factor-neutralised residual)"><span class="cmp-pre">${_fmt(pre, d)}</span><span class="cmp-arrow">→</span><span class="cmp-post">${_fmt(post, d)}${postFlag}</span>${deltaStr}</span>`;
  };

  const rows = [];
  hk.forEach((h) => {
    // Combined pre→post mean IC (agent → residual): the neutralisation headline
    rows.push({
      label: `h${h} mean IC (pre→post)`,
      cells: runs.map((r) => prePostCell(r.horizons[h]?.agent_ic, r.horizons[h]?.residual_mean_ic, 4)),
    });
    // Combined pre→post NW t (ensemble → residual): significance before vs after
    rows.push({
      label: `h${h} NW t (pre→post)`,
      cells: runs.map((r) => {
        const hb = r.horizons[h] || {};
        const postT = hb.residual_nw_t;
        let flag = "";
        if (postT != null && isFinite(postT)) {
          const tier = hb.residual_inference_tier;
          flag = tier === "descriptive" ? "" : (Math.abs(postT) >= 3 ? " ★" : Math.abs(postT) >= 1.96 ? " ✓" : "");
        }
        return prePostCell(hb.ens_mean_ic_nw_t, postT, 2, flag);
      }),
    });
    // Residual IC face detail (post-neutralisation)
    rows.push({ label: `h${h} residual median IC`, cells: runs.map((r) => _fmt(r.horizons[h]?.residual_median_ic, 4)) });
    rows.push({ label: `h${h} residual IC IQR`, cells: runs.map((r) => _fmt(r.horizons[h]?.residual_ic_iqr, 4)) });
    rows.push({ label: `h${h} residual pos frac`, cells: runs.map((r) => _fmt(r.horizons[h]?.residual_positive_fraction, 2)) });
    rows.push({
      label: `h${h} residual sign test p`,
      cells: runs.map((r) => {
        const p = r.horizons[h]?.residual_sign_test_p;
        if (p == null) return _fmt(null, 3);
        const tier = r.horizons[h]?.residual_inference_tier;
        const flag = tier === "descriptive" ? "" : (p < 0.05 ? " ✓" : "");
        return `<span title="Binomial sign test on residual IC (one-sided)${flag ? ' · ✓<0.05' : ''}">${_fmt(p, 3)}${flag}</span>`;
      }),
    });
    // Decomposition context: how the agent IC splits into factor + residual
    rows.push({ label: `h${h} factor-explained IC`, cells: runs.map((r) => _fmt(r.horizons[h]?.factor_explained_ic, 4)) });
    rows.push({ label: `h${h} residual var share (1−R²)`, cells: runs.map((r) => _fmt(r.horizons[h]?.residual_var_share, 3)) });
    // Secondary stability
    rows.push({ label: `h${h} residual raw ICIR (sec.)`, cells: runs.map((r) => _fmt(r.horizons[h]?.residual_raw_icir, 2)) });
    rows.push({ label: `h${h} residual ICIR (sec.)`, cells: runs.map((r) => _fmt(r.horizons[h]?.residual_icir, 2)) });
    rows.push({ label: `h${h} factor-explained ICIR`, cells: runs.map((r) => _fmt(r.horizons[h]?.factor_explained_icir, 2)) });
  });

  // ── Charts ──────────────────────────────────────────────────────────────
  // Step 1 · Combined pre→post mean IC at the sort horizon — neutralisation
  // gap per config. Grey = agent (pre), orange = residual (post). The drop =
  // what the factor bundle explains.
  const byPpIc = cmpSortBy(runs, (r) => r.horizons[sortH]?.residual_mean_ic, { higherIsBetter: true });
  const ppIcChart = buildCmpRunChart({
    runs: byPpIc,
    metrics: [
      { label: `pre · agent (h${sortH})`, color: "var(--muted)", get: (r) => r.horizons[sortH]?.agent_ic ?? null },
      { label: `post · residual (h${sortH})`, color: "var(--accent)", get: (r) => r.horizons[sortH]?.residual_mean_ic ?? null },
    ],
    zeroLine: true, fmt: (v) => v.toFixed(3),
    yLabel: `Pre (agent, before neutralisation) vs post (residual, factor-neutralised) mean IC at h${sortH}. Gap = factor-explained share. ${sortNote}`,
  });

  // Step 2 · Combined pre→post NW t at the sort horizon — significance lost to
  // neutralisation. Grey = ensemble (pre), orange = residual (post).
  const byPpNw = cmpSortBy(runs, (r) => r.horizons[sortH]?.residual_nw_t, { higherIsBetter: true });
  const ppNwChart = buildCmpBarChart({
    groups: byPpNw.map((r) => r.short),
    series: [
      { label: `pre · ensemble (h${sortH})`, color: "var(--muted)", values: byPpNw.map((r) => r.horizons[sortH]?.ens_mean_ic_nw_t ?? null) },
      { label: `post · residual (h${sortH})`, color: "var(--accent)", values: byPpNw.map((r) => r.horizons[sortH]?.residual_nw_t ?? null) },
    ],
    yLabel: `Pre (ensemble) vs post (residual) NW t at h${sortH} — significance before vs after factor neutralisation. ±1.96 = 95%, +3.0 = credible. ${sortNote}`,
    zeroLine: true, fmt: (v) => v.toFixed(2),
    refLines: [
      { value: 1.96, label: "1.96 · 95%", color: "var(--muted)", dash: "5 3" },
      { value: -1.96, label: "−1.96", color: "var(--muted)", dash: "5 3" },
      { value: 3.0, label: "3.0 · credible", color: "var(--muted)", dash: "2 4" },
    ],
  });

  // Step 3 · residual mean IC across horizons — the primary performance magnitude
  const byResidIc = cmpSortBy(runs, (r) => r.horizons[sortH]?.residual_mean_ic, { higherIsBetter: true });
  const icChart = buildCmpBarChart({
    groups: hk.map((h) => `h${h}`),
    series: byResidIc.map((r) => ({
      label: r.short, color: r._color,
      values: hk.map((h) => r.horizons[h]?.residual_mean_ic ?? null),
    })),
    yLabel: `Residual mean IC by horizon — factor-neutralised alpha magnitude. This is what the NW t tests. ${sortNote}`,
    zeroLine: true, fmt: (v) => v.toFixed(3),
  });

  // Step 4 · NW t on residual mean IC across horizons — significance
  const byResidNw = cmpSortBy(runs, (r) => r.horizons[sortH]?.residual_nw_t, { higherIsBetter: true });
  const nwChart = buildCmpBarChart({
    groups: hk.map((h) => `h${h}`),
    series: byResidNw.map((r) => ({
      label: r.short, color: r._color,
      values: hk.map((h) => r.horizons[h]?.residual_nw_t ?? null),
    })),
    yLabel: `Residual mean-IC NW t (HAC, lag = h−1) — significance. ±1.96 = 95%, +3.0 = credible. ${sortNote}`,
    zeroLine: true, fmt: (v) => v.toFixed(2),
    refLines: [
      { value: 1.96, label: "1.96 · 95%", color: "var(--muted)", dash: "5 3" },
      { value: -1.96, label: "−1.96", color: "var(--muted)", dash: "5 3" },
      { value: 3.0, label: "3.0 · credible", color: "var(--muted)", dash: "2 4" },
    ],
  });

  // Step 5 · residual sign test p — non-parametric falsification
  const byResidSign = cmpSortBy(runs, (r) => r.horizons[sortH]?.residual_sign_test_p, { higherIsBetter: false });
  const signChart = buildCmpBarChart({
    groups: hk.map((h) => `h${h}`),
    series: byResidSign.map((r) => ({
      label: r.short, color: r._color,
      values: hk.map((h) => {
        const p = r.horizons[h]?.residual_sign_test_p;
        return p != null ? p : null;
      }),
    })),
    yLabel: `Residual sign test p-value (binomial, one-sided) — lower = more reliably positive. 0.05 line = 95%. ${sortNote}`,
    zeroLine: false, fmt: (v) => v.toFixed(3),
    refLines: [
      { value: 0.05, label: "0.05 · 95%", color: "var(--muted)", dash: "5 3" },
    ],
  });

  // Tier badges in horizon labels
  const tierLabels = hk.map((h) => `h${h}${runs[0]?.horizons[h]?.residual_inference_tier ? tierBadge(runs[0].horizons[h].residual_inference_tier) : ""}`);

  return `<section class="report-section">
    <h2 class="section-title">Layer 1 · Residual performance (factor-neutralised alpha) <span class="tier-badge tier-primary" style="font-size:0.6rem">lean</span></h2>
    <p class="chart-footnote">Factor- + sector-neutralised alpha: each date the agent signal is regressed (Fama–MacBeth) on style factors + GICS sector dummies; the <em>residual</em> is the orthogonalised alpha. <strong>Primary face:</strong> residual mean IC + non-parametric sign test (does the alpha beat a coin flip across periods?). <strong>Secondary:</strong> ICIR (annualised stability, descriptive at T≈15). Inference tiers: P=primary (h1), S=supporting (h2), D=descriptive (h3–h4, no significance stars). Decomposition rows show agent IC → factor-explained IC + residual IC.</p>
    ${cmpTable(rows)}
    <div class="chart-block"><h3 class="chart-title">Step 1 · Mean IC pre→post (h${sortH}) — factor-neutralisation gap per config</h3>${ppIcChart}</div>
    <div class="chart-block"><h3 class="chart-title">Step 2 · NW t pre→post (h${sortH}) — significance before vs after neutralisation</h3>${ppNwChart}</div>
    <div class="chart-block"><h3 class="chart-title">Step 3 · Residual mean IC by horizon — factor-neutralised alpha magnitude</h3>${icChart}</div>
    <div class="chart-block"><h3 class="chart-title">Step 4 · Residual NW t by horizon — significance (±1.96, +3.0)</h3>${nwChart}</div>
    <div class="chart-block"><h3 class="chart-title">Step 5 · Residual sign test p — non-parametric reliability</h3>${signChart}</div>
  </section>`;
}

function renderCmpLayer2(runs, hk) {
  if (!runs.length) return "";

  const sortH = cmpFurthestH(hk);
  const sortNote = cmpSortNoteH(sortH);

  // ── Ensemble (mean IC + NW t; soft-keeps: pos frac, sign test, tercile, placebos)
  // Per-run IC dots live on the ensemble chart below (no separate wobble table).
  const tierBadge = (tier) => {
    if (!tier) return "";
    const cls = tier === "primary" ? "tier-primary" : tier === "supporting" ? "tier-supporting" : "tier-descriptive";
    return ` <span class="tier-badge ${cls}" title="Inference tier: ${tier} (${tier === 'primary' ? 'provisional significance' : tier === 'supporting' ? 'marginal inference' : 'effect-size only, no significance'})">${tier[0].toUpperCase()}</span>`;
  };
  const ensRows = [];
  hk.forEach((h) => {
    const tier = runs[0]?.horizons[h]?.inference_tier;
    const tierB = tierBadge(tier);
    ensRows.push({ label: `h${h} mean IC${tierB}`, cells: runs.map((r) => _fmt(r.horizons[h]?.ensemble_mean_ic, 3)) });
    ensRows.push({ label: `h${h} positive frac`, cells: runs.map((r) => _fmt(r.horizons[h]?.ensemble_positive_fraction, 2)) });
    ensRows.push({
      label: `h${h} sign test p`,
      cells: runs.map((r) => {
        const p = r.horizons[h]?.ensemble_sign_test_p;
        if (p == null) return _fmt(null, 3);
        const t = r.horizons[h]?.inference_tier;
        const flag = t === "descriptive" ? "" : (p < 0.05 ? " ✓" : "");
        return `<span title="Binomial sign test (one-sided, H0: p=0.5)${flag ? ' · ✓<0.05' : ''} · tier=${t}">${_fmt(p, 3)}${flag}</span>`;
      }),
    });
    ensRows.push({
      label: `h${h} NW t (mean IC)`,
      cells: runs.map((r) => {
        const t = r.horizons[h]?.ens_mean_ic_nw_t;
        if (t == null || !isFinite(t)) return _fmt(t, 2);
        const tier = r.horizons[h]?.inference_tier;
        const flag = tier === "descriptive" ? "" : (Math.abs(t) >= 3 ? " ★" : Math.abs(t) >= 1.96 ? " ✓" : "");
        return `<span title="NW t (HAC lag=h−1) · tier=${tier} · ✓≥1.96 (95%) ★≥3 (credible)">${_fmt(t, 2)}${flag}</span>`;
      }),
    });
    const ts = (r) => r.horizons[h]?.rank_metrics?.tercile_spread;
    ensRows.push({ label: `h${h} tercile spread (T−B)`, cells: runs.map((r) => _fmt(ts(r)?.mean, 4)) });
    if (tier !== "descriptive") {
      ensRows.push({
        label: `h${h} permutation p`,
        cells: runs.map((r) => {
          const p = r.horizons[h]?.sanity_checks?.permutation_test?.p_value;
          if (p == null) return _fmt(null, 3);
          const flag = p < 0.05 ? " ✓" : "";
          return `<span title="Within-date score permutation placebo (500 resamples)${flag ? ' · ✓<0.05 signal is real' : ''}">${_fmt(p, 3)}${flag}</span>`;
        }),
      });
      ensRows.push({
        label: `h${h} date-shift placebo IC`,
        cells: runs.map((r) => _fmt(r.horizons[h]?.sanity_checks?.date_shift_placebo?.mean_placebo_ic, 3)),
      });
    }
    ensRows.push({ label: `h${h} n_periods`, cells: runs.map((r) => _fmt(r.horizons[h]?.n_periods, 0)) });
  });

  const byEnsMeanIc = cmpSortBy(runs, (r) => r.horizons[sortH]?.ensemble_mean_ic, { higherIsBetter: true });
  const stepA = buildCmpWobbleChart({
    runs: byEnsMeanIc, hk,
    getRepeats: (r, h) => r.horizons[h]?.per_run_ic || null,
    getEnsemble: (r, h) => r.horizons[h]?.ensemble_mean_ic ?? null,
    yLabel: `Ensemble vs single-run IC: dots = per-run rank-IC, ◆ = ensemble mean IC. Averaging cancels uncorrelated cross-run noise when paths diverge. ${sortNote}`,
    fmt: (v) => v.toFixed(3),
  });

  const byEnsNw = cmpSortBy(runs, (r) => r.horizons[sortH]?.ens_mean_ic_nw_t, { higherIsBetter: true });
  const stepNw = buildCmpBarChart({
    groups: hk.map((h) => `h${h}`),
    series: byEnsNw.map((r) => ({
      label: r.short, color: r._color,
      values: hk.map((h) => r.horizons[h]?.ens_mean_ic_nw_t ?? null),
    })),
    yLabel: `NW t on ensemble mean IC (HAC, lag = h−1) — significance. ±1.96 = 95% bar; +3.0 = multiple-testing-credible. h1 (lag 0) is the cleanest inference; h2–h4 eat effective df as lag grows. ${sortNote}`,
    zeroLine: true, fmt: (v) => v.toFixed(2),
    refLines: [
      { value: 1.96, label: "+1.96 · 95%", dash: "5 3", color: "var(--muted)" },
      { value: -1.96, label: "−1.96 · 95%", dash: "5 3", color: "var(--muted)" },
      { value: 3.0, label: "+3.0 · credible", dash: "2 4", color: "var(--muted)" },
    ],
  });

  const byTercile = cmpSortBy(runs, (r) => r.horizons[sortH]?.rank_metrics?.tercile_spread?.mean, { higherIsBetter: true });
  const tercileChart = buildCmpBarChart({
    groups: hk.map((h) => `h${h}`),
    series: byTercile.map((r) => ({
      label: r.short, color: r._color,
      values: hk.map((h) => r.horizons[h]?.rank_metrics?.tercile_spread?.mean ?? null),
    })),
    yLabel: `Tercile spread (top−bottom forward return) by horizon — matches where capital is deployed in a long-top / short-bottom book. Zero line = no tail edge. ${sortNote}`,
    zeroLine: true, fmt: (v) => v.toFixed(4),
  });

  const bySign = cmpSortBy(runs, (r) => r.horizons[sortH]?.ensemble_sign_test_p, { higherIsBetter: false });
  const signTestChart = buildCmpBarChart({
    groups: hk.map((h) => `h${h}`),
    series: bySign.map((r) => ({
      label: r.short, color: r._color,
      values: hk.map((h) => {
        const p = r.horizons[h]?.ensemble_sign_test_p;
        return p != null ? p : null;
      }),
    })),
    yLabel: `Sign test p-value (binomial, one-sided) — lower = more reliably positive IC. 0.05 line = 95%. Non-parametric complement to NW t. ${sortNote}`,
    zeroLine: false, fmt: (v) => v.toFixed(3),
    refLines: [
      { value: 0.05, label: "0.05 · 95%", dash: "5 3", color: "var(--muted)" },
    ],
  });

  const illusBlock = buildCmpIllustrativeReturnsShell(runs);

  return `<section class="report-section">
    <h2 class="section-title">Layer 2 · Performance &amp; variance <span class="tier-badge tier-primary" style="font-size:0.6rem">lean methodology</span></h2>
    <p class="chart-footnote">Primary face: ensemble mean RankIC + NW <em>t</em> (does the averaged signal rank?). Soft checks: positive fraction / sign test, tercile spread (tail edge), permutation + date-shift placebos (h1/h2). Inference tiers: P=primary (h1), S=supporting (h2), D=descriptive (h3–h4, no significance stars). Raw, factor-uncontrolled — standalone predictive power; residual additivity is Layer 1.</p>

    ${illusBlock}

    <h3 class="chart-title" style="margin-top:0.8rem">2a · Ensemble — averaged-signal quality</h3>
    <p class="chart-footnote">Equal-weight average of the K transformed scores per (date × ticker). Headline = mean IC + NW <em>t</em> on that object; dots = per-run IC, ◆ = ensemble (whether pooling lifts a typical draw).</p>
    ${cmpTable(ensRows)}
    <div class="chart-block"><h3 class="chart-title">Ensemble vs single-run IC</h3>${stepA}</div>
    <div class="chart-block"><h3 class="chart-title">NW t on mean IC — significance (±1.96, +3.0)</h3>${stepNw}</div>

    <h3 class="chart-title" style="margin-top:0.8rem">2b · Tercile spread — tail edge</h3>
    <p class="chart-footnote">RankIC weights every rank equally. Tercile spread = mean(top-tercile forward return) − mean(bottom-tercile), averaged over dates — closer to a long-top / short-bottom book.</p>
    <div class="chart-block"><h3 class="chart-title">Tercile spread (top−bottom) by horizon</h3>${tercileChart}</div>

    <h3 class="chart-title" style="margin-top:0.8rem">2c · Sign test — non-parametric complement</h3>
    <p class="chart-footnote">Binomial sign test on the fraction of positive-IC periods. Valid at all horizons; complements NW <em>t</em>.</p>
    <div class="chart-block"><h3 class="chart-title">Sign test p-value by horizon</h3>${signTestChart}</div>

    <div class="layer-footnote">
      <h4 class="layer-footnote-title">How each metric in this layer is computed &amp; what it captures</h4>
      <dl class="glossary-dl">
        <dt>IC (rank-IC)</dt><dd>Spearman correlation between the agent's cross-sectional score and the realised forward return across the 30-name universe, for one decision date at one horizon. Computed per (run × date × horizon). Captures raw predictive strength on that date. Rule of thumb (liquid universe): mean IC ~0.02 marginal, 0.04–0.06 real (most academic factors), 0.08–0.12 strong, &gt;0.15 suspicious (look-ahead, unneutralised factor exposure, or overfitting).</dd>
        <dt>per-run (r1/r2/r3)</dt><dd>The same frozen config run K times. Each repeat is an independent draw on identical inputs. Spread across repeats = agent stochasticity on ranking skill, not data drift.</dd>
        <dt>ensemble mean IC</dt><dd>Mean RankIC of the signal <em>averaged across the K repeats</em>. Each run's cross-section is rank-mapped to [−3,+3], then equal-weight averaged per (date × ticker); RankIC is computed on that ensemble series. Equal-weight is the default at small K (forecast-combination puzzle: simple averages routinely beat optimally-weighted combos out-of-sample).</dd>
        <dt>NW t (mean IC)</dt><dd>Newey–West (HAC, lag = h−1) t-statistic on the ensemble mean IC — the layer's inference face. Captures whether mean predictive strength is reliably positive, with overlap-robust standard errors. Convention: ✓ = |t| ≥ 1.96 (95% two-sided); ★ = |t| ≥ 3 (multiple-testing-credible per Harvey–Liu–Zhu 2016). h1 (lag 0) is the cleanest inference.</dd>
        <dt>positive frac / sign test</dt><dd>Fraction of periods with positive IC, and a one-sided binomial test vs 0.5. Non-parametric complement to NW <em>t</em>.</dd>
        <dt>tercile spread</dt><dd>Mean(top-tercile forward return) − mean(bottom-tercile), per date, averaged. Tail edge where a long/short book concentrates capital.</dd>
        <dt>n_periods</dt><dd>T = number of decision dates with scored forward returns at that horizon (shrinks with h). At T≈12–15 inference is fragile — quote NW <em>t</em>, not ratio metrics.</dd>
        <dt>illustrative returns</dt><dd>Cumulative NAV under a chosen weighting rule (active_budget / long-short N / cost_bps). Shows run-band wobble vs ensemble path across configs — a variance + implementation sandbox, not the RankIC headline.</dd>
      </dl>
      <p class="layer-footnote-note"><strong>Ensemble logic.</strong> Averaging imperfectly correlated run paths diversifies run-level stochasticity (Bates &amp; Granger 1969; bagging). These K runs are stochastic replicas of one config (same inputs), not independent information sources — so the lift is noise-cancellation, not √K new alpha. Positive lift vs a typical single run supports holding the ensemble in eval <em>and</em> live; flat/negative lift means paths co-moved and equal-weight buys little.</p>
      <p class="layer-footnote-note"><strong>What is not yet controlled.</strong> These are raw, factor-uncontrolled ICs — known factor exposure has not been stripped; residual additivity is Layer 1.</p>
    </div>
  </section>`;
}

// ── Illustrative cumulative returns (weighting sandbox) ─────────────────────
let _cmpIllusTimer = null;
let _cmpIllusPayload = null;

function buildCmpIllustrativeReturnsShell(runs) {
  const wobbleOpts = [`<option value="">none</option>`]
    .concat(runs.map((r) => `<option value="${_esc(r.batch)}">${_esc(r.short)}</option>`))
    .join("");
  return `
    <h3 class="chart-title" style="margin-top:0.4rem">Illustrative cumulative returns — weighting sandbox</h3>
    <p class="chart-footnote">Compound a simple portfolio from the agent signal vs a chosen benchmark. <strong>Active weight (OW/UW)</strong> tilts on top of that benchmark. Default benchmark = price-weighted DJIA (validated ≈ DIA). Chart-only — not a portfolio claim. Signals use <code>rank_range</code> then K-average.</p>
    <div class="cmp-weight-fields" id="cmpWeightFields">
      <label>Benchmark
        <select id="cmpRetBench" title="Base portfolio OW/UW tilts against">
          <option value="djia_pw" selected>price-weighted DJIA</option>
          <option value="ew">equal-weight</option>
        </select>
      </label>
      <label>Mode
        <select id="cmpRetMode" onchange="cmpIllusModeChanged()">
          <option value="active_weight" selected>active weight (OW/UW)</option>
          <option value="long_short">long / short</option>
          <option value="long_only">long-only (score ∝)</option>
        </select>
      </label>
      <label id="cmpRetBudgetWrap">active_budget
        <input id="cmpRetBudget" type="number" min="0" max="5" step="0.1" value="0.5" title="Tilt strength vs chosen benchmark">
      </label>
      <label id="cmpRetLongWrap" class="cmp-weight-hidden">long_n
        <input id="cmpRetLongN" type="number" min="1" max="30" step="1" value="10" title="Names in long leg">
      </label>
      <label id="cmpRetShortWrap" class="cmp-weight-hidden">short_n
        <input id="cmpRetShortN" type="number" min="1" max="30" step="1" value="10" title="Names in short leg">
      </label>
      <label>cost_bps
        <input id="cmpRetCost" type="number" min="0" max="100" step="1" value="0" title="One-way cost in bps × two-way turnover">
      </label>
      <label>show run wobble
        <select id="cmpRetWobble">${wobbleOpts}</select>
      </label>
      <button type="button" class="btn-primary" id="cmpRetRefreshBtn" onclick="refreshCmpIllustrativeReturns()">Refresh</button>
    </div>
    <div class="chart-block" id="cmpIllusReturnsBlock">
      <p class="empty-note">Loading illustrative returns…</p>
    </div>`;
}

function cmpIllusModeChanged(opts = {}) {
  const mode = $("#cmpRetMode")?.value || "active_weight";
  const budget = $("#cmpRetBudgetWrap");
  const ln = $("#cmpRetLongWrap");
  const sn = $("#cmpRetShortWrap");
  if (budget) budget.classList.toggle("cmp-weight-hidden", mode !== "active_weight");
  if (ln) ln.classList.toggle("cmp-weight-hidden", mode !== "long_short");
  if (sn) sn.classList.toggle("cmp-weight-hidden", mode !== "long_short");
  if (!opts.skipFetch) scheduleCmpIllustrativeReturns();
}

function scheduleCmpIllustrativeReturns() {
  if (_cmpIllusTimer) clearTimeout(_cmpIllusTimer);
  _cmpIllusTimer = setTimeout(() => refreshCmpIllustrativeReturns(), 280);
}

function cmpIllusParamsFromFields() {
  return {
    mode: $("#cmpRetMode")?.value || "active_weight",
    benchmark: $("#cmpRetBench")?.value || "djia_pw",
    active_budget: Number($("#cmpRetBudget")?.value ?? 0.5),
    cost_bps: Number($("#cmpRetCost")?.value ?? 0),
    long_n: Number($("#cmpRetLongN")?.value ?? 10),
    short_n: Number($("#cmpRetShortN")?.value ?? 10),
    wobble: $("#cmpRetWobble")?.value || "",
  };
}

async function refreshCmpIllustrativeReturns() {
  const block = $("#cmpIllusReturnsBlock");
  if (!block) return;
  const runs = (_cmpItems || []).filter((r) => !r.error);
  if (!runs.length) {
    block.innerHTML = '<p class="empty-note">No configs selected.</p>';
    return;
  }
  const p = cmpIllusParamsFromFields();
  const batches = runs.map((r) => r.batch).join(",");
  const qs = new URLSearchParams({
    batches,
    mode: p.mode,
    benchmark: p.benchmark,
    active_budget: String(p.active_budget),
    cost_bps: String(p.cost_bps),
    long_n: String(p.long_n),
    short_n: String(p.short_n),
  });
  block.innerHTML = '<p class="empty-note">Refreshing…</p>';
  try {
    const res = await fetch(`/api/analytics/compare_returns?${qs.toString()}`);
    const payload = await res.json();
    if (!res.ok || payload.error) throw new Error(payload?.error || `HTTP ${res.status}`);
    _cmpIllusPayload = payload;
    // Attach compare colours by batch
    const colorByBatch = Object.fromEntries(runs.map((r) => [r.batch, r._color]));
    (payload.configs || []).forEach((c) => { c._color = colorByBatch[c.batch] || theme.accentStrong; });
    block.innerHTML = buildCmpMultiReturnChart(payload, p.wobble);
  } catch (err) {
    block.innerHTML = `<p class="empty-note">Failed to load returns: ${_esc(err.message)}</p>`;
  }
}

function buildCmpMultiReturnChart(payload, wobbleBatch) {
  const dates = payload.dates || [];
  const configs = (payload.configs || []).filter((c) => !c.error && c.ensemble?.length);
  const bench = payload.benchmark || [];
  if (!dates.length || !configs.length) {
    return `<p class="empty-note">${_esc(payload.error || "No return series.")}</p>`;
  }
  const n = dates.length;
  const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

  // End-of-line label text (used to size the right margin so nothing truncates).
  const labelTexts = configs.map((c) => {
    const pct = ((c.ensemble[n - 1] - 1) * 100);
    const lo = c.end_run_min != null ? ((c.end_run_min - 1) * 100) : null;
    const hi = c.end_run_max != null ? ((c.end_run_max - 1) * 100) : null;
    const band = (lo != null && hi != null) ? `  [${fmtPct(lo)}…${fmtPct(hi)}]` : "";
    return `${c.short}  ${fmtPct(pct)}${band}`;
  });
  if (bench.length === n) {
    const pct = ((bench[n - 1] - 1) * 100);
    const name = payload.benchmark_label || payload.params?.benchmark_label || "benchmark";
    labelTexts.push(`${name}  ${fmtPct(pct)}`);
  }
  // ~7px/char at 11px + leader line padding
  const labelW = Math.max(220, Math.min(420, 18 + Math.max(...labelTexts.map((t) => t.length)) * 7));
  const W = Math.max(1400, 56 + labelW + Math.max(n, 8) * 36);
  const H = 460, P = { t: 22, r: labelW, b: 44, l: 58 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;

  const allV = configs.flatMap((c) => {
    const vs = c.ensemble.slice();
    if (wobbleBatch && c.batch === wobbleBatch) {
      (c.runs || []).forEach((r) => vs.push(...(r.values || [])));
    }
    return vs;
  }).concat(bench);
  const lo = Math.min(...allV), hi = Math.max(...allV), span = hi - lo || 0.01, pad = span * 0.06;
  const x = (i) => P.l + (i / Math.max(n - 1, 1)) * iW;
  const y = (v) => P.t + iH - ((v - lo + pad) / (span + 2 * pad)) * iH;
  const toPath = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = lo - pad + t * (span + 2 * pad);
    const yy = y(v).toFixed(1);
    const pct = Math.round((v - 1) * 100);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>
    <text x="${P.l - 5}" y="${yy}" class="axis-label" text-anchor="end" dominant-baseline="middle">${pct >= 0 ? "+" : ""}${pct}%</text>`;
  }).join("");
  const step = Math.max(1, Math.floor(n / 6));
  const xLabels = dates.filter((_, i) => i % step === 0 || i === n - 1).map((d) => {
    const i = dates.indexOf(d);
    return `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="axis-label" text-anchor="middle">${d.slice(0, 7)}</text>`;
  }).join("");

  let band = "";
  let runPaths = "";
  if (wobbleBatch) {
    const cfg = configs.find((c) => c.batch === wobbleBatch);
    const runs = (cfg?.runs || []).filter((r) => r.values?.length === n);
    if (runs.length >= 2) {
      const mins = Array.from({ length: n }, (_, i) => Math.min(...runs.map((s) => s.values[i])));
      const maxs = Array.from({ length: n }, (_, i) => Math.max(...runs.map((s) => s.values[i])));
      const fwd = mins.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      const rev = [...maxs].reverse().map((v, i) => `L${x(n - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      band = `<path d="${fwd} ${rev} Z" class="ci-band"/>`;
      runPaths = runs.map((s) =>
        `<path d="${toPath(s.values)}" stroke="${cfg._color || theme.accent2}" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="3 3" fill="none"/>`
      ).join("");
    }
  }

  const ensPaths = configs.map((c) =>
    `<path d="${toPath(c.ensemble)}" stroke="${c._color || theme.accentStrong}" stroke-width="2.25" fill="none" stroke-linecap="round"/>`
  ).join("");
  const benchPath = bench.length === n
    ? `<path d="${toPath(bench)}" stroke="${theme.muted}" stroke-width="1.5" stroke-dasharray="5 3" fill="none"/>`
    : "";

  // End-of-line labels: name + ensemble % + K-run [min…max], deconflicted vertically.
  const endMarks = configs.map((c) => {
    const endV = c.ensemble[n - 1];
    const pct = (endV - 1) * 100;
    const loPct = c.end_run_min != null ? ((c.end_run_min - 1) * 100) : null;
    const hiPct = c.end_run_max != null ? ((c.end_run_max - 1) * 100) : null;
    return {
      short: c.short,
      color: c._color || theme.accentStrong,
      endV,
      pct,
      loPct,
      hiPct,
      y: y(endV),
    };
  });
  if (bench.length === n) {
    const endV = bench[n - 1];
    endMarks.push({
      short: payload.benchmark_label || payload.params?.benchmark_label || "benchmark",
      color: theme.muted,
      endV,
      pct: (endV - 1) * 100,
      loPct: null,
      hiPct: null,
      y: y(endV),
      muted: true,
    });
  }
  endMarks.sort((a, b) => a.y - b.y); // top → bottom on chart
  const minGap = 16;
  for (let i = 1; i < endMarks.length; i++) {
    if (endMarks[i].y - endMarks[i - 1].y < minGap) {
      endMarks[i].y = endMarks[i - 1].y + minGap;
    }
  }
  const maxY = P.t + iH;
  if (endMarks.length && endMarks[endMarks.length - 1].y > maxY) {
    const shift = endMarks[endMarks.length - 1].y - maxY;
    for (const m of endMarks) m.y -= shift;
  }
  if (endMarks.length && endMarks[0].y < P.t) {
    const shift = P.t - endMarks[0].y;
    for (const m of endMarks) m.y += shift;
  }

  const xEnd = x(n - 1);
  const endLabels = endMarks.map((m) => {
    const pctStr = fmtPct(m.pct);
    const bandStr = (m.loPct != null && m.hiPct != null)
      ? `  [${fmtPct(m.loPct)}…${fmtPct(m.hiPct)}]`
      : "";
    const fill = m.muted ? theme.muted : m.color;
    const weight = m.muted ? "400" : "600";
    return `
      <line x1="${xEnd.toFixed(1)}" y1="${y(m.endV).toFixed(1)}" x2="${(xEnd + 10).toFixed(1)}" y2="${m.y.toFixed(1)}" stroke="${fill}" stroke-width="1" stroke-opacity="0.55"/>
      <circle cx="${xEnd.toFixed(1)}" cy="${y(m.endV).toFixed(1)}" r="3.2" fill="${fill}" stroke="var(--bg)" stroke-width="1"/>
      <text x="${(xEnd + 14).toFixed(1)}" y="${m.y.toFixed(1)}" fill="${fill}" font-size="11" font-weight="${weight}" dominant-baseline="middle">${_esc(m.short)}  ${pctStr}${_esc(bandStr)}</text>`;
  }).join("");

  const lgd = [
    wobbleBatch ? `<span class="lgd-band"></span><span>run spread (selected)</span>` : "",
    `<span class="lgd-ens"></span><span>label = ensemble % · [K-run min…max]</span>`,
  ].filter(Boolean).join('<span class="lgd-sep"> · </span>');

  const note = payload.note ? `<p class="chart-note">${_esc(payload.note)}</p>` : "";
  return `<figure class="chart-figure">
<svg viewBox="0 0 ${W} ${H}" class="cmp-chart" xmlns="http://www.w3.org/2000/svg">
  ${grid}${band}${runPaths}${ensPaths}${benchPath}${endLabels}${xLabels}
</svg>
<div class="chart-legend">${lgd}</div>
${note}
</figure>`;
}

function renderCmpLayer3(runs) {
  if (!runs.length) return "";
  const rows = [
    { label: "mean score std", cells: runs.map((r) => _fmt(r.output?.mean_score_std, 3)) },
    { label: "mean sign agreement", cells: runs.map((r) => _fmt(r.output?.mean_sign_agreement, 3)) },
    { label: "mean rank corr (Spearman)", cells: runs.map((r) => _fmt(r.output?.mean_rank_corr, 3)) },
    { label: "mean rationale sim (cosine)", cells: runs.map((r) => _fmt(r.output?.mean_rationale_sim, 3)) },
    { label: "cells unanimous sign / n", cells: runs.map((r) => `${_fmt(r.output?.cells_unanimous_sign, 0)} / ${_fmt(r.output?.n_cells, 0)}`) },
  ];

  // mean score std lives on a ~0–0.15 scale → left axis. The three reproducibility
  // metrics (sign agreement, rank corr, rationale sim) are all ~0–1 → right axis.
  // Sort by score_std descending: higher stochasticity (worse) on the left.
  const byStoch = cmpSortBy(runs, (r) => r.output?.mean_score_std, { higherIsBetter: false });
  const chart = buildCmpRunChart({
    runs: byStoch,
    metrics: [
      { label: "mean score std", color: cssVar("--success", "#7ee787"), axis: 0, get: (r) => r.output?.mean_score_std ?? null },
      { label: "mean sign agreement", color: cssVar("--accent2", "#6ea8fe"), axis: 1, get: (r) => r.output?.mean_sign_agreement ?? null },
      { label: "mean rank corr", color: cssVar("--accent-strong", "#ffb000"), axis: 1, get: (r) => r.output?.mean_rank_corr ?? null },
      { label: "mean rationale sim", color: cssVar("--accent3", "#c792ea"), axis: 1, get: (r) => r.output?.mean_rationale_sim ?? null },
    ],
    yLabel: `Left axis: mean score std (lower = more reproducible). ${CMP_SORT_NOTE}`,
    yLabel2: "Right axis: sign agreement, rank corr & rationale sim (0–1, higher = more reproducible).",
    zeroLine: true, fmt: (v) => v.toFixed(3), fmt2: (v) => v.toFixed(2),
  });

  return `<section class="report-section">
    <h2 class="section-title">Layer 3 · Output stochasticity</h2>
    ${kpiPlaceholder("output_sensibility_score", "spot-check / LLM-judge of final scores + rationales (hallucination, internal consistency, sign-vs-reasoning alignment)")}
    <p class="chart-footnote">Agent stochasticity — run-to-run output variance across the K token-sampled repeats of the same config on the same inputs. Lower score_std / higher sign_agreement, rank_corr &amp; rationale_sim = a more reproducible (less stochastic) final view. Rationale sim = mean pairwise cosine of the rationale embeddings across the K repeats (from the decision-analytics parquet), a semantic-reproducibility lens on top of the numeric ones. "cells unanimous" is a count and is not charted. This is <em>cross-run</em> stochasticity at a single decision date (same inputs, K token-sampled repeats).</p>
    ${cmpTable(rows)}
    <div class="chart-block"><h3 class="chart-title">Output stochasticity across run</h3>${chart}</div>
    <div class="chart-block"><h3 class="chart-title">Output stochasticity — mean score std by period</h3>${buildCmpScoreStdLineChart({ runs, yLabel: "Mean score std across the K repeats per decision date (one line per config). Lower = more reproducible; spikes = periods where the agent's runs disagreed." })}</div>
    <div class="chart-block"><h3 class="chart-title">Decision score by ticker — merged across configs</h3>${buildCmpScoreByTickerChart(runs)}</div>
  </section>`;
}

// Output coherence & sophistication — one section: methodology, stats, charts.
const _SOPH_LEVEL_NAMES = [
  "L0 stat recital", "L1 single-factor", "L2 multi-factor",
  "L3 franchise/moat", "L4 strategic synthesis",
];
const _SOPH_LEVEL_COLORS = [
  "#2a1650", "#5b2a6b", "#6e6e8e", "#d97742", "#f5b042",
];

function _cmpStackedBar({ labels, stacks, colors, levelNames }) {
  const n0 = labels.length || 1;
  const W = Math.max(1100, 48 + 16 + n0 * 150);
  const H = 320, P = { t: 16, r: 16, b: 56, l: 48 };
  const iH = H - P.t - P.b;
  const plotW = W - P.l - P.r;
  const n = labels.length;
  if (!n) return '<p class="empty-note">No distribution data.</p>';
  const groupW = plotW / n;
  const barW = Math.min(52, groupW * 0.5);
  const yOf = (v) => P.t + iH - v * iH;
  let grid = "";
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const yy = yOf(t).toFixed(1);
    grid += `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="grid-line"/>`;
    grid += `<text x="${P.l - 6}" y="${yy}" class="cmp-axis" text-anchor="end" dominant-baseline="middle">${(t * 100).toFixed(0)}%</text>`;
  });
  let bars = "";
  labels.forEach((lab, i) => {
    const cx = P.l + i * groupW + groupW / 2;
    const x = cx - barW / 2;
    let acc = 0;
    stacks[i].forEach((share, lv) => {
      if (share <= 0) return;
      const yTop = yOf(acc + share);
      const yBot = yOf(acc);
      const h = Math.max(1, yBot - yTop);
      bars += `<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${colors[lv]}" opacity="0.92"><title>${_esc(lab)} · ${_esc(levelNames[lv])}: ${(share * 100).toFixed(1)}%</title></rect>`;
      acc += share;
    });
    bars += `<text x="${cx.toFixed(1)}" y="${H - 10}" class="cmp-xtick" text-anchor="middle">${_esc(lab)}</text>`;
  });
  const legend = levelNames.map((nm, lv) =>
    `<span class="cl-item"><span class="cp-dot" style="background:${colors[lv]}"></span>${_esc(nm)}</span>`
  ).join('<span class="lgd-sep"> · </span>');
  return `<figure class="chart-figure">
    <svg viewBox="0 0 ${W} ${H}" class="cmp-chart" xmlns="http://www.w3.org/2000/svg">${grid}${bars}</svg>
    <div class="compare-legend">${legend}</div>
  </figure>`;
}

function renderCmpCoherenceSoph(runs) {
  if (!runs.length) return "";
  const hasEmb = runs.some((r) => r.coherence?.within?.rho != null);
  const rc = _cmpRationaleCodes;
  const hasStance = !!(rc?.stance?.per_config);
  const hasSoph = !!(rc?.sophistication);
  if (!hasEmb && !hasStance && !hasSoph) return "";

  // ── Embedding coherence ──────────────────────────────────────────────────
  let embBlock = "";
  if (hasEmb) {
    const g = (r, k) => r.coherence?.[k] ?? {};
    const embRows = [
      { label: "within-period (sector-ctrl)", cells: runs.map((r) => _fmt(g(r, "within").rho, 3)) },
      { label: "same-ticker over time", cells: runs.map((r) => _fmt(g(r, "same_ticker").rho, 3)) },
      { label: "cross-period pooled", cells: runs.map((r) => _fmt(g(r, "cross_period").rho, 3)) },
    ];
    const byCoh = cmpSortBy(runs, (r) => r.coherence?.within?.rho, { higherIsBetter: true });
    const embChart = buildCmpBarChart({
      groups: byCoh.map((r) => r.short),
      series: [{
        label: "within-period ρ", color: cssVar("--success", "#7ee787"), axis: 0,
        values: byCoh.map((r) => r.coherence?.within?.rho ?? null),
      }],
      zeroLine: true, fmt: (v) => v.toFixed(3),
      yLabel: `Spearman ρ · similar rationale embeddings ↔ similar scores (sector-controlled). ${CMP_SORT_NOTE}`,
    });
    embBlock = `
      <h3 class="chart-title">Semantic alignment (embeddings)</h3>
      <p class="chart-footnote">Each rationale → meaning vector. Within a date: do names with similar stories also get similar scores? (sector-adjusted). Not directional — embeddings do not know long from short.</p>
      ${cmpTable(embRows)}
      <div class="chart-block">${embChart}</div>`;
  }

  // ── Stance vs score ──────────────────────────────────────────────────────
  let stanceBlock = "";
  if (hasStance) {
    const st = rc.stance;
    const eps = st.eps;
    const pc = st.per_config;
    const byStem = {};
    rc.configs.forEach((c) => { byStem[c] = pc[c]; });
    const stanceRows = [];
    runs.forEach((r) => {
      const b = r.config_stem != null ? byStem[r.config_stem] : undefined;
      if (!b) return;
      stanceRows.push({ short: r.short, color: r._color, b });
    });
    if (stanceRows.length) {
      const C_LONG = cssVar("--success", "#7ee787");
      const C_BAL = "#c9a86a";
      const C_SHORT = "#f85149";
      const bySep = cmpSortBy(stanceRows, (r) => (r.b.mean_long ?? 0) - (r.b.mean_short ?? 0), { higherIsBetter: true });
      const stanceChart = buildCmpBarChart({
        groups: bySep.map((r) => r.short),
        series: [
          { label: "long", color: C_LONG, axis: 0, values: bySep.map((r) => r.b.mean_long ?? null) },
          { label: "balanced", color: C_BAL, axis: 0, values: bySep.map((r) => r.b.mean_balanced ?? null) },
          { label: "short", color: C_SHORT, axis: 0, values: bySep.map((r) => r.b.mean_short ?? null) },
        ],
        zeroLine: true, fmt: (v) => v.toFixed(2),
        yLabel: `Mean score by LLM-coded stance (blind to score). ${CMP_SORT_NOTE}`,
      });
      const stanceTable = [
        { label: "mean score · long", cells: stanceRows.map((r) => _fmt(r.b.mean_long, 2)) },
        { label: "mean score · balanced", cells: stanceRows.map((r) => _fmt(r.b.mean_balanced, 2)) },
        { label: "mean score · short", cells: stanceRows.map((r) => _fmt(r.b.mean_short, 2)) },
        { label: "long−short separation", cells: stanceRows.map((r) => _fmt((r.b.mean_long ?? 0) - (r.b.mean_short ?? 0), 2)) },
        { label: "n long / balanced / short", cells: stanceRows.map((r) => `${r.b.n_long} / ${r.b.n_balanced} / ${r.b.n_short}`) },
        { label: `agreement % (eps=${eps})`, cells: stanceRows.map((r) => _fmt((r.b.agreement ?? 0) * 100, 1)) },
      ];
      stanceBlock = `
        <h3 class="chart-title">Directional faithfulness (stance vs score)</h3>
        <p class="chart-footnote">LLM codes each rationale long / balanced / short without seeing the score; compared to that instance’s score. Ideal: long high+, balanced ≈0, short high−.</p>
        ${cmpTable(stanceTable)}
        <div class="chart-block">${stanceChart}</div>`;
    }
  }

  // ── Sophistication ───────────────────────────────────────────────────────
  let sophBlock = "";
  if (hasSoph) {
    const s = rc.sophistication;
    const byStem = {};
    rc.configs.forEach((c, i) => { byStem[c] = i; });
    const sophRows = [];
    runs.forEach((r) => {
      const idx = r.config_stem != null ? byStem[r.config_stem] : undefined;
      if (idx == null) return;
      sophRows.push({
        short: r.short, color: r._color,
        n: s.n[idx], mean: s.mean[idx], median: s.median[idx],
        dist: s.dist[idx] || [], pct3plus: s.pct3plus[idx], pct4plus: s.pct4plus[idx],
      });
    });
    if (sophRows.length) {
      const hasAll = sophRows.every((r) => r.dist.length === 5);
      const sophTable = [
        { label: "mean sophistication", cells: sophRows.map((r) => _fmt(r.mean, 2)) },
        { label: "median", cells: sophRows.map((r) => r.median != null ? String(r.median) : "—") },
        { label: "% level 3+", cells: sophRows.map((r) => _fmt(r.pct3plus, 3)) },
        { label: "% level 4", cells: sophRows.map((r) => _fmt(r.pct4plus, 3)) },
        { label: "n rationales", cells: sophRows.map((r) => String(r.n)) },
      ];
      const bySoph = cmpSortBy(sophRows, (r) => r.mean, { higherIsBetter: true });
      const meanChart = buildCmpBarChart({
        groups: ["mean sophistication"],
        series: bySoph.map((r) => ({
          label: r.short, color: r.color, values: [r.mean],
        })),
        zeroLine: false, fmt: (v) => v.toFixed(2),
        yLabel: `Mean sophistication (0–4). ${CMP_SORT_NOTE}`,
      });
      const distChart = hasAll ? _cmpStackedBar({
        labels: bySoph.map((r) => r.short),
        stacks: bySoph.map((r) => r.dist),
        colors: _SOPH_LEVEL_COLORS, levelNames: _SOPH_LEVEL_NAMES,
      }) : '<p class="empty-note">Distribution unavailable.</p>';
      sophBlock = `
        <h3 class="chart-title">Sophistication</h3>
        <p class="chart-footnote">LLM-coded depth on dedup (config, date, ticker) rationales — 0 stat recital · 1 single-factor · 2 multi-factor · 3 franchise/moat · 4 strategic synthesis. Double-code reliability (5% sample): sophistication 78%, stance 89%.</p>
        ${cmpTable(sophTable)}
        <div class="chart-block"><h3 class="chart-title">Mean sophistication</h3>${meanChart}</div>
        <div class="chart-block"><h3 class="chart-title">Sophistication level distribution (L0–L4)</h3>${distChart}</div>`;
    }
  }

  return `<section class="report-section">
    <h2 class="section-title">Output coherence and sophistication</h2>
    <p class="chart-footnote"><strong>Methodology.</strong> The rationale is how we read the logic behind the score. Two dimensions: <em>coherence</em> (does the text line up with the number?) and <em>sophistication</em> (how deep is the thesis?). With 11k+ outputs we use meaning embeddings for semantic alignment, plus a coding agent for stance (long/balanced/short) and depth (levels 0–4). Embeddings test structure of meaning; stance tests direction; sophistication rates depth.</p>
    ${embBlock}
    ${stanceBlock}
    ${sophBlock}
  </section>`;
}

// ── Study 2: cross-config similarity of ensemble outputs ──────────────────
// Heatmap colour interpolation (sequential: low=dark, high=bright).
function _hexToRgb(h) {
  const m = h.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
function _rgbToCss(r) { return `rgb(${r[0]|0},${r[1]|0},${r[2]|0})`; }
function _lerpRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function _heatColor(v, vmin, vmax) {
  if (v == null || !isFinite(v)) return "transparent";
  const t = Math.max(0, Math.min(1, (v - vmin) / (vmax - vmin || 1)));
  // dark indigo -> amber (magma-ish)
  const lo = _hexToRgb("#2a1650"), mid = _hexToRgb("#7b2d8b"), hi = _hexToRgb("#f5b042");
  const c = t < 0.5 ? _lerpRgb(lo, mid, t * 2) : _lerpRgb(mid, hi, (t - 0.5) * 2);
  return _rgbToCss(c);
}
function _cmpHeatmap(labels, matrix, vmin, vmax, title) {
  const N = labels.length;
  if (!N) return "";
  const maxLab = Math.max(0, ...labels.map((l) => String(l || "").length));
  const cell = Math.max(56, Math.min(84, 28 + maxLab * 1.6));
  const labelW = Math.min(220, Math.max(110, maxLab * 7));
  const topPad = Math.min(100, Math.max(56, maxLab * 2.8));
  const pad = 6;
  const W = labelW + N * cell + pad;
  const H = topPad + N * cell + pad;
  const tick = (i) => labelW + i * cell + cell / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="cmp-heatmap" role="img aria-label="${_esc(title)}">`;
  s += `<text x="${labelW + (N * cell) / 2}" y="16" text-anchor="middle" class="hm-title">${_esc(title)}</text>`;
  // column labels (gentle tilt)
  labels.forEach((l, j) => {
    s += `<text x="${tick(j)}" y="${topPad - 8}" text-anchor="end" class="hm-ax" transform="rotate(-35 ${tick(j)} ${topPad - 8})">${_esc(l)}</text>`;
  });
  for (let i = 0; i < N; i++) {
    s += `<text x="${labelW - 6}" y="${topPad + i * cell + cell / 2 + 4}" text-anchor="end" class="hm-ax">${_esc(labels[i])}</text>`;
    for (let j = 0; j < N; j++) {
      const v = matrix[i][j];
      const fill = _heatColor(v, vmin, vmax);
      const lit = v != null && ((v - vmin) / (vmax - vmin || 1)) > 0.62;
      s += `<rect x="${labelW + j * cell}" y="${topPad + i * cell}" width="${cell - 1}" height="${cell - 1}" fill="${fill}" stroke="rgba(255,255,255,0.06)"/>`;
      if (v != null) {
        s += `<text x="${labelW + j * cell + cell / 2}" y="${topPad + i * cell + cell / 2 + 4}" text-anchor="middle" class="hm-cell" fill="${lit ? "#1a1020" : "#f4f0ff"}">${v.toFixed(2)}</text>`;
      }
    }
  }
  s += "</svg>";
  return s;
}
function renderCmpCrossConfig(runs) {
  const xc = _cmpCrossConfig;
  if (!xc || !xc.configs || !xc.configs.length) return "";
  // Restrict + reorder to selected batches' config stems, in ladder order
  // (xc.configs is already ladder-ordered).
  const selectedStems = new Set(runs.map((r) => r.config_stem).filter(Boolean));
  if (!selectedStems.size) return "";
  const idx = xc.configs
    .map((c, i) => ({ c, i, stem: c }))
    .filter((o) => selectedStems.has(o.stem));
  if (idx.length < 2) return ""; // need ≥2 configs for a similarity matrix
  const labels = idx.map((o) => xc.short[o.i] || o.c);
  const sub = (mat) => idx.map((o) => idx.map((p) => mat[o.i][p.i]));
  const cos = sub(xc.rationale_cos);
  const pear = sub(xc.score_pearson);
  const spear = sub(xc.score_spearman);

  const heatmaps = `<div class="cmp-heatmap-row">
    ${_cmpHeatmap(labels, cos, 0.6, 1.0, "Rationale cosine · semantic direction")}
    ${_cmpHeatmap(labels, pear, 0.45, 1.0, "Score Pearson · linear magnitude")}
    ${_cmpHeatmap(labels, spear, 0.45, 1.0, "Score Spearman · rank / ordering")}
  </div>`;

  const takeaways = `<ul class="cmp-takeaways">
    <li><strong>The sophistication ladder holds on scores, not on rationales.</strong> On both score tables every config's nearest neighbour is its ladder neighbour — cleanest in Spearman (llm pair 0.91, then llm (GLM) → structured agent (langgraph) → autonomous agent (openclaw) as a d1/d2 chain). On rationale it fails: outside the floor pair, every config is closest to the <em>floor cluster</em> regardless of ladder position (langgraph↔floor d4 = 0.72 beats langgraph↔openclaw d1 = 0.63).</li>
    <li><strong>Why they differ — words vs decisions.</strong> Rationale embeddings capture <em>discourse style</em>: all configs draw from the same fundamental-analyst lexicon, so rationales cluster by linguistic similarity to the floor dialect (structured agent (langgraph) sounds more like floor than like openclaw). Scores capture <em>conviction</em>, which is architecture-specific — so score similarity tracks the computational ladder. Same words-vs-decision split as Study 1.</li>
    <li><strong>Two score regimes, not five rungs.</strong> Spearman shows a tight floor cluster (0.91), a wide gap, then a loosely-laddered sophisticated cluster (llm (GLM) / autonomous agent (openclaw) / structured agent (langgraph) at 0.62–0.66). The sophistication gap is real, but it is a 2-regime split with a soft chain inside the sophisticated set, not five distinct rungs.</li>
    <li><strong>Memory is cosmetic on the floor LLM.</strong> <code>llm (MiMo) - no memory</code> ↔ <code>llm (MiMo)</code>: rationale 0.86, score 0.94 — adding memory changes the wording more than the decision, and barely moves either. Base-model identity (the MiMo→GLM swap) is a bigger lever than the memory augmentation.</li>
    <li><strong>Rationales compress, scores spread.</strong> Rationale cosines sit in a tight 0.62–0.86 band while score correlations span 0.45–0.94 ⇒ configs share reasoning language far more than they share conviction — which is precisely why the ladder shows up in scores but not in rationales.</li>
  </ul>`;

  return `<section class="report-section">
    <h2 class="section-title">Layer 5 · Study 2 — cross-config output similarity</h2>
    <p class="chart-footnote"><strong>What this captures.</strong> How related are the configs' ensemble outputs — do floor LLMs cluster, and is each step up in sophistication a neighbour? For every config pair we align on the shared (ticker, date) ensemble face (runs averaged per ticker-date, scores z-scored within each config-date) and compute three similarities: <em>rationale cosine</em> (semantic direction of the reasoning text — scale/magnitude blind), <em>score Pearson</em> (linear agreement of z-score levels — captures conviction magnitude), and <em>score Spearman</em> (rank agreement — pure ordering, ignores spacing). Rows/columns are ordered by the study ladder (llm (MiMo) - no memory → llm (MiMo) → llm (GLM) → … → autonomous agent (openclaw) → structured agent (langgraph)). All per-date rationale cosines are highly significant (n=16, t&gt;67), so this study is about <em>structure</em>, not significance.</p>
    ${takeaways}
    <div class="chart-block"><h3 class="chart-title">Cross-config similarity matrices</h3>${heatmaps}</div>
  </section>`;
}

// Hand-verified GICS sector for each DJIA-30 member (mirrors
// delorean/universes/sectors.py). Used to bucket per-ticker agent scores into
// sector tilts in the compare factor section.
const GICS_SECTOR_DJIA30 = {
  GS: "Financials", CAT: "Industrials", MSFT: "Information Technology",
  UNH: "Health Care", AMGN: "Health Care", V: "Financials",
  HD: "Consumer Discretionary", AXP: "Financials", SHW: "Materials",
  TRV: "Financials", AAPL: "Information Technology", JPM: "Financials",
  MCD: "Consumer Discretionary", AMZN: "Consumer Discretionary", JNJ: "Health Care",
  IBM: "Information Technology", NVDA: "Information Technology", BA: "Industrials",
  HON: "Industrials", CVX: "Energy", CRM: "Information Technology",
  MMM: "Industrials", PG: "Consumer Staples", WMT: "Consumer Staples",
  CSCO: "Information Technology", MRK: "Health Care", DIS: "Communication Services",
  KO: "Consumer Staples", VZ: "Communication Services", NKE: "Consumer Discretionary",
  GOOGL: "Communication Services",
};
const SECTOR_SHORT = {
  "Communication Services": "CommSvc",
  "Consumer Discretionary": "ConsDisc",
  "Consumer Staples": "ConsStap",
  "Energy": "Energy",
  "Financials": "Fin",
  "Health Care": "Health",
  "Industrials": "Indust",
  "Information Technology": "IT",
  "Materials": "Mat",
};

// Average agent signal by GICS sector, one series per config. Computed from
// per_run_scores (already in the compare payload) + the static sector map — no
// report re-run needed. Reveals sector bias the residual layer strips out.
function buildCmpSectorTiltChart(runs) {
  if (!runs.length) return "";
  const sectorSet = new Set();
  const perConfig = runs.map((r) => {
    const prs = r.output?.per_run_scores || {};
    const acc = {}; // sector -> [scores]
    for (const tkMap of Object.values(prs)) {
      for (const [ticker, arr] of Object.entries(tkMap || {})) {
        const sec = GICS_SECTOR_DJIA30[ticker];
        if (!sec) continue;
        sectorSet.add(sec);
        (acc[sec] ??= []).push(...(arr || []).map((d) => d.score).filter((v) => v != null && isFinite(v)));
      }
    }
    return { r, acc };
  });
  if (!sectorSet.size) return '<p class="empty-note">No sector-mapped agent scores available.</p>';
  const sectors = [...sectorSet].sort();
  const series = perConfig.map(({ r, acc }) => {
    // Recenter by the config's grand mean so the chart shows *relative* sector
    // tilt (zero = no tilt vs that config's own average), not a global level
    // offset from raw score scaling.
    const all = Object.values(acc).flat();
    const grand = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
    return {
      label: r.short, color: r._color,
      values: sectors.map((sec) => {
        const v = acc[sec];
        return v && v.length ? (v.reduce((a, b) => a + b, 0) / v.length) - grand : null;
      }),
    };
  });
  const legend = sectors.map((s) => `${SECTOR_SHORT[s] || s} = ${s}`).join(" · ");
  return buildCmpBarChart({
    groups: sectors.map((s) => SECTOR_SHORT[s] || s),
    series,
    yLabel: `Average agent signal by GICS sector (mean score across all K runs × dates × names in the sector, recentered by each config's own grand mean) · zero = no tilt vs that config's average. Positive = the agent is systematically bullish on that sector; negative = bearish. This is the raw sector lean the residual layer strips out (via the GICS dummies). [${legend}]`,
    zeroLine: true, fmt: (v) => v.toFixed(3),
  });
}

function renderCmpBetas(runs) {
  if (!runs.length) return "";

  // ── One consolidated table: controls bundle + style-factor loadings ────────
  // Sector enters the regression as fixed-effect dummies (level shifts), not as
  // a directional loading — so it's reported as part of the controls bundle,
  // not as a β row. The sector tilt chart below shows those level shifts.
  const STYLE_N = 7;
  const rows = [];
  rows.push({
    label: "controls (style + sector)",
    cells: runs.map((r) => {
      const nSec = r.sector_controls ? (r.n_sector_controls ?? 0) : 0;
      return `${STYLE_N} style${nSec ? ` + ${nSec} GICS sector` : " · sector off"} (${STYLE_N + nSec})`;
    }),
  });
  rows.push({ label: "mean R² (full controls)", cells: runs.map((r) => _fmt(r.mean_r_squared, 3)) });

  // Significant style-factor β across runs (directional tilts only).
  const factorSet = new Set();
  runs.forEach((r) => (r.sig_betas || []).forEach((b) => factorSet.add(b.factor)));
  const factors = [...factorSet].sort();
  factors.forEach((f) => {
    rows.push({
      label: f,
      cells: runs.map((r) => {
        const b = (r.sig_betas || []).find((x) => x.factor === f);
        if (!b) return `<span class="cmp-na">—</span>`;
        const sign = b.beta > 0 ? "+" : "";
        return `${sign}${_fmt(b.beta, 2)} <span class="cmp-na">(t ${b.t >= 0 ? "+" : ""}${b.t.toFixed(1)})</span>`;
      }),
    });
  });

  const betaChart = factors.length
    ? buildCmpBarChart({
        groups: factors,
        series: runs.map((r) => ({
          label: r.short, color: r._color,
          values: factors.map((f) => {
            const b = (r.sig_betas || []).find((x) => x.factor === f);
            return b ? b.beta : null;
          }),
        })),
        yLabel: "Style-factor loadings — Fama-MacBeth β (significant only, |t| ≥ 2) · which known style factors each config tilts toward. Sector is not shown here (it's a fixed effect, not a directional tilt — see the sector-tilt chart).",
        zeroLine: true, fmt: (v) => v.toFixed(2),
      })
    : '<p class="empty-note">No style factor loaded significantly (|t| ≥ 2) for any config.</p>';

  const sectorChart = buildCmpSectorTiltChart(runs);

  return `<section class="report-section">
    <h2 class="section-title">Controls &amp; factor loadings — how each config generates its view</h2>
    <p class="chart-footnote">All controls in one bundle: the 9 style factors <em>plus</em> GICS sector dummies enter the same Fama–MacBeth design matrix, and the Layer 1 residual is orthogonal to the whole bundle. <strong>controls (style + sector)</strong> = what the residual is neutralised against. <strong>mean R²</strong> = the share of agent-signal variance the bundle explains (residual var share = 1 − R²). <strong>β rows</strong> = significant <em>directional</em> style loadings (|t| ≥ 2) — sector is a categorical fixed effect (a level shift, not a tilt), so it's not shown as a β row; its bias shows up in the sector-tilt chart below.</p>
    ${cmpTable(rows)}
    <div class="chart-block"><h3 class="chart-title">Style-factor loadings (significant β, |t| ≥ 2)</h3>${betaChart}</div>
    <div class="chart-block"><h3 class="chart-title">Sector tilt — average agent signal by GICS sector</h3>${sectorChart}</div>
  </section>`;
}
