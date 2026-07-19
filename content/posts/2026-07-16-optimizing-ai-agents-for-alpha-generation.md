---

title: "Optimizing AI Agents for Alpha Generation"
date: 2026-07-16T12:00:00+08:00
author: "Felix Lin"
description: "Optimizing AI agents for idiosyncratic and additive alpha"
tags:

- AI Agents
- Backtesting
- Finance
- Delorean
- Systematic Investing
ShowToc: true
TocOpen: true
draft: false

---

## Overview

- Introduces a novel systematic investment research framework for optimizing AI agents as a direct source of idiosyncratic and additive alpha.
- Demonstrates framework applicability on a generic fundamental equity strategy, with backtested results showing that post-optimized agents can achieve higher, statistically significant alpha than a range of generic agents and models.
- Provides a detailed framework specification for industry evaluation and replicability.

## Key findings

1. **AI agent stochasticity is real and impactful.** Due to implementation constraints, virtually all LLMs are non-deterministic. Agentic capabilities further amplify this stochasticity and can significantly affect investment outcomes; under identical conditions, an OpenClaw agent could vary over 4× raw output and 1.5× in final performance than a single-turn agent. A single backtest from your AI agent is just one draw from a distribution, not true skill. Nonetheless, outputs are mostly noise around a persistent character that can be modeled through repeated runs and ensembling.
2. **More agentic is not better — heck, even a better model is not better!** Agent performance in real financial settings can diverge from conventional understanding and benchmarks. In our study on idiosyncratic fundamental skills, single-turn agents (floor LLMs) consistently outperform more sophisticated open-source variants on performance metrics, by more than 30-100% after factor controls. Within floor LLMs, more intelligent but hallucination-prone models can also underperform peers; Grok 4.5 underperforms Grok 4.3, having twice the hallucination rate. Furthermore, agentic components do not interact monotonically — a model that performs better with one scaffold may not with another.
3. **There is an explanation for the findings above: error rate. By understanding the mechanics, we can configure an ex-ante optimal agent and improve iteratively.** Net performance gain ≈ capability gain − (base error × amplification). Using this principle, we first-shot an ex-ante agent that outperformed all previous configurations and became the only one to clear a credible significance bar (NW *t* > 3) for idiosyncratic IC. Practical learnings: memory, reflection, and debate often introduce more noise and error than insight; a grounded mid-tier model beat a "smarter" one that hallucinates; split sub-agent roles by information stream; verify claims against the raw data; prefetch standard data packs instead of open-ended tool loops when possible...

{{< chart "main-residual-mean-ic.svg" "Residual IC (h1)" >}}

{{< chart "main-residual-nw-t.svg" "Residual NW t (h1)" >}}

[See results here](#headline-results-from-framework-demonstration).

## Implications

Don't rely on generic AI benchmarks or intuition when configuring your AI agents. The objective, model, and scaffold interact non-monotonically; your "latest and greatest" agent could be suboptimal, adding uncertainty and cost while delivering lower performance. For alpha generation, or any critical AI workflows with measurable outcomes, it warrants serious understanding and evaluation.

Just as AI labs adopt a systematic pipeline to improve model and harness performance across benchmarks, AI investors should **own their benchmark optimization pipeline**, in this case the benchmark is not a generic, hackable and isolated capability measure but one that directly reflects your strategy and agents. This pipeline, not the AI, is what will provide an edge in the age of AI investing.

---

## The study


| Element                           | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Strategy**                      | **Fundamental equity analyst** — same mandate on every agent configuration (floor LLMs, OpenClaw, trading agent, ex-ante); slight prompt variations to accommodate **scaffold** differences (e.g. listing tools for tool-calling agents). **Estimand:** rate each company’s **risk-adjusted reward** — attractiveness of ownership vs risk of ownership. **Rating only** — no sizing, stops, timing, or weights. **Judgment inputs (agent picks emphasis per name):** franchise/business quality; financial trajectory (revenue, earnings, margins, cash generation, balance-sheet resilience); valuation vs the company’s own recent history; price/return as context vs fundamental health; narrative and events (news, filings, web snippets). **KPI target:** idiosyncratic (residual) cross-sectional signal after style + sector controls. |
| **Data (PIT-controlled)**         | US prices, fundamentals, news, filings; web search/snippets where tools/prefetch allow. Cached locally.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Universe**                      | DJIA-30; **point-in-time index constituents** per decision date (`dow30` preset) for survivorship-bias control                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Backtest window**               | **16** quarterly decision dates Jul 2022–Apr 2026 → **T = 16**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Primary return target horizon** | **Forward** return from one decision date to the next (one quarter, non-overlapping)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Output Schema**                 | Per (date, ticker) **view**: - **Score** in **[-1, +1]** (attractive / mild / neutral / unattractive bands); **conviction** in [0, 1]- **Rationale** (one sentence on the core call)- **Key_factors** (2–5 short, specific, evidenced drivers)- **Sources_cited** on floor LLMs — PIT `source_type`, `source_id`, and `excerpt` for each cited figure (every number in rationale/key_factors must trace to a citation where enforced). Multi-agent scaffolds emit the same core fields; citation discipline varies by scaffold.- **Headline KPIs use score only**; rationale, factors, and citations support sense-checking, twin continuity, and sophistication analytics.                                                                                                                                                                      |
| **Ensembling for stochasticity**  | **K = 3** independent runs per frozen agent configuration; same world, independent sessions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |


### Headline KPI pipeline

```text
raw score (K runs)
  → within-date z-score (per run) + equal-weight ensemble per (date, ticker)
  → per-date Pearson IC vs h1 forward return                         ← gross IC
  → Fama–MacBeth residual (style + sector factor controls)
  → per-date residual Pearson IC  ┐
  → NW t on residual IC series      ┘ headline KPIs
```

- **Ensemble the signal.** Each agent configuration is run **K = 3** times to control for stochasticity. Z-score within each decision date *inside each run*, then **equal-weight average** across K per (date, ticker). Same rule should be applied for live deployment (Framework Step 4).
- **Gross IC.** Per date: Pearson correlation between ensemble score and realised h1 forward return. **Mean gross IC** averages over T dates, before factor controls.
- **Factor controls + residual signal.** Each date, **Fama–MacBeth** OLS: regress the ensemble signal on style factors + **GICS sector dummies**; take the **residual cross-section**. Gross IC can reload known factor loadings from the same PIT sources — especially on a short panel in a **momentum** regime (T ~ 15).

**Headline KPIs:**

- **Residual IC** — Pearson IC of the residual cross-section vs forward return each date; **mean** over T. Orthogonal predictive power after factor controls.
- **NW *t*** — on the residual IC time series: mean(IC) ÷ HAC standard error (lag = h−1; at h1 lag = 0). Rewards period-to-period stability of the edge. We use NW *t* rather than a bootstrap ICIR CI because at T ~ 15 the ICIR ratio is fragile at the borderline.

### Grounding agent configurations

The grounding grid covers **floor LLMs** and two **off-the-shelf** configurations— all under the setup above, each with K = 3.

**Floor LLM model axis.** Identical setups with **base model** differentiation (plus one memory iteration on MiMo). Checkpoints span **model intelligence vs hallucination rate** using published Artificial Analysis priors[^artificial-analysis-floor] — not a monotonic capability ladder:

[^artificial-analysis-floor]: **Model intelligence** — Artificial Analysis [Intelligence Index](https://artificialanalysis.ai/methodology/intelligence-benchmarking). **Hallucination rate** — Artificial Analysis [AA-Omniscience Hallucination Rate](https://artificialanalysis.ai/evaluations/omniscience) (incorrect ÷ non-correct responses; lower is better). Scores as published at grid build time.

Checkpoints across models:


| Model (floor LLM label) | Intelligence Index | Hallucination rate | Role on model axis                                               |
| ----------------------- | ------------------ | ------------------ | ---------------------------------------------------------------- |
| MiMo-V2.5-Pro           | 42                 | 25%                | Control — also fixed on scaffold axis for agents below           |
| MiniMax-M3              | 44                 | **16%**            | Lowest hallucination rate in set                                 |
| GLM-5.2                 | 51                 | 28%                | Higher Intelligence Index score                                  |
| Grok 4.3                | 38                 | 25%                | Prior Grok iteration                                             |
| Grok 4.5                | **54**             | 52%                | Highest Intelligence Index; highest hallucination rate trade-off |


Checkpoints across scaffolds:


| Agent configuration                                | Scaffold                                         | Key features                                                                             | Role                                                                     |
| -------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Floor LLM** **(MiMo, no memory)**                | SAS — dossier LLM                                | Full PIT dossier; no tools, no memory                                                    | Simplest agentic configuration                                           |
| **Floor LLM** **(MiMo)**                           | Same + log memory                                | Platform injects same-ticker prior score and rationales (PIT-strict)                     | Memory iteration (Liu: memory often net-negative on retrieval-like work) |
| **Floor LLM** **(GLM / MiniMax / Grok 4.3 / 4.5)** | Same floor LLM scaffold                          | Swap base model only; memory on                                                          | Model axis — intelligence vs groundedness                                |
| **OpenClaw agent** **(MiMo)**                      | Tool-calling single-agent system (ReAct SAS)     | Per-ticker think → tool → observe; MCP tools; **model-chosen** tool order and depth      | Off-the-shelf “give your agent tools” pattern[^tradingagents-lineage]    |
| **Trading agent** **(MiMo)**                       | Tool-calling multi-agent system (sequential MAS) | Fundamentals → narrative specialists (tool loops) → Bull-Bear debate → PM; no reflection | Off-the-shelf multi-agent desk pattern[^tradingagents-lineage]           |


[^tradingagents-lineage]: Trading agent lineage from [TradingAgents](https://github.com/TauricResearch/TradingAgents) — reimplemented and **trimmed for speed** (sequential lanes, capped tool/debate rounds), keeping role split, bull/bear debate, PM synthesis. Contrast point for “popular upgrade” without centralized verification. Does not represent official repo performance.

All agent scaffolds above use **MiMo** so the scaffold axis is read holding model fixed. Primary comparisons: floor LLM vs OpenClaw (tool autonomy); floor LLM vs trading agent (multi-role debate without verifier); model swaps within floor LLMs.

### Ex-ante agent

Framework **Step 3** applied: a **first-shot agent configuration** from the ex-ante framework and principle:

 Net performance gain ≈ capability gain − (base error × amplification).

Shares the same base configuration of the trading agent with error-amplifying components stripped and error-reducing components added.

**Same skeleton as trading agent.** Identical universe, dates, model (MiMo), lookbacks, prefetch settings, and output schema. Same PIT data (prices, fundamentals/valuation, news, filings/web snippets).


|                          | Trading agent                                                                           | Ex-ante agent                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow**             | Fund (tools) → Narr (tools) → Bull → Bear → PM                                          | Prefetch quant + qual packs → **Quant ‖ Qual** → **Verifier** → PM                                                                     |
| **Tools at reason time** | On — ReAct rounds (`evidence_mode: tools`); tool-selection mistakes compound in context | Off — **prefetch** evidence packs only at synthesis                                                                                    |
| **Specialist topology**  | Sequential fund → narrative; errors in lane 1 feed lane 2                               | **Parallel** quant ‖ qual — streams meet only at decision (Kim et al.: decomposable task → centralized MAS)                            |
| **Roles**                | Fundamentals + Narrative (trading-desk habit)                                           | Quantitative (prices, ratios, fundamentals, valuation) + Qualitative (news, filings, web) - to align with types of information streams |
| **Verification**         | Bull/Bear debate; no independent auditor vs raw evidence                                | **Centralized verifier** audits specialist reports against evidence packs; debate dropped                                              |
| **LLM calls / ticker**   | Variable (tool + debate depth)                                                          | **4** fixed (2 specialists + verifier + PM)                                                                                            |
| **Memory**               | Off                                                                                     | Off                                                                                                                                    |


The ex-ante agent was specified and run once under the same rules as the grounding grid — then compared on headline KPIs. Iterative agents (memory/feedback, verifier removed) are Step 6 iterations, not part of the grounding grid. Ex-ante design rationale: Framework [Step 3](#step-3--ex-ante-near-optimal-agent-configuration).

---

## Headline results from framework demonstration

Same fundamental stock-rating strategy, 9 different agent configurations - six floor LLMs with varying models, OpenClaw agent, trading agent, and ex-ante agent (framework first-shot). Headline KPIs are residual IC and residual NW *t* on next rebalancing date (Q) after factor controls. DJIA 30 on 16 periods with 3 repeated runs for each configuration to incorporate stochasticity, totalling 12,960 samples (15,840 including later iteration) of agent outputs. Point-in-time (PIT) control strictly enforced at tool-level but not model look-ahead bias - more emphasis on the delta between configurations than their absolute performance.

{{< chart "main-residual-mean-ic.svg" "Residual IC (h1)" >}}

{{< chart "main-residual-nw-t.svg" "Residual NW t (h1)" >}}

**Floor LLM (MiMo)** posted the **highest residual IC** (0.167) but only the **ex-ante agent** cleared a credible significance bar (**residual NW *t* > 3**, at 3.24), demonstrating idiosyncratic IC that is **stable across quarters**. Every other agent configuration sits below with Groks, GLM and OpenClaw below |*t*| ≈ 1.96.

**Gross → residual.** Almost every agent configuration has lower IC and t post-factor control — gross strength partly reloads known factor loadings from accessible sources or model bias. Exception: Ex-ante agent, and its later iterative variants, are the only configurations with higher residual IC and significance.

**Trends:**

- Floor LLM beat off-the-shelf agents — Floor LLM (MiMo) residual IC 0.167 / NW *t* 2.67 vs OpenClaw 0.077 / 1.35 and trading agent 0.127 / 2.10 that are powered by the same model
- Trading agent beat OpenClaw — structured roles helped vs open tools, but both trail the floor LLM on headline KPIs.
- Higher benchmark IQ ≠ better. Floor LLM performance across the model axis demonstrates more alignment to hallucination rates vs intelligence (Grok 4.5 < 4.3).

## Notable findings across layers

### Twin continuity (nearest-neighbour test)

For each of the **27 runs** (9 agent configurations × K = 3), find the closest peer in output-character space among the other 26. Count a **hit** when that neighbour is another repeat of the **same** agent configuration (a twin). Under random labels, hit rate ≈ **7.7%** (2 twins among 26 peers). We also shuffle agent-configuration labels (500 draws) and require the observed rate to beat the null 95th percentile.

**Result:** Twin continuity **passes on every face** — an agent configuration is a real clustering object, not a label on noise. Ensembling K runs and comparing agent configurations is justified.


| Face                      | Hit rate | vs chance (~7.7%) | Label-shuffle null    |
| ------------------------- | -------- | ----------------- | --------------------- |
| Rationale (whole run)     | **100%** | ≫ chance          | PASS (null p95 = 22%) |
| Rationale (by date)       | **92%**  | t = 91.6          | PASS (null p95 = 17%) |
| Rank (whole run)          | **93%**  | ≫ chance          | PASS (null p95 = 19%) |
| Factor loadings (panel β) | **82%**  | ≫ chance          | PASS (null p95 = 19%) |


**What each face captures:**

- **Rationale** — cosine on mean rationale embeddings: do the *stories* cluster by agent configuration? Strongest signal (100% whole-run).
- **Rank** — Spearman on within-date score ranks, aggregated over the full schedule: do agent configurations reproduce the same *book*? 93% whole-run.
- **Factor** — panel OLS loadings on seven style factors (~450 obs/run): do agent configurations share a *style fingerprint*? 82% — identity persists in how the signal loads on known factors.

**Where it fails:** Almost all rank/factor misses between **MiMo floor LLM with and without memory**. This suggests that the 2 configurations are too similar to differentiate.

### Output stochasticity

Mean score std across K at each (date × ticker) cell, plus **sign agreement**, **rank correlation** (Spearman on within-date ranks), and rationale similarity. Lower score std / higher agreement = a more reproducible generator.

Stochasticity is **real and economically large** — mean score std spans **0.029–0.129** (**4.4×** across nine agent configurations on identical inputs). **OpenClaw** is the outlier: ~**4×** the MiMo floor’s score std and the lowest rank corr (0.66 vs 0.85 on MiMo). Agentic paths fork early (tool order, debate depth, growing context); floor LLMs stay tight. Trading agent: high sign agreement (0.99) but **low rank corr** (0.65) — runs agree on direction more than on the cross-sectional book. High score std pairs with low sign agreement and rank corr.

{{< chart "main-stochasticity.svg" "Output stochasticity — mean score std" >}}

{{< chart "main-score-std-by-date.svg" "Mean score std by decision date" >}}

**Example (JPM).** Same ticker, same dates, same inputs — yet raw decision scores diverge across K repeats and agent configurations. **OpenClaw** and **Grok 4.3** show the widest run-to-run spread; **MiMo floor LLMs** barely move on this name. Bold line = mean across K; faint traces = individual repeats.

{{< chart "main-score-by-ticker-jpm.svg" "Decision score by date — JPM (K = 3 per config)" >}}

### Ensembling — ensemble vs mean single-run gross IC

Equal-weight averaging of the K transformed scores per (date × ticker) **lifts gross IC everywhere** at h1 — most where stochasticity is highest (dots = per-run IC; ◆ = ensemble gross IC). Per-run gross IC spread reaches **0.04+** on Grok 4.5 and MiniMax — vs **~0.008** on MiMo (no memory). **Ex-ante** and **OpenClaw** show the largest ensemble lift; **MiMo floor LLM** barely moves (paths already co-move). Matches forecast-combination logic (Bates & Granger, 1969): averaging cancels uncorrelated cross-run noise when the generator is wide.

{{< chart "main-ensemble-wobble.svg" "Ensemble vs single-run IC" >}}

### Factor attribution — style and sector loadings

Each date we regress the ensemble signal on seven style factors (value/earnings yield, 12–1 momentum, operating profitability, asset growth, inverse size, low-vol 60d, 1m reversal) plus **GICS sector dummies**; **mean R²** is the share of signal variance the bundle explains. Significant style **β** rows (|t| ≥ 2) show directional tilts; sector bias shows up in the sector-tilt chart.

1. **All agents carry lower R² than every floor LLM.** Off-the-shelf agents explain less of their own signal variance through the style + sector bundle — more idiosyncratic before orthogonalisation. Floor LLMs sit at the top of the R² stack.
2. **Almost every agent configuration loads the same fundamental style triad: quality, earnings yield, low vol.** Operating profitability and earnings yield show up as significant positive β on nearly all floor LLMs and on the structured agents; low-vol loads on most agent configurations too. Aligns with the strategy — rating **risk-adjusted reward** from fundamentals and valuation — and with what the PIT dossier emphasises. The models are **re-expressing a quality/value/defensive screen** the control bundle already knows.
3. **Sector tilts are shared: overweight Financials, underweight Industrials.** All three agents lean the same way; floor LLMs concentrate sector bets more. **Materials** and **Consumer Discretionary** are also consistently underweight across the grid. This could be driven by limited constituents within DJIA where sectors are represented by a few names only, so the fundamental health of the underlying company would dictate sector bias.

{{< chart "main-mean-r2.svg" "Mean R² — style + sector controls" >}}

{{< chart "main-style-betas.svg" "Style-factor loadings" >}}

---

## Step 6 iterations

The ex-ante agent is a **first-shot**, not a claim of global optimum. Step 6 holds the best agent configuration fixed and turns on/off **one component at a time**.


|                            | Iteration 1 — Remove verifier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Iteration 2 — Add learning loop                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Component role**         | Quant and qual specialists run **in parallel** on prefetch PIT packs; a **third LLM stage** audits both reports against the **raw evidence packs** (not against each other’s prose). It is **not** a second research analyst. Its job is an **adversarial audit** — flag: - unsupported or numerically inconsistent claims vs what the packs actually contain; - material evidence present in the packs but omitted from a report; - valuation calls that ignore earnings quality or balance-sheet risk shown in the numbers; - narrative-heavy conclusions without fundamental support; - **cross-lane contradictions** (quant vs qual pointing different ways on the same fact); - lane violations (quant citing news text, qual inventing figures). The verifier emits a **structured advisory note** (forced tool call): severity, verified points, unsupported claims, and up to a few correction ids with required actions — plus an optional directional nudge (`KEEP` / `LOWER` / `RAISE` / `NEUTRALIZE`). The PM sees this block and is instructed to **weigh it but may override it**; it is not a hard veto gate. | **Performance reflection (learning loop).** Two-phase, deferred resolution: at each decision date the runner records the score as *pending* (no LLM); upon next rebalancing window, a **separate reflection call** compares prior view vs realised return with latest information such as articles — prior score, rationale, and key factors against the ticker’s realised h1 return and fresh PIT evidence packs — and writes a short `performance_feedback` lesson. One reflection LLM call per ticker when the outcome resolves. The PM sees prior lessons via **prompt inject only** — no tool-calling to minimize error — and only on dates **strictly after** the outcome is realised (PIT-safe). Specialists and verifier unchanged. |
| **Iteration design logic** | **Framework lens — strip error reduction.** Ex-ante priors: on decomposable parallel streams, specialist errors **amplify** at the PM without a centralized audit (`Base error × Amplification`). The verifier is predominantly an **error** reducer — it cuts amplification, not raw capability. This iteration tests removing that hop: `enable_verification: false` — **Quant ‖ Qual → PM**; same prefetch, same specialists, same model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **Framework lens — insight vs noise.** Ex-ante priors: a learning loop can add **insight** (capability gain from prior view vs realised return) but also raises **base error from noise** — coach-lessons that compete with the PIT dossier, or a wrong lesson from a lucky/unlucky quarter steers the next score. This iteration tests whether that marginal insight exceeds marginal error: `memory.level: feedback`; same prefetch, same specialists, same model, verifier unchanged.                                                                                                                                                                                                                                                    |
| **Result (as expected)**   | **Worse as expected** — residual IC and NW *t* both step down. Without the audit, specialist hallucinations, cross-lane contradictions, and omitted-risk calls propagate straight into the final score. This finding is consistent with our error lens and Kim et al.'s architecture comparison: Independent MAS amplifies factual errors **~17×** vs single-agent baseline; Centralized coordination contains to **~4×** via orchestrator review (their Finance-Agent traces — analogous mechanism, not a verifier ablation in their paper).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **Worse** — net gain negative vs ex-ante, though still above OpenClaw and the trading agent on headline KPIs. This is another “sophistication” feature commonly assumed to improve performance — in a learning loop where the PM is supposed to improve from past mistakes. Plausible reads: the loop is not yet well refined; reflection text **bloats PM context** with noisy coach-lessons that compete with the current PIT dossier; or error propagation — a wrong lesson from a lucky/unlucky quarter steers the next score.                                                                                                                                                                                                          |


Results:

{{< chart "ablation-residual-mean-ic.svg" "Iteration — residual IC (h1)" >}}

{{< chart "ablation-residual-nw-t.svg" "Iteration — residual NW t (h1)" >}}

### What stayed stable

Despite both iterations underperforming ex-ante, they exhibit neighbouring **investment character**:

- **Gross → residual:** both still show **positive lift** in gross IC and NW *t* after style + sector factor controls — the same “signal gets cleaner under factor controls” signature as ex-ante.
- **Agent ranking:** both iterations **rank above every other agent configuration** on headline KPIs.
- **Factor fingerprint:** style load directions **almost identical** to ex-ante (quality / earnings / defensiveness; Financials vs Industrials).

**Bottom line:** Wrong knobs hurt KPIs predictably; **character** persists — small iterations are stable enough to walk toward a nearer optimum one iteration at a time.

---

## Demonstration summary

This study is a **demonstration of the framework**, not a claim of a production-ready money-making agent. The bar was **headline KPIs** on a short quarterly panel (T ≈ 15, DJIA-30, K = 3). We cleared **credible headline KPIs in one agent only** (ex-ante; residual NW *t* > 3); every other result can be treated as directional. The deliverable is the **method** and the **themes below** — not a single backtest winner.

**Themes (demo-specific beyond Key findings):**

1. **Iteration stability.** One-knob turns moved headline KPIs predictably while preserving twin/factor fingerprint — further iteration is tractable.
2. **Factor-reload vs additive synthesis.** Most agent configurations lose gross IC and NW *t* after factor controls; ex-ante is the only standout where residual metrics **improve** — the signature of additive synthesis rather than factor mimicry.
3. **Scaffold–strategy fit.** Prefetch + parallel streams + centralized verification beat tool-heavy SAS and unverified debate for this fundamental rating task.

**Limitations**

- **Framework maturity.** Still **in development** and to be tested for cross-strategy application.
- **Sample size.** T ≈ 15 quarterly h1 periods on DJIA-30 — adequate for demonstration but short for production research
- **Single strategy and universe.** One KPI stack, one factor-control bundle. Results need not transfer without re-running the loop.
- **Model grid.** Mostly **open-weight via OpenRouter** (MiMo default on agents; floor model axis elsewhere).
- **Look-ahead and regime.** Frontier LLMs may encode post-training knowledge; identifier masking is imperfect. Window (~Jul 2022–Apr 2026) spans a **strong momentum** stretch — residual IC after factor controls defines headline KPIs, not a substitute for live attribution or formal incremental-return regression.
- **Off-the-shelf agents** depend on wiring; trading agent is a **reimplementation**, not official repo performance.
- **Methodological bounds.** K = 3 is pragmatic — path-rich scaffolds may need higher K

---

## Bonus chart: The sophistication trap

Across **~4.3k** rationales in the main grid (480 per agent configuration × date × ticker; 9 agent configurations), an **LLM classifier** (blind to score and agent configuration) rated each rationale on a **fixed 0–4 sophistication scale**: 0 stat recital → 1 single-factor → 2 multi-factor synthesis → 3 franchise/moat → 4 strategic synthesis.

Sophistication climbs a clean intuition ladder where **sophisticated agents > simple agents** and **smarter model > weaker model**. We could conflate articulate synthesis with stock-picking skill — a distinction that collapses when the output space reduces from semantic to quantitative dimensions. More and better buy richer prose; they could also buy more stochasticity and errors. Never judge a book by its cover — same goes for your AI!

{{< chart "main-sophistication-mean.svg" "Mean sophistication" >}}

{{< chart "main-sophistication-dist.svg" "Sophistication level distribution (L0–L4)" >}}

---

## The systematic AI agent optimization framework

End-to-end optimization workflow: **setup → grounding → ex-ante → stochasticity → analytics → iteration**.

`1 Setup → 2 Ground → 3 Ex-ante → 4 Sample (K) → 5 Analyze → 6 Iterate`

### Step 1 — Setup and design choices

**KPIs.** Similar to how the AI industry leverages benchmarks during model training and harness engineering, specify KPIs for a given investment strategy as quantifiable optimization objectives. The KPIs should:

- **Capture realistic agent performance** — standard backtest KPIs, e.g. IC/IR and adjacent metrics across key dimensions over long horizons and regimes, or with demonstrated controls.
- **Demonstrate additivity** — net of contribution from individual sources your agent has access to; why use AI when sources do better mechanistically? This depends on how you leverage the AI agent for the strategy. For certain tasks, additivity is given — usually when qualitative information has to be converted to or synthesized alongside quantitative — such as leveraging AI to extract sentiment from texts or dynamically weighing data based on market context which would not be possible without AI. However there could still be simpler, deterministic implementations at your disposal that should be factored in. In our study, we demonstrate this through factor controls that reflect the information set in the **data** our AI agents have access to — if the AI is simply re-expressing what those sources already imply mechanistically, gross IC should fall under controls and residual IC should not rise.
- **Avoid downstream implementation capture** — portfolio implementation varies; could cloud the direct agent contribution.

**Output schema.** Define the output schema for your strategy — continuous score (or buy/sell/hold) plus relevant semantic fields: **rationale** (one-sentence thesis), **key_factors** (2–5 evidenced drivers), and **sources_cited** (PIT source pointers with excerpts, where grounding matters). Headline KPIs optimize the quantitative field; rationale, factors, and citations support audit, sense-checking, and downstream analytics.

**In this demo.** This demo implements the above as **headline KPIs** (residual IC + NW *t*) on **score**.

### Step 2 — Grounding agent configurations

Generate sensible agent configurations for grounding and comparison. Cover **floor LLM** agent configurations — the simplest implementation:

- Each agent is an LLM fed with all relevant information (strategy prompt + fixed set of raw data) to generate the output.

Include your current or off-the-shelf agents — they may substitute for the ex-ante agent if you skip Step 3.

### Step 3 — Ex-ante near-optimal agent configuration

Highly strategy-dependent. Presented below is a practical framework synthesized and expanded upon from academic research and empirical findings. Goal: **near-optimal agent configuration before running tests** — not a universal “best agent.” 

Note: This is still in refinement and does not guarantee cross-domain applicability.

**Core priors (detail in [Appendix B](#appendix-b--ex-ante-framework-details)):**

- **Kim et al. (2026):** scaffold–task alignment beats agent count; decomposable parallel streams → centralized MAS + verification; sequential chains → SAS; tool-heavy + multi-agent pays a coordination tax.
- **Liu (2026):** cross-component interference — more scaffolding is not better; Tool Use often dominates; Planning/Memory often net-negative on retrieval-like work.
- **Error lens:** `Net(agent configuration) ≈ capability delta − (Base error delta × Amplification delta)`. Hallucination is one error source; tools, scaffold diversion, and multi-agent handoffs **amplify** base errors. Floor LLMs collapse amplification to ~**1×** — error is mostly model hallucination rate.

**Decision table.** Work top-down. Each row is one agent-configuration choice. The **Prefer** column is the prior; **This demo** is how we answered for this fundamental equity rating task.


| #   | Decision                     | Ask                                                                                                                             | Prefer                                                                                                                                                                                                                                                           | This demo                                                                                                            |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | **Role and sub-agent split** | What is the natural role, task and information decomposition of your strategy, not the existing split in a pre-AI organisation? | Yes → **centralized MAS** (specialists → PM), split by **information stream or natural task decomposition**, not conventional/legacy roles. Sequential constraint chain → **SAS**. If MAS, prefer **not** open tool loops at reason time (tool–coordination tax) | Parallel **quant ‖ qual** → PM — Quant (prices, fundamentals, valuation) ‖ Qual (news, filings, web); tools stripped |
| 2   | **Evidence access**          | Is the useful information set knowable ex-ante as stable PIT packs?                                                             | Yes → **prefetch**; tools off at reason time. Must discover live or further operations → tools; accept higher stochasticity                                                                                                                                      | Prefetch packs; tools off at reason time unless necessary                                                            |
| 3   | **Verification**             | Errors costly and streams decomposable?                                                                                         | **Centralized verifier** audits vs **raw evidence** — advisory to PM (not a hard veto)                                                                                                                                                                           | Verifier on                                                                                                          |
| 4   | **Memory**                   | Decisions largely independent across dates?                                                                                     | **Off** unless a strong continuity thesis                                                                                                                                                                                                                        | Off                                                                                                                  |
| 5   | **Planning / reflection**    | Retrieval-like synthesis?                                                                                                       | Prompt-planning **off**; pre-split in the scaffold; prefer external verify over self-reflect-only                                                                                                                                                                | Scaffold pre-split; no self-reflect stage                                                                            |
| 6   | **Model**                    | Does the task require more intelligence or groundedness?                                                                        | Prefer **grounded variants with comparable intelligence where possible**                                                                                                                                                                                         | MiMo v2.5 Pro                                                                                                        |


Due to strategy complexity and non-monotonic behaviour of agentic configurations, this can only serve as a guide. At the end of the day you will have to apply the rest of the framework, especially iterative refinement, to empirically confirm.

### Step 4 — Incorporation of stochasticity + initial runs

**How to ensemble:**

- Freeze the agent configuration (model, scaffold, components, prompts).
- Run the full backtest **K times in parallel** — same world, independent sessions. Start with **K = 3**; raise K when the scaffold is path-rich.
- Per (date, ticker), equal-weight average raw quantitative outputs before KPIs — not average at the KPI level.

**What it does:** averaging cancels diversifiable run-level stochasticity when paths are imperfectly correlated. Ensembled KPIs vs mean individual run KPIs tend to improve from noise reduction — more for stochastic scaffolds, less for near-deterministic floor LLMs; lockstep paths are diagnostic. **Live deployment** must use the same sampling methodology when possible or what you trade ≠ what you test.

### Step 5 — Analytics

Evaluate and compare **headline KPIs** across agent configurations (residual IC + NW *t*), plus the following analytic layers in order (demonstrated in [Notable findings across layers](#notable-findings-across-layers)):

**Analytic layers and examples:**

- Raw outputs — score distribution, score vs rationale correlation, semantic analysis
- Stochasticity — twin run variations and nearest-neighbour (NN) tests (NN underlies the assumption that each agent configuration has differentiable, modelable characteristics)
- Raw KPI performance
- Additivity tests — factor/bias controls
- Note: Downstream implementation and its analytics, such as portfolio optimization, are not part of the framework.

### Step 6 — Iterative runs and final agent configuration

Once a near-optimal agent configuration is confirmed, generate iterative runs — hold everything else constant while changing one axis: swap model, add memory or feedback, fine-tune prompts, or explore feeding vs tool-calling.

---

## Closing off

Who this framework is for, how to implement it in practice, and the execution stack used in this study.

### Agent backtesting infrastructure

- **Point-in-time (PIT) control first.** All dossiers or tools must enforce PIT strictly so the agent can only access data on or before the backtest date. Underlying LLMs may still encode look-ahead — frontier models, or a backtest window extending beyond model training (common for lower-frequency strategies or regime testing). Identifier masking (Glasserman & Lin, 2023) is plausible but imperfect and often impractical with the wide information sets current agents access; we often want inherent LLM asset knowledge for judgments.
- **Respect agent autonomy.** To close the backtest–live gap, you must simulate as much as possible the agentic capability and autonomy. Some critical features/data may not satisfy PIT or be too costly to implement live — simulate what you can. Example: if the agent uses tools to explore its information space, generate a twin MCP server with hardcoded PIT controls for the original skills/tools and expose that instead.
- **Good to have:**
  - **Strategy- and agent-agnostic infrastructure** — standardized runner and schema to feed data and catch outputs for comparability; central YAML to swap model, scaffold, components, and key variables (e.g. thinking level, temperature) for fingerprints and runtime traces.
  - **Data caching** — automatically cache PIT market data and prefetch packs on disk for repeated runs (K repeats, grid comparisons, Step 6 iterations). The same (universe, decision date, ticker, source) should hit cache instead of re-fetching from API — cutting unnecessary cost and speeding reruns.
  - **Concurrency** — runs are heavy and numerous; parallelism without sacrificing features (e.g. separate gateways if sub-agents cannot spawn in a local session such as for OpenClaw-like agents).
  - **Retry mechanisms** — minimum impact when a single cell fails. Preferable at the state-level leveraging LangGraph capabilities.
  - **Run-time diagnostics** — API/tool call failures happen more often than you expect and could poison your results
  - **Cost tracing** — important factor for evaluation alongside additivity

### Who is this framework for?

- **Enthusiast/retail investors building their own agents:** Yes, since I am one. Total spend **~$300** for the full demonstration grid — **almost entirely LLM tokens** (OpenRouter), with data APIs (Massive/Brave) a small add-on thanks to caching. Justifiable for optimizing an agent behind the average personal portfolio. Nonetheless, I **controlled** model spend via open-weight models (would love OpenAI/Anthropic but restricted in my location; Gemini next), a smaller universe of DJIA-30, quarterly cadence, 16 dates. If you want a **high-frequency S&P 500** strategy with frontier models: LLM cost could **implode**. Infrastructure can potentially cost far more than the runs themselves — there are currently no open-source, agent-agnostic options at this scale; I am developing one below.
- **Institutions or funds.** Yes, since cost is less of a concern; rigor and similar process for non-AI strategies is already common practice. However, most institutions leverage AI to **improve** an existing process, not yet as a direct alpha source. This framework still applies **inside** that process for any scorable overlay (daily brief, sentiment score) — backtest and optimise against metrics you care about. For **direct alpha generation**, this framework is a systematic framework to **power or inspire** your own process.

Cost detail for this demonstration (tokens, data APIs, scaling): [Appendix A](#appendix-a--cost-and-data).

### Execution stack (Delorean)

**Execution.** All runs were orchestrated in **Delorean**, a research stack that encapsulates and automates the framework end-to-end (`verify` → `repeat` → `report` → `compare`). Charts and headline tables in this post are exported from its reports (`[static/data/](https://github.com/felixdaga/Optimized_Agent/tree/main/static/data)` in the repo). Furthermore, it is designed as an agentic skill for which your agent can import and run tests on itself!

Swap model and their key params, scaffold, or components in one YAML fingerprint; everything else (universe, schedule, KPI profile) stays fixed for fair grid comparison:

{{< img "delorean-demo-1.png" "Delorean demo 1" >}}

{{< img "delorean-demo-2.png" "Delorean demo 2" >}}

All runs and analytics in this study were done with Delorean. Currently ironing out for V1 open source release — please star  [this repo](https://github.com/felixdaga/Optimized_Agent) so you can be the first to try it out! For those interested in accessing the pre-production version or want to join the project, you can email me at [felixlin1223@gmail.com](mailto:felixlin1223@gmail.com) 

---

## Appendix

### Appendix A — Cost and data

Token and API spend are logged per run (`cost_summary.json` in each run directory). Totals below sum **K = 3** repeats on the **16-date** panel (Jul 2022–Apr 2026), all **11 agent configurations** in the demonstration: **9** in the initial KPI grid (6 floor LLM variants + OpenClaw + trading agent + ex-ante) **+ 2** Step 6 iterations. OpenClaw ledger pricing was incomplete; **~$70** is estimated from token volume (~150M tokens in) at MiMo list rates. Analytics (reports, compare viewer, twin tests, rationale coding) run **offline** — no further LLM spend.


| Agent configuration     | Tok in    | Tok out  | Cost (USD) | Notes                        |
| ----------------------- | --------- | -------- | ---------- | ---------------------------- |
| Floor LLM MiMo (no mem) | 4.6M      | 0.8M     | 3.0        | 1 LLM call / ticker          |
| Floor LLM MiMo          | 4.7M      | 0.8M     | 6.5        | + memory iteration runs      |
| Floor GLM               | 3.7M      | 2.2M     | 10.3       |                              |
| Floor MiniMax           | 4.1M      | 2.2M     | 7.8        |                              |
| Floor Grok 4.3          | 3.6M      | 2.2M     | 7.9        |                              |
| Floor Grok 4.5          | 3.8M      | 3.6M     | 26.6       | Highest model $/token in set |
| OpenClaw                | 150M      | 5.7M     | **~70**    | ReAct + tools; ledger est.   |
| Trading agent           | 85M       | 11.8M    | 46.1       | Multi-role + tool loops      |
| Ex-ante                 | 37M       | 9.2M     | 43.6       | 4 LLM calls / ticker         |
| Ex-ante (no verify)     | 18M       | 7.1M     | 23.8       | 3 calls / ticker             |
| Ex-ante (reflection)    | 37M       | 8.8M     | 45.7       | + feedback reflection LLM    |
| **Demonstration total** | **~352M** | **~54M** | **~$291**  | ~406M tokens in+out          |


**Data (Massive + Brave).** **LLM tokens dominate total spend** (~$291 in this demo — see table above); market-data API fees are secondary but constrain design. **Massive** — US-equity prices, fundamentals, ticker-scoped news, filings; sentiment fields from ~Jul 2024 only (thinner controls on earlier dates). **Brave** — PIT web/search snippets for tool-heavy scaffolds and ex-ante prefetch; cached on disk. Delorean **reuses that PIT data cache** across K repeats and agent configurations — so you do not re-bill Massive/Brave for the same dossier on every repeat. That keeps **data API** cost negligible; it does **not** reduce model token spend.

**Models.** Mostly **open-weight via OpenRouter** (MiMo default; GLM, MiniMax, Grok on floor LLMs). **Anthropic / OpenAI** would be natural comparators but **API access is restricted from my location** — this grid is not a full frontier shootout.

**Cost scaling.** Spend scales roughly linearly with **K**, **universe**, **dates**, **agent configurations in the grid**, **LLM calls per ticker**, and **model $/token**. Rule of thumb: **O(universe × dates × K × agent configurations × calls-per-ticker)**. A quarterly DJIA study at floor LLM scale is enthusiast-affordable; **high-frequency S&P 500** with agentic scaffolds is not without institutional budget. Delorean **parallelizes runs** and **amortizes data fetches** via cache; it does not change the LLM cost exponent.

### Appendix B — Ex-ante framework details

Selective key findings from Kim et al. and Liu (2026) used in Step 3 — not full paper summaries. B.3–B.4 add author synthesis on error rate.

#### B.1 Kim et al. (2026)

**Kim, Y., et al. (2026; MIT/Google). [Towards a Science of Scaling Agent Systems](https://arxiv.org/html/2512.08296).** arXiv:2512.08296 — *how agents are wired*:

- Architecture–task alignment matters more than agent count alone. Across **180 controlled configurations** on **four** agentic benchmarks (Finance-Agent, BrowseComp-Plus, PlanCraft, Workbench), their mixed-effects scaling model explains **~51%** of held-out performance variance (5-fold CV R² ≈ 0.51); separately, leave-one-domain-out checks predict the best architecture on **~87%** of held-out task configurations.
- Three recurring patterns:
  1. **Capability ceiling** — when single-agent baseline already exceeds ~45% accuracy, adding agents tends to hurt.
  2. **Tool–coordination trade-off** — tool-heavy tasks pay a multi-agent efficiency penalty.
  3. **Error amplification** — Independent MAS amplifies factual errors ~17× vs single-agent baseline; Centralized coordination contains to ~4× via orchestrator review before aggregation.
- **Task decomposability** matters more than complexity alone: parallel, subtask-decomposable work (Finance-Agent) sees large MAS gains; **strict sequential dependencies** (PlanCraft) see MAS degrade badly — sequential chains often favor SAS. Architecture choice stays domain-specific (e.g. BrowseComp-Plus: modest Decentralized gain; Independent underperforms SAS).
- On **Finance-Agent** (entry-level analyst task; factual-correctness metric) — their strongest MAS-positive benchmark — all MAS topologies beat SAS: Centralized **+80.9%** (0.631 vs 0.349), Decentralized **+74.5%**, Hybrid **+73.2%**, Independent **~+57%**. They attribute this to parallel information streams an orchestrator can synthesize (not a guarantee for other finance tasks).

#### B.2 Liu (2026)

**Liu, M. (2026; Amazon). [More Is Not Always Better: Cross-Component Interference in LLM Agent Scaffolding](https://arxiv.org/html/2605.05716).** arXiv:2605.05716 (posted 7 May 2026) — *which modules you turn on inside an agent*:

- More scaffolding is not universally better. In **every setting they test**, some **proper subset** matches or beats the five-component “All-In” agent: on **HotpotQA** (Llama-3.1-8B), tool use alone beats All-In by 32%; on **GSM8K**, a three-component subset beats All-In by 79%. Shapley ranks and optimal component count are benchmark-specific, but the cross-component interference (CCI) pattern — best subset beats All-In; gap shrinks with model scale — replicates across families.
- On **HotpotQA**-style retrieval (8B): Tool Use dominates Shapley value (~70% of scaffold mass); Planning is significantly negative; Memory is directionally negative; submodularity violations often **sign-flip** rather than show gentle diminishing returns.

#### B.3 Error rate and amplification

The insight is that error rate plays a large role in driving the financial performance of agents. Often, it can overpower the information/capability gains from the same agent configuration via cross-component interference.

**Hallucination is only one error source.** For agents, the economically relevant failures are better split into (i) where the bad fact/action is *born*, and (ii) how the scaffold *amplifies* it.

**Key error sources:**


| Source                                | What it looks like                                                             | Usual culprit                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fabrication / content hallucination   | Invented figures, citations, events, or outcomes not in the evidence           | Model hallucination rate — training/alignment that rewards fluent, confident answers under uncertainty (guess rather than abstain); weak grounding; long free-form traces |
| Tool-selection / tool-execution error | Wrong or unnecessary tool, bad args, tool bypass, stale/off-strategy returns   | Open tool autonomy; large tool menus; multi-turn ReAct                                                                                                                    |
| Scaffold / attention diversion        | Follows planning/memory/format instructions instead of the investment decision | Overloaded “All-In” scaffolds; prompt-level Planning / Memory bloat                                                                                                       |


**Key amplification channels:**


| Channel                  | What happens                                                            | Usual culprit                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Within-trace compounding | Mistake at step *t* treated as ground truth at *t+1…T* inside one agent | Long tool chains / ReAct with no checkpoints (Kim et al.: Independent MAS ~17× vs Centralized ~4× error amplification — architecture comparison) |
| Cross-agent propagation  | One agent’s bad claim becomes another’s premise                         | Debate / peer handoffs without a verifier who can *override*                                                                                     |


Worth knowing but secondary here: path stochasticity (same agent configuration, wild score dispersion), retrieval miss / lost-in-the-middle (Liu et al., 2024; right tools, wrong snippet), and schema/emit failures.

#### B.4 Net effect formula and plain-language rules

The same trade-off applies to **every layer** — model, scaffold, and components — not only tools and scaffolds. A stronger model can raise capability (information, reasoning, tool use, useful context window...), but it can also affect base error rate (e.g. more capable models may still hallucinate confidently or are better at masking uncertain claims). The scaffold then scales that base error through amplification.

> **Net(agent configuration) ≈ capability delta − (Base error delta × Amplification delta)**

- **Base error** is whatever enters at the source (hallucination, tool mistakes, scaffold diversion, …)
- **Amplification:** (>1) appears once you add multi-step traces, tools, or agent handoffs — within-trace compounding and cross-agent propagation. For a **floor LLM** agent configuration (single shot, no tools, no multi-agent), amplification collapses to ~**1×** and the error term is predominantly driven by the model’s **hallucination rate**.

In plain language:

1. Treat the **model** as another knob with the same mechanism: more intelligence ≠ free lunch if base error (hallucination rate) rises with it.
2. Add a scaffold / tool / agent only if its **marginal information** still exceeds its **marginal error × amplification**.
3. Prefer scaffolds that **cut amplification** (e.g. centralized verification on decomposable tasks) when errors are costly.
4. Prefer **simpler adequate** scaffolds when capability is high enough that CCI shrinks — do not assume “All-In” or “more tools” wins.

This is a conceptual and directional framework for now until we can directly measure the deltas and support applicability across a wide range of investment strategies and financial settings. Which is why I'm sharing it!

---

## Citation

If you reference this work, please cite:

```bibtex
@misc{lin2026optimizing,
  author       = {Lin, Felix},
  title        = {Optimizing {AI} Agents for Alpha Generation},
  year         = {2026},
  howpublished = {GitHub},
  url          = {https://felixdaga.github.io/Optimized_Agent/posts/2026-07-16-optimizing-ai-agents-for-alpha-generation/}
}
```

---

## References

Atil, B., et al. (2024). Non-Determinism of Deterministic LLM Settings. arXiv:2408.04667. [https://arxiv.org/abs/2408.04667](https://arxiv.org/abs/2408.04667)

Artificial Analysis. Intelligence Index methodology. [https://artificialanalysis.ai/methodology/intelligence-benchmarking](https://artificialanalysis.ai/methodology/intelligence-benchmarking)

Artificial Analysis. AA-Omniscience: Knowledge and Hallucination Benchmark. [https://artificialanalysis.ai/evaluations/omniscience](https://artificialanalysis.ai/evaluations/omniscience)

Bates, J. M., and Granger, C. W. J. (1969). The combination of forecasts. *Operational Research Quarterly*, 20(4), 451–468.

Fama, E. F., and MacBeth, J. D. (1973). Risk, Return, and Equilibrium: Empirical Tests. *Journal of Political Economy*, 81(3), 607–636.

Glasserman, P., and Lin, C. (2023). Assessing Look-Ahead Bias in Stock Return Predictions Generated by GPT Sentiment Analysis. *Journal of Financial Data Science*, 5(4). [https://doi.org/10.3905/jfds.2023.1.143](https://doi.org/10.3905/jfds.2023.1.143)

He, H., and Thinking Machines Lab (2025). Defeating Nondeterminism in LLM Inference. [https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)

Kim, Y., Gu, K., Park, C., Park, C., Schmidgall, S., Heydari, A. A., Yan, Y., Zhang, Z., Zhuang, Y., Liu, Y., Malhotra, M., Liang, P. P., Park, H. W., Yang, Y., Xu, X., Du, Y., Patel, S., Althoff, T., McDuff, D., and Liu, X. (2026). Towards a Science of Scaling Agent Systems. arXiv:2512.08296. [https://arxiv.org/abs/2512.08296](https://arxiv.org/abs/2512.08296)

Liu, M. (2026). More Is Not Always Better: Cross-Component Interference in LLM Agent Scaffolding. arXiv:2605.05716. [https://arxiv.org/abs/2605.05716](https://arxiv.org/abs/2605.05716)

Liu, N. F., et al. (2024). Lost in the Middle: How Language Models Use Long Contexts. *Transactions of the Association for Computational Linguistics*, 12, 157–173.

Newey, W. K., and West, K. D. (1987). A Simple, Positive Semi-Definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix. *Econometrica*, 55(3), 703–708.

Yao, S., et al. (2023). ReAct: Synergizing Reasoning and Acting in Language Models. *International Conference on Learning Representations (ICLR)*. [https://arxiv.org/abs/2210.03629](https://arxiv.org/abs/2210.03629)