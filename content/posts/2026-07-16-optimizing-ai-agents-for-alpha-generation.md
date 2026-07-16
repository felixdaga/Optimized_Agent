---
title: "Optimizing AI Agents for Alpha Generation"
date: 2026-07-16T12:00:00+08:00
author: "Felix Daga"
description: "A systematic framework for optimizing AI agents as an additive source of alpha — with a full DJIA demonstration on Delorean."
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

## Mission statement

Introducing a novel scientific investment research framework for optimizing AI agents as an additive and durable source of alpha.

### How to read this


| Layer         | Sections                                                                                                                   | Time      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Skim**      | [Key findings](#key-findings) → [Headline results](#headline-results) → [Implications](#implications)                      | ~5 min    |
| **Implement** | [How we tested](#how-we-tested) → [Framework](#the-systematic-ai-agent-optimization-framework)                             | ~20 min   |
| **Verify**    | [Analytics](#analytics-beyond-headline-kpis) → [Iterations](#step-6-iterations) → [Sophistication](#output-sophistication) | ~30 min   |
| **Reference** | [Appendix](#appendix) — terminology, checklists, theory digest, cost                                                       | as needed |


---

## Novelty

- First general framework that combines scientific AI practice and research with systematic investment research to optimize AI agents based on a given investment strategy, including a method to single-shot a hypothetical near-optimal **agent configuration** prior to any backtesting, expanded upon Kim et al. (MIT/Google) and Liu (Amazon).
- First study and incorporation of the implications of LLM stochasticity in applied investment research.
- To my knowledge, the first systematic comparison of floor LLM vs popular agentic scaffolds on idiosyncratic cross-sectional alpha — not portfolio returns or reasoning accuracy alone.[^related-work]
- Identified statistically significant idiosyncratic alpha from an AI agent developed through the framework.

[^related-work]: Prior work compares individual agent architectures (FinMem vs FinAgent; FINSABER), model families on a shared agent template (KTD-Fin), or multi-agent desks vs rule baselines (TradingAgents). Kim et al. compare SAS vs MAS on a financial *reasoning* benchmark, not deployable signal KPIs on a common strategy. Our contribution is the joint grounding grid — floor LLMs with model-axis swaps plus off-the-shelf scaffolds on the same cross-sectional strategy — with headline KPIs, K-repeat stochasticity, and multi-layer output characterization (twin continuity, factor attribution, rationale sophistication).

## Key findings

**1. Stochasticity is real — and controllable.** Same frozen agent configurations on identical inputs produce materially different scores and PnL; mean score dispersion spans **~4.4×** across scaffolds (floor LLM vs OpenClaw). A **single backtest is one draw**, not the signal. Fix: **K independent repeats**, equal-weight ensemble per (date, ticker) ([Step 4](#step-4--incorporation-of-stochasticity--initial-runs)). Twin continuity confirms recoverable agent-configuration identity (82–100% NN hits vs ~8% chance) — [analytics](#twin-continuity-nearest-neighbour-test).

**2. Better is not always better.** Financial performance is often dominated by **error rate × amplification**, not raw model intelligence or agentic sophistication. Simpler agentic configurations or more grounded models then to perform better than their "sophisticated" variants; **Grok 4.5 < Grok 4.3** on idiosyncratic fundamental insights. Popular agentic features can hurt if noise is not controlled, **including a performance feedback loop** ([iteration 2](#iteration-2--performance-reflection-learning-loop)). Deeper rationales ≠ better quantitative scores ([sophistication](#output-sophistication)). Net effect: `capability gain − (base error × amplification)`; tool calls, debate, and planning often raise the second term more than the first ([Appendix D](#appendix-d--theory-digest-kim-liu-error-taxonomy)).

**3. You can construct a better agent by theory.** Strategy and task structure govern scaffold choice: parallel information streams → **specialists + centralized verifier**; sequential chains → single agent; knowable information set → **prefetch**, not open tool loops. A proprietary finance-specific error taxonomy guides us to **first-shot an ex-ante agent configuration** that stripped error amplifiers (tool loops, unverified debate) and added error reducers (stream-aligned split, evidence audit) — **no iterative tuning required to beat the grounding grid on performance and significance** ([ex-ante agent](#ex-ante-agent)). Priors that held: verification beats debate; memory/reflection often net-negative; mid-tier grounded model beats frontier model intelligence with high hallucination; just **don't use OpenClaw as your investment agent :)**

**4. Iteration works — and we demonstrated it.** **Headline KPIs:** residual IC + NW *t* after style + sector factor controls. Over **~16k ticker-views** (11 agent configurations, K = 3, DJIA quarterly panel), **only the ex-ante agent** cleared a credible headline KPI bar (**residual NW *t* > 3**). Controlled iterations moved headline KPIs as predicted while preserving agent-configuration character ([iterations](#step-6-iterations)).

## Headline results from framework demonstration

One strategy, one KPI stack, one grounding grid — **9 agent configurations + ex-ante** at h1 (K = 3, Pearson). Sorted by **residual NW *t***:


| Agent configuration         | Residual IC | NW *t*   |
| --------------------------- | ----------- | -------- |
| **Ex-ante agent**           | 0.139       | **3.24** |
| Floor LLM (MiMo)            | **0.167**   | 2.67     |
| Floor LLM (MiMo, no memory) | 0.165       | 2.62     |
| Floor LLM (MiniMax)         | 0.097       | 2.15     |
| Trading agent               | 0.127       | 2.10     |
| Floor LLM (Grok 4.3)        | 0.091       | 1.70     |
| OpenClaw agent              | 0.077       | 1.35     |
| Floor LLM (Grok 4.5)        | 0.058       | 1.24     |
| Floor LLM (GLM)             | 0.058       | 1.21     |


{{< chart "main-residual-mean-ic.svg" "Residual IC (h1)" >}}

{{< chart "main-residual-nw-t.svg" "Residual NW t (h1)" >}}

**Read.** Floor LLM (MiMo) posts the **highest residual IC** (0.167) — but only the **ex-ante agent** clears a credible headline KPI bar at **NW *t* > 3** (3.24): orthogonal edge that is also **stable across periods**, not factor reload or a lucky quarter. Every other agent sits at or below conventional |t| ≈ 2.7; OpenClaw does not clear |t| ≈ 2.

**Gross → residual.** For almost every agent configuration, both **gross IC and NW *t* fall** after style + sector factor controls — gross strength partly reloads known factor loadings from the same PIT sources. Exception: **Floor LLM (Grok 4.3)** ticks up slightly on NW *t* (1.53 → 1.70) while IC still drops. **Ex-ante** is the standout: both metrics **rise** after factor controls (IC 0.113 → 0.139; NW *t* 2.31 → 3.24) — cleaner and more significant once factor exposure is removed.

**Trends:**

- **Floor LLM beats off-the-shelf scaffolds** — MiMo floor 0.167 / NW *t* 2.67 vs OpenClaw 0.077 / 1.35 and trading agent 0.127 / 2.10.
- **Trading agent > OpenClaw** — aligns with Kim et al. Finance-Agent (**MAS > SAS** on decomposable reasoning), but both trail the floor LLM.
- **Floor model axis:** higher model intelligence + higher hallucination tends to underperform when hallucination is the main error driver (Grok 4.5 vs 4.3).

Full setup, [KPI pipeline](#headline-kpi-pipeline), and grid design: [How we tested](#how-we-tested). Deeper analytics: [below](#analytics-beyond-headline-kpis).

## Implications

**If you deploy or plan to deploy an AI agent on a sizable portfolio, you should optimize it;** Your current setup is **likely suboptimal** — possibly **worse than a simpler, cheaper** variant albeit with larger uncertainty. A single-run backtest will not suffice. Credible optimization requires: **defined strategy and KPIs**; **K repeats and ensembling**; a **grounding grid**; **one-knob iterations**; analytics beyond headline KPIs (stochasticity, twin continuity, factor attribution). This demonstration alone: **~16k ticker-views**, **11 agent configurations**, **one** agent with credible headline KPIs.

The good news: this post presents a scalable **framework** and (soon) an open-source platform — Delorean — to run it end-to-end. The same logic extends to any scorable AI output in an investment process (daily brief, sentiment extract). Cost and audience notes: [Appendix C](#appendix-c--cost-data-and-audience).

---

## How we tested

One shared backtest design for every agent configuration — same strategy, data world, KPI stack, and ensembling rules.


| Element                   | Choice                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Strategy**              | Fundamental equity analyst: each agent rates a company’s **risk/reward profile** (~1y risk-adjusted reward). A **rating**, not sizing, stops, or timing.                                                     |
| **Data (PIT-controlled)** | **Massive** (primary): US prices, fundamentals, news, filings; **Brave** (secondary): web search/snippets where tools/prefetch allow. Cached locally; see [Appendix C](#appendix-c--cost-data-and-audience). |
| **Universe**              | DJIA-30; **point-in-time index constituents** per decision date (`dow30` preset) — survivorship-bias controlled                                                                                              |
| **Backtest window**       | **16** quarterly decision dates Jul 2022–Apr 2026 → **T = 15** non-overlapping h1 return periods (last date has no forward label).                                                                           |
| **Horizon**               | **h1** primary — forward return from one decision date to the next (one quarter, non-overlapping). h2+ reference only (overlapping holds, weaker power at T ~ 15).                                           |
| **Output**                | Continuous score in **[-1, +1]** (attractive / mild / neutral / unattractive bands) + short rationale + evidenced key factors.                                                                               |
| **Ensembling**            | **K = 3** independent runs per frozen agent configuration; same world, independent sessions.                                                                                                                 |


### Headline KPI pipeline

The estimand is not a single backtest draw or a raw score. **Headline KPIs** are only the last two outputs: **residual IC** and **NW *t*** (Newey & West, 1987) on the residual IC series. Everything before that is signal processing.

```text
raw score (K runs)
  → within-date z-score (per run) + equal-weight ensemble per (date, ticker)
  → per-date Pearson IC vs h1 forward return                         ← gross IC
  → Fama–MacBeth residual (style + sector factor controls)
  → per-date residual Pearson IC  ┐
  → NW t on residual IC series      ┘ headline KPIs
```

- **Ensemble the signal.** Each agent configuration is run **K = 3** times. Z-score within each decision date *inside each run*, then **equal-weight average** across K per (date, ticker). Same rule should be used live (Framework [Step 4](#step-4--incorporation-of-stochasticity--initial-runs)).
- **Gross IC.** Per date: Pearson correlation between ensemble score and realised h1 forward return. **Mean gross IC** averages over T dates, before factor controls.
- **Factor controls + residual signal.** Each date, **Fama–MacBeth** (Fama & MacBeth, 1973) OLS: regress the ensemble signal on style factors + **GICS sector dummies**; take the **residual cross-section**. Gross IC can reload known factor loadings from the same PIT sources — especially on a short panel in a **momentum** regime (T ~ 15).

**Headline KPIs:**

- **Residual IC** — Pearson IC of the residual cross-section vs forward return each date; **mean** over T. Orthogonal predictive power after factor controls.
- **NW *t*** — on the residual IC time series: mean(IC) ÷ HAC standard error (lag = h−1; at h1 lag = 0). Rewards period-to-period stability of the edge. We use NW *t* rather than a bootstrap ICIR CI because at T ~ 15 the ICIR ratio is fragile at the borderline.

### Grounding agent configurations

The grounding grid covers **floor LLMs** and two **off-the-shelf** scaffolds — all under the setup above, each with K = 3.

**Floor LLM model axis.** One scaffold — one PIT dossier, one LLM call per ticker, no tools — with **base model** swaps (plus one memory iteration on MiMo). Checkpoints span **model intelligence vs hallucination rate** using published Artificial Analysis priors[^artificial-analysis-floor] — not a monotonic capability ladder:

[^artificial-analysis-floor]: **Model intelligence** — Artificial Analysis [Intelligence Index](https://artificialanalysis.ai/methodology/intelligence-benchmarking). **Hallucination rate** — Artificial Analysis [AA-Omniscience Hallucination Rate](https://artificialanalysis.ai/evaluations/omniscience) (incorrect ÷ non-correct responses; lower is better). Scores as published at grid build time.


| Model (floor LLM label) | Intelligence Index | Hallucination rate | Role on model axis                                               |
| ----------------------- | ------------------ | ------------------ | ---------------------------------------------------------------- |
| MiMo-V2.5-Pro           | 42                 | 25%                | Control — also fixed on scaffold axis for agents below           |
| MiniMax-M3              | 44                 | **16%**            | Lowest hallucination rate in set                                 |
| GLM-5.2                 | 51                 | 28%                | Higher Intelligence Index score                                  |
| Grok 4.3                | 38                 | 25%                | Prior Grok iteration                                             |
| Grok 4.5                | **54**             | 52%                | Highest Intelligence Index; highest hallucination rate trade-off |



| Agent configuration                            | Scaffold                         | Key features                                                                        | Role                                                                     |
| ---------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Floor LLM (MiMo, no memory)**                | SAS — dossier LLM                | Full PIT dossier; no tools, no memory                                               | Capability floor — simplest implementation of the strategy               |
| **Floor LLM (MiMo)**                           | Same + log memory                | Platform injects same-ticker prior views (PIT-strict)                               | Memory iteration (Liu: memory often net-negative on retrieval-like work) |
| **Floor LLM (GLM / MiniMax / Grok 4.3 / 4.5)** | Same floor LLM scaffold          | Swap base model only; memory on                                                     | Model axis — intelligence vs groundedness                                |
| **OpenClaw agent**                             | Tool-heavy SAS (ReAct)           | Per-ticker think → tool → observe; MCP tools; **model-chosen** tool order and depth | Off-the-shelf “give your agent tools” pattern[^tradingagents-lineage]    |
| **Trading agent**                              | Multi-role desk (sequential MAS) | Fundamentals → narrative specialists (tool loops) → Bull → Bear → PM; memory off    | Off-the-shelf multi-agent desk pattern[^tradingagents-lineage]           |


[^tradingagents-lineage]: Trading agent lineage from [TradingAgents](https://github.com/TauricResearch/TradingAgents) — reimplemented and **trimmed for speed** (sequential lanes, capped tool/debate rounds), keeping role split, bull/bear debate, PM synthesis. Contrast point for “popular upgrade” without centralized verification. Does not represent official repo performance.

All agent scaffolds above use **MiMo** so the scaffold axis is read holding model fixed. Primary comparisons: floor LLM vs OpenClaw (tool autonomy); floor LLM vs trading agent (multi-role debate without verifier); model swaps within floor LLMs.

### Ex-ante agent

Framework **Step 3** applied: a **first-shot agent configuration** from the ex-ante framework and grounding priors — the **trading agent information space**, with error amplifiers stripped and error reducers added.

**Same skeleton as trading agent.** Identical universe, dates, model (MiMo), lookbacks, prefetch settings, and output schema. Same PIT data (prices, fundamentals/valuation, news, filings/web snippets).


|                          | Trading agent                                                                           | Ex-ante agent                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Workflow**             | Fund (tools) → Narr (tools) → Bull → Bear → PM                                          | Prefetch quant + qual packs → **Quant ‖ Qual** → **Verifier** → PM                                             |
| **Tools at reason time** | On — ReAct rounds (`evidence_mode: tools`); tool-selection mistakes compound in context | Off — **prefetch** evidence packs only at synthesis                                                            |
| **Specialist topology**  | Sequential fund → narrative; errors in lane 1 feed lane 2                               | **Parallel** quant ‖ qual — streams meet only at decision (Kim et al.: decomposable task → centralized MAS)    |
| **Roles**                | Fundamentals + Narrative (trading-desk habit)                                           | Quantitative (prices, ratios, fundamentals, valuation) + Qualitative (news, filings, web) — strategy PIT lanes |
| **Verification**         | Bull/Bear debate; no independent auditor vs raw evidence                                | **Centralized verifier** audits specialist reports against evidence packs; debate dropped                      |
| **LLM calls / ticker**   | Variable (tool + debate depth)                                                          | **4** fixed (2 specialists + verifier + PM)                                                                    |
| **Memory**               | Off                                                                                     | Off                                                                                                            |


The ex-ante agent was specified and run once under the same rules as the grounding grid — then compared on headline KPIs. Iterative agents (memory/feedback, verifier removed) are Step 6 iterations, not part of the grounding grid. Ex-ante design rationale and checklists: [Appendix A](#appendix-a--applying-the-ex-ante-framework).

---

## Analytics beyond headline KPIs

Stochasticity and ensembling sit **before** the headline KPI table in the read order: if K repeats are pure noise with no agent-configuration identity, comparing agent configurations or averaging runs is ill-posed. Twin continuity clears that gate; output stochasticity quantifies repeat disagreement; ensembling shows whether averaging K runs buys a cleaner signal.

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

**Where it fails (expected).** Almost all rank/factor misses are **MiMo floor LLM ± memory** swapping nearest neighbours — adjacent iteration, same generator, one knob different. Distant agent configurations (OpenClaw, trading agent, ex-ante, model swaps) do not cross-match at random.

### Output stochasticity

Mean score std across K at each (date × ticker) cell, plus **sign agreement**, **rank correlation** (Spearman on within-date ranks), and rationale similarity. Lower score std / higher agreement = a more reproducible generator.

Stochasticity is **real and economically large** — mean score std spans **0.029–0.129** (**4.4×** across nine agent configurations on identical inputs). **OpenClaw** is the outlier: ~**4×** the MiMo floor’s score std and the lowest rank corr (0.66 vs 0.85 on MiMo). Agentic paths fork early (tool order, debate depth, growing context); floor LLMs stay tight. Trading agent: high sign agreement (0.99) but **low rank corr** (0.65) — runs agree on direction more than on the cross-sectional book. High score std pairs with low sign agreement and rank corr.

{{< chart "main-stochasticity.svg" "Output stochasticity — mean score std" >}}

{{< chart "main-score-std-by-date.svg" "Mean score std by decision date" >}}

**Example (JPM).** Same ticker, same dates, same inputs — yet raw decision scores diverge across K repeats and agent configurations. **OpenClaw** and **Grok 4.3** show the widest run-to-run spread; **MiMo floor LLMs** barely move on this name. Bold line = mean across K; faint traces = individual repeats.

{{< chart "main-score-by-ticker-jpm.svg" "Decision score by date — JPM (K = 3 per config)" >}}

### Ensembling — ensemble vs mean single-run gross IC

Equal-weight averaging the K transformed scores per (date × ticker) **lifts gross IC everywhere** at h1 — most where stochasticity is highest (dots = per-run IC; ◆ = ensemble gross IC). Per-run gross IC spread reaches **0.04+** on Grok 4.5 and MiniMax — vs **~0.008** on MiMo (no memory). **Ex-ante** and **OpenClaw** show the largest ensemble lift; **MiMo floor LLM** barely moves (paths already co-move). Matches forecast-combination logic (Bates & Granger, 1969): averaging cancels uncorrelated cross-run noise when the generator is wide. **Live implication:** report and deploy the **same K-then-average** object used in eval — a lucky or unlucky single seed is not the estimand.

{{< chart "main-ensemble-wobble.svg" "Ensemble vs single-run IC" >}}

### Factor attribution — style and sector loadings

Each date we regress the ensemble signal on seven style factors (value/earnings yield, 12–1 momentum, operating profitability, asset growth, inverse size, low-vol 60d, 1m reversal) plus **GICS sector dummies**; **mean R²** is the share of signal variance the bundle explains. Significant style **β** rows (|t| ≥ 2) show directional tilts; sector bias shows up in the sector-tilt chart.

1. **All agents carry lower R² than every floor LLM.** Off-the-shelf scaffolds explain less of their own signal variance through the style + sector bundle — more idiosyncratic before orthogonalisation. Floor LLMs sit at the top of the R² stack.
2. **Almost every agent configuration loads the same fundamental style triad: quality, earnings yield, low vol.** Operating profitability and earnings yield show up as significant positive β on nearly all floor LLMs and on the structured agents; low-vol loads on most agent configurations too. Aligns with the strategy — rating **risk-adjusted reward** from fundamentals and valuation — and with what the PIT dossier emphasises. The models are **re-expressing a quality/value/defensive screen** the control bundle already knows.
3. **Sector tilts are shared and DJIA-shaped: overweight Financials, underweight Industrials.** All three agents lean the same way; floor LLMs concentrate sector bets more. **Materials** and **Consumer Discretionary** are also consistently underweight across the grid.

{{< chart "main-mean-r2.svg" "Mean R² — style + sector controls" >}}

{{< chart "main-style-betas.svg" "Style-factor loadings" >}}

---

## Step 6 iterations

The ex-ante agent is a **first-shot**, not a claim of global optimum. Step 6 holds the best agent configuration fixed and turns **one component (or model/scaffold knob) at a time** — the only disciplined way to refine without confounding model, scaffold, and components. Results:

{{< chart "ablation-residual-mean-ic.svg" "Iteration — residual IC (h1)" >}}

{{< chart "ablation-residual-nw-t.svg" "Iteration — residual NW t (h1)" >}}

### Iteration 1 — Remove verifier

**Baseline verifier role.** Quant and qual specialists run **in parallel** on prefetch PIT packs; a **third LLM stage** audits both reports against the **raw evidence packs** (not against each other’s prose). It is **not** a second research analyst. Its job is an **adversarial audit** — flag:

- unsupported or numerically inconsistent claims vs what the packs actually contain;
- material evidence present in the packs but omitted from a report;
- valuation calls that ignore earnings quality or balance-sheet risk shown in the numbers;
- narrative-heavy conclusions without fundamental support;
- **cross-lane contradictions** (quant vs qual pointing different ways on the same fact);
- lane violations (quant citing news text, qual inventing figures).

The verifier emits a **structured advisory note** (forced tool call): severity, verified points, unsupported claims, and up to a few correction ids with required actions — plus an optional directional nudge (`KEEP` / `LOWER` / `RAISE` / `NEUTRALIZE`). The PM sees this block and is instructed to **weigh it but may override it**; it is not a hard veto gate. Cost: **one fixed LLM call per ticker** (four calls total vs three when off).

**Iteration design.** Identical to ex-ante except `enable_verification: false` — **Quant ‖ Qual → PM** with no audit hop. Same prefetch, same specialists, same model.

**Result.** **Worse than ex-ante** — residual IC and NW *t* both step down. Without the audit, specialist hallucinations, cross-lane contradictions, and omitted-risk calls propagate straight into the final score.

### Iteration 2 — Performance reflection (learning loop)

**Design.** Same ex-ante scaffold plus `memory.level: feedback`. After each decision date the runner records the score; once the forward window closes (h1), a **separate reflection call** compares prior view vs realised return and writes a short `performance_feedback` lesson. The PM sees prior lessons via **prompt inject only** — no `get_memory` tool, no re-fetch at reason time — and only on dates **strictly after** the outcome is realised (PIT-safe). Specialists and verifier unchanged.

**Result.** **Worse again** — net gain negative vs ex-ante, though still above OpenClaw and the trading agent on headline KPIs. This is another “sophistication” feature commonly assumed to improve performance — in a learning loop where the PM is supposed to improve from past mistakes. Plausible reads: the loop is not yet well refined; reflection text **bloats PM context** with noisy coach-lessons that compete with the current PIT dossier; or error propagation — a wrong lesson from a lucky/unlucky quarter steers the next score.

### What stayed stable

Despite both iterations underperforming ex-ante, they exhibit neighbouring **investment character**:

- **Gross → residual:** both still show **positive lift** in gross IC and NW *t* after style + sector factor controls — the same “signal gets cleaner under factor controls” signature as ex-ante.
- **Agent ranking:** both iterations **rank above every other agent scaffold** on headline KPIs.
- **Factor fingerprint:** style load directions **almost identical** to ex-ante (quality / earnings / defensiveness; Financials vs Industrials).

**Bottom line:** Wrong knobs hurt KPIs predictably; **character** persists — small iterations are stable enough to walk toward a nearer optimum one iteration at a time.

---

## Demonstration summary

This study is a **real-life demonstration of the framework**, not a claim of a production-ready money-making agent. The bar was **headline KPIs** on a short quarterly panel (T ≈ 15, DJIA-30, K = 3). We cleared **credible headline KPIs in one agent only** (ex-ante; residual NW *t* > 3); every other result is directional or for reference. The deliverable is the **method** and the **themes below** — not a single backtest winner.

**Themes (demo-specific beyond Key findings):**

1. **Iteration stability.** One-knob turns moved headline KPIs predictably while preserving twin/factor fingerprint — further iteration is tractable.
2. **Sophistication paradox.** Agent scaffolds write deeper rationales without better residual edge ([sophistication](#output-sophistication)); quantitative output is the bridge to portfolio impact, not the fact words.
3. **Factor-reload vs additive synthesis.** Most agent configurations lose gross IC and NW *t* after factor controls; ex-ante is the only standout where residual metrics **improve** — the signature of additive synthesis rather than factor mimicry.
4. **Scaffold–strategy fit.** Prefetch + parallel streams + centralized verification beat tool-heavy SAS and unverified debate for this fundamental rating task.

**Limitations**

Read the themes as **framework validation**, not production proof:

- **Framework maturity.** Still **in development** — demonstrated on one strategy. Other use cases (sequential planning, high-entropy discovery, overlay outputs) may need a different agent-configuration framework.
- **Sample size.** T ≈ 15 quarterly h1 periods on DJIA-30 — adequate for demonstration but short.
- **Single strategy and universe.** One KPI stack, one factor-control bundle. Results need not transfer without re-running the loop.
- **Model grid.** Mostly **open-weight via OpenRouter** (MiMo default on agents; floor model axis elsewhere).
- **Look-ahead and regime.** Frontier LLMs may encode post-training knowledge; identifier masking is imperfect. Window (~Jul 2022–Apr 2026) spans a **strong momentum** stretch — residual IC after factor controls defines headline KPIs, not a substitute for live attribution or formal incremental-return regression.
- **Off-the-shelf agents** depend on wiring; trading agent is a **reimplementation**, not official repo performance.
- **Methodological bounds.** K = 3 is pragmatic — path-rich scaffolds may need higher K.
- Kim et al. / Liu mappings are **qualitative priors**, not transferred coefficients. Error ↔ stochasticity in iterations is **consistent with** the framework but not variance-decomposed.
- Ex-ante agent is **first-shot** near-optimal, not a searched global optimum.

---

## Bonus chart: Output sophistication

Across **~4.3k** rationales in the main grid (480 per agent configuration × date × ticker; 9 agent configurations), an **LLM classifier** (blind to score and agent configuration) rated each rationale on a **fixed 0–4 sophistication scale**: 0 stat recital → 1 single-factor → 2 multi-factor synthesis → 3 franchise/moat → 4 strategic synthesis.

Sophistication climbs a clean "intuitive" ladder — **agent scaffolds > floor LLM > weaker model**. **Floor LLM (MiMo)** posts the highest mean residual IC with modest sophistication; **OpenClaw** writes materially deeper rationales but clears neither residual IC significance nor gross IC edge; **Trading agent** tops the sophistication chart yet trails the floor LLM on residual IC and NW *t*. **Ex-ante** is the partial exception — structured depth *and* the only agent with residual NW *t* > 3 — but not the most eloquent on the ladder.

We could conflate **articulate synthesis** with **correct, additive skill** — a distinction that collapses when the output space reduces from the semantic to quantitative dimensions. More agentic structure buys richer prose and more strategic vocabulary; it also buys stochasticity, tool tax, and error-amplification paths that can destroy ranking edge.

Never judge a book by its cover — same goes for your AI agent.

{{< chart "main-sophistication-mean.svg" "Mean sophistication" >}}

{{< chart "main-sophistication-dist.svg" "Sophistication level distribution (L0–L4)" >}}

---

## The generalized systematic AI agent optimization framework

### Step 1 — Setup and design choices

Similar to how the AI industry leverages benchmarks during model training and harness engineering, specify KPIs for a given investment strategy as quantifiable optimization objectives. The KPIs should:

- **Capture realistic agent performance** — standard backtest KPIs (IC and adjacent metrics) over long horizons and regimes, or with demonstrated controls.
- **Demonstrate additivity** — net of contribution from individual sources your agent has access to; why use AI when sources do better mechanistically?
- **Avoid downstream implementation noise** — portfolio construction varies; cloud the direct agent contribution.

Define the output schema (buy/sell/hold or continuous score). Include key rationale and citations for semantic understanding and sense-checking.

This demo implements the above as **headline KPIs** (residual IC + NW *t*) — see [pipeline](#headline-kpi-pipeline).

### Step 2 — Grounding agent configurations

Generate sensible agent configurations for grounding and comparison. Cover **floor LLM** agent configurations — the simplest implementation:

- Each agent is an LLM fed with all relevant information (strategy prompt + raw data) to generate the output.

Include off-the-shelf agent configurations if available — they may substitute for the ex-ante agent if you skip Step 3.

### Step 3 — Ex-ante near-optimal agent configuration

Highly strategy-dependent and under-researched for financial application. This post synthesizes a practical framework from academic research and empirical findings ([How we tested](#how-we-tested)). Goal: **near-optimal agent configuration before running tests** — not a universal “best agent.”

**Core priors (detail in [Appendix D](#appendix-d--theory-digest-kim-liu-error-taxonomy)):**

- **Kim et al. (2026):** scaffold–task alignment beats agent count; decomposable parallel streams → centralized MAS + verification; sequential chains → SAS; tool-heavy + multi-agent pays a coordination tax.
- **Liu (2026):** cross-component interference — more scaffolding is not better; Tool Use often dominates; Planning/Memory often net-negative on retrieval-like work.
- **Error lens:** `Net(agent configuration) ≈ capability delta − (Base error delta × Amplification delta)`. Hallucination is one error source; tools, scaffold diversion, and multi-agent handoffs **amplify** base errors. Floor LLMs collapse amplification to ~**1×** — error is mostly model hallucination rate.

Practical checklists (strategy questions, SAS vs MAS, verification, component toggles): [Appendix A](#appendix-a--applying-the-ex-ante-framework). You can skip Step 3 and rely on the grounding grid — **Step 6 iterative runs** ensure empirical alignment either way.

#### Two notable papers (pointers)

**Kim, Y., et al. (2026; MIT/Google).** [Towards a Science of Scaling Agent Systems](https://arxiv.org/html/2512.08296). arXiv:2512.08296 — *how agents are wired*. Full digest: [Appendix D.1](#d1-kim-et-al-2026).

**Liu, M. (2026; Amazon).** [More Is Not Always Better: Cross-Component Interference in LLM Agent Scaffolding](https://arxiv.org/html/2605.05716). arXiv:2605.05716 — *which modules you turn on*. Full digest: [Appendix D.2](#d2-liu-2026).

### Step 4 — Incorporation of stochasticity + initial runs

LLMs are stochastic even at temperature 0 — same prompt, same weights, different answers under real serving (Atil et al., 2024; He & Thinking Machines Lab, 2025). Agentic scaffolds amplify this: a different tool call or debate turn changes the next context. A **single backtest is one draw from a distribution**, not the agent configuration’s true signal. Treat each frozen agent configuration as a stochastic signal generator and sample it.

Rule of thumb: more thinking, more paths (turns, tools, scaffolding) = more stochastic. Floor LLM paths tend to be tight; open tool-calling and multi-agent graphs open more forks. Path count is the driver — not model “intelligence” per se.

Under identical agent configurations, agents still carry inherent investment characteristics — how they reason, rank, and load. Within-configuration disagreement is noise *around* that character; Step 5’s twin / nearest-neighbour tests ask whether those characteristics are recoverable as an agent-configuration identity.

**How to ensemble:**

- Freeze the agent configuration (model, scaffold, components, prompts).
- Run the full backtest **K times in parallel** — same world, independent sessions. Start with **K = 3**; raise K when the scaffold is path-rich.
- Per (date, ticker), equal-weight average raw quantitative outputs before KPIs — not average at the KPI level.

**What it does:** averaging cancels diversifiable run-level stochasticity when paths are imperfectly correlated. Ensembled KPIs vs mean individual run KPIs tend to improve from noise reduction — more for stochastic scaffolds, less for near-deterministic floor LLMs; lockstep paths are diagnostic. **Live deployment** must use the same sampling methodology or what you trade ≠ what you test.

### Step 5 — Analytics

Evaluate and compare **headline KPIs** across agent configurations (residual IC + NW *t*; [pipeline](#headline-kpi-pipeline)), plus insights in order:

- Raw outputs — score distribution, score vs rationale correlation, semantic analysis
- Stochasticity — twin run variations and nearest-neighbour (NN) tests (NN underlies the assumption that each agent configuration has differentiable, modelable characteristics)
- Raw KPI performance
- Additivity tests — factor/bias controls

Downstream implementation analytics (portfolio optimization) are not part of the framework.

### Step 6 — Iterative runs and final agent configuration

Once a near-optimal agent configuration is confirmed, generate iterative runs — hold everything else constant while changing one axis: swap model, add memory or feedback, fine-tune prompts, or explore feeding vs tool-calling.

### Agent backtesting infrastructure

- **PIT control first.** All dossiers or tools must enforce PIT strictly so the agent can only access data on or before the backtest date. Underlying LLMs may still encode look-ahead — frontier models, or a backtest window extending beyond model training (common for lower-frequency strategies or regime testing). Identifier masking (Glasserman & Lin, 2023) is imperfect and often impractical with the wide information sets current agents access; we often want inherent LLM asset knowledge for judgments. Practical mitigations: KPI buffers; focus on **delta between iterative agent configurations** vs absolute levels; factor controls for biases.
- **Simulate deployed autonomy.** Close the backtest–live gap. Some critical features/data may not satisfy PIT or be too costly to implement live — simulate what you can. Example: if the agent uses tools to explore its information space, generate a twin MCP server with hardcoded PIT controls for the original skills/tools and expose that instead.
- **Good to have:**
  - **Strategy- and agent-agnostic infrastructure** — standardized runner and schema to feed data and catch outputs for comparability; central Delorean YAML to swap model, scaffold, components, and key variables (e.g. thinking level, temperature) for fingerprints and runtime traces.
  - **Concurrency** — runs are heavy and numerous; parallelism without sacrificing features (e.g. separate gateways if sub-agents cannot spawn in a local session).
  - **Retry mechanisms** — minimum impact when a single agent fails.
  - **Run-time diagnostics** — API/tool call failures happen more often than you expect.
  - **Cost tracing**

### Delorean

Delorean captures the end-to-end framework as a research tool — an **agentic skill** where the agent (or a researcher) can simply import and launch the backtest for itself (or for other agents) and run analysis **end-to-end via CLI**: `configure`, `run` / `repeat`, `report`, `compare`. With Delorean, I have significantly reduced the time and cost to backtest and compare a new agent configuration.

**Delorean will be published in [this repo](https://github.com/felixdaga/Optimized_Agent) when ready** — please **star it** if interested. Email me to join the project.

---

## Appendix

### Terminology

Quick reference for terms used throughout this post.


| Term                    | Meaning                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent**               | The running system that produces scores (or other outputs) on each decision date — what you would deploy or compare in practice.                            |
| **Agent configuration** | How an agent is built: **model** + **scaffold** + **components** (tools at reason time, memory, verifier, reflection, etc.), plus prompts and data feed.    |
| **Model**               | Base LLM (MiMo, Grok, GLM, …).                                                                                                                              |
| **Scaffold**            | How the agent is organized — floor LLM (single call), OpenClaw (ReAct + tools), trading desk (sequential MAS), ex-ante (prefetch + specialists + verifier). |
| **Components**          | Individual toggles within a scaffold (memory, tools at reason time, verifier, reflection, …).                                                               |
| **Floor LLM**           | Simplest agent configuration in the grid: one PIT dossier, one LLM call per ticker, no tools — model swaps define the floor LLM **model axis**.             |
| **Strategy**            | Investment job spec: universe, cadence, horizon, output schema, PIT data feed, and KPI stack.                                                               |
| **Headline KPIs**       | **Residual IC** + **NW *t*** only — after style + sector factor controls. Use **gross IC** for the pre-control read.                                        |
| **Framework Steps 1–6** | End-to-end optimization workflow (setup → grounding → ex-ante → stochasticity → analytics → iteration).                                                     |
| **Repeat**              | One independent full backtest pass of a frozen agent configuration (K = 3 per configuration in this demo).                                                  |


### Appendix A — Applying the ex-ante framework

#### A.1 Application checklists

Work top-down. Answer the questions in order; each row maps to a concrete agent-configuration choice.

**A. Strategy and information structure**


| Ask                                                                                                   | If yes / mostly…                          | Lean toward                                                                     |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| Can the job be split into **independent information streams** that only need to meet at the decision? | Yes (e.g. market / news / fundamentals)   | Centralized MAS: parallel specialists → aggregator / PM                         |
| Is the core work a **sequential constraint chain** (step N needs step N−1)?                           | Yes                                       | SAS (single agent, full context)                                                |
| Is the useful information set **knowable ex-ante** (stable PIT dossier)?                              | Yes                                       | Prefetch / feeding at reason time                                               |
| Must the agent **discover** sources interactively?                                                    | Yes                                       | Tool-using SAS (or decentralized explore); accept higher stochasticity; raise K |
| How costly is a single wrong fact relative to a missed insight?                                       | Very costly (most fundamental strategies) | Prefer verification + lower tool autonomy over max exploration                  |


**B. SAS vs MAS (Kim et al.)**


| Situation                                                       | Choice                                  | Why (compressed)                                                      |
| --------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Decomposable analysis + costly errors + moderate baseline skill | **Centralized MAS** + verifier          | Diversity + one-hop check; Kim et al. financial-reasoning-like regime |
| Sequential planning / dependent steps                           | **SAS**                                 | MAS fragments the chain; large degradations on planning-like tasks    |
| High-entropy search / browsing                                  | **Decentralized MAS** or tool-heavy SAS | Exploration value; watch coordination and tool tax                    |
| Baseline single-agent already strong (“saturated”)              | **SAS** (or don’t add agents)           | Capability-saturation pattern                                         |
| Tool-heavy *and* multi-agent                                    | Avoid or **strip tools at reason time** | Tool–coordination trade-off; prefer prefetch if PIT-feasible          |


**C. Verification layer (when you add agents)**


| Pattern                  | Use when                                                        | Avoid when                                                |
| ------------------------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| None (SAS)               | Sequential tasks; high baseline; tool loops that need one locus | Errors are expensive and single-pass error rate is high   |
| Self-reflection only     | Cheap; model can catch its own slips                            | Errors are subtle (model can’t see them)                  |
| Debate / peer critique   | Diverse interpretations; errors low-stakes                      | Errors compound across agents with no override            |
| **Centralized verifier** | Decomposable task; costly errors; verifier can veto specialists | Verifier is no better than specialists; pure latency sink |


**D. Component toggles (Liu-style scaffold, adapted)**


| Component                                   | Default bias for fundamental research (quarterly, PIT)     | Flip the default if…                                       |
| ------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Tool Use at reason time                     | **Off** if prefetch covers the set; else constrained tools | Information truly must be discovered live                  |
| Planning (prompt “decompose into subgoals”) | **Off** for retrieval-like synthesis                       | Task is genuinely multi-step procedural                    |
| Memory across periods                       | **Off** if decisions are largely independent               | Strong cross-period dependence / continuity thesis         |
| Structured reasoning / schema               | **On**                                                     | Schema blocks needed judgment (rare)                       |
| Reflection as separate stage                | Prefer **external verifier** over self-reflect-only        | Strict single-agent constraint                             |
| Ensemble K                                  | **K ≥ 3** for path-rich scaffolds; match live              | Near-deterministic floor LLM (still keep K≥2 for NN tests) |


#### A.2 Worked mapping (this study’s ex-ante agent — first shot, to refine)


| Decision     | Prior used                                                | Choice                                                    |
| ------------ | --------------------------------------------------------- | --------------------------------------------------------- |
| Task class   | Independent PIT streams (market / news / fundamentals)    | Decomposable → Centralized MAS                            |
| Tools        | Open autonomy worst under headline KPIs; tool–MAS tax     | Prefetch packs; tools off at reason time                  |
| Planning     | Prompt planning often net-negative on retrieval-like work | Pre-split specialists by data lane (scaffold-level split) |
| Memory       | Near-zero in our floor LLM memory iteration               | Off                                                       |
| Verification | Unverified MAS amplifies errors                           | Centralized verifier before PM                            |
| Model        | Alignment > raw model intelligence under correct topology | Mid-tier capable model (MiMo in demo)                     |
| Ensemble     | Path noise from MAS                                       | K = 3, same at deploy                                     |


That specification is what we call the **ex-ante near-optimal** agent configuration: chosen from principles and grounding priors, then run under the same rules as floor LLMs and off-the-shelf scaffolds. It is “near-optimal” only relative to the strategy, KPIs, and grounding grid — validated and refined in the demonstration (residual NW *t* > 3 on first shot; iterations moved headline KPIs as predicted).

### Appendix B — Agent configuration labels (short)

Floor LLM — one PIT dossier, one LLM call. OpenClaw — ReAct + MCP tools. Trading agent — sequential tool specialists + Bull/Bear + PM. Ex-ante — prefetch, specialists, verifier, PM. OpenClaw ~ tool-heavy SAS; trading agent ~ tool+MAS/debate; ex-ante ~ low tool autonomy + centralized verification (qualitative Kim et al. alignment, not transferred coefficients).

### Appendix C — Cost, data, and audience

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


**Data (Massive + Brave).** LLM tokens dominate; **market-data API spend is secondary** but constrains design. **Massive** — US-equity prices, fundamentals, ticker-scoped news, filings; sentiment fields from ~Jul 2024 only (thinner controls on earlier dates). **Brave** — PIT web search/snippets for tool-heavy scaffolds and ex-ante prefetch; cached on disk. Data cost stays small because Delorean **reuses cache** across K and agent configurations.

**Models.** Mostly **open-weight via OpenRouter** (MiMo default; GLM, MiniMax, Grok on floor LLMs). **Anthropic / OpenAI** would be natural comparators but **API access is restricted from my location** — this grid is not a full frontier shootout.

**Scaling law.** Spend scales roughly linearly with **K**, **universe**, **dates**, **agent configurations in the grid**, **LLM calls per ticker**, and **model $/token**. Rule of thumb: **O(universe × dates × K × agent configurations × calls-per-ticker)**. A quarterly DJIA study at floor LLM scale is enthusiast-affordable; **high-frequency S&P 500** with agentic scaffolds is not without institutional budget. Delorean amortizes data and parallelizes runs; it does not change the exponent.

#### Who is this framework for?

- **Enthusiast/retail investors building their own agents — yes.** I am one. Total spend **~$300** on LLM (OpenRouter) and data APIs (Massive/Brave Search) for the full demonstration grid — justifiable for optimizing an agent behind the average personal portfolio. I have spent far more time on infrastructure; I am not aware of an open-source, agent-agnostic backtesting platform that parallels this framework. Focus now: open-sourcing Delorean. I **controlled** for costs via open-source models (would love OpenAI/Anthropic but restricted in my location; Gemini next), DJIA-30, quarterly cadence, 16 dates. **High-frequency S&P 500** with agentic scaffolds: cost could **implode**.
- **Institutions or funds.** Cost is less of a concern; rigor is often imposed. Most institutions leverage AI to **improve** an existing process, not yet as a direct alpha source. This framework also applies **inside** that process for any scorable overlay (daily brief, sentiment score) — backtest and optimize against metrics you care about. For **direct alpha generation**, this demonstration is a systematic framework to **power or inspire** your own process.

### Appendix D — Theory digest (Kim, Liu, error taxonomy)

#### D.1 Kim et al. (2026)

**Kim, Y., et al. (2026; MIT/Google). [Towards a Science of Scaling Agent Systems](https://arxiv.org/html/2512.08296).** arXiv:2512.08296 — *how agents are wired*:

- Architecture–task alignment matters more than number of agents. Across 260 agent configurations in Kim et al.'s six benchmarks, a mixed-effects model (R² ≈ 0.37) predicts architecture choice at ~87% accuracy on held-out configurations *within those benchmarks*.
- Three recurring patterns: (1) **capability saturation** — once a single-agent baseline is already strong, adding agents tends to hurt; (2) **tool–coordination trade-off** — tool-heavy work pays a multi-agent tax (token budget fragmentation); (3) **error amplification** — independent / unverified multi-agent traces amplify early errors ~17×; centralized verification cuts that to ~4×.
- Decomposability is the governing task property: parallel, independent information streams → centralized multi-agent with verification; sequential / planning-like chains → single-agent; high-entropy search → more decentralized exploration.
- On their **Finance-Agent** benchmark specifically (entry-level analyst / multi-step financial reasoning; factual-correctness metric), Finance is their *strongest MAS-positive* domain: all multi-agent topologies beat SAS, with Centralized best at **+80.8%** vs SAS (mean 0.631 vs 0.349), then Decentralized +74.5%, Hybrid +73.1%, and Independent still about +57%. Mechanism they give: the task naturally splits into parallel information streams (e.g. news/regulatory, filings, operational factors) that a centralized orchestrator can verify and synthesize.

#### D.2 Liu (2026)

**Liu, M. (2026; Amazon). [More Is Not Always Better: Cross-Component Interference in LLM Agent Scaffolding](https://arxiv.org/html/2605.05716).** arXiv:2605.05716 (posted 7 May 2026) — *which modules you turn on inside an agent*:

- More scaffolding is not better. On retrieval QA, every proper subset matches or beats the “All-In” agent; on math, the optimal subset still beats All-In. Specific Shapley ranks are benchmark-specific, but the *directional* pattern (cross-component interference / CCI; gap shrinks with model scale) replicates across families.
- On HotpotQA-style retrieval: Tool Use dominates value; Planning is often harmful; Memory is directionally negative; interactions are frequently **sign-flipping**, not gentle diminishing returns.

#### D.3 Error rate and amplification

The insight is that error rate plays a large role in driving the financial performance of agents. Often, it can overpower the information/capability gains from the same agent configuration via cross-component interference:

> **Agent configuration net effect = Information/Capability gain − Error cost**

**Hallucination is only one error source.** For agents, the economically relevant failures are better split into (i) where the bad fact/action is *born*, and (ii) how the scaffold *amplifies* it.

**Key error sources:**


| Source                                | What it looks like                                                             | Usual culprit                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fabrication / content hallucination   | Invented figures, citations, events, or outcomes not in the evidence           | Model hallucination rate — training/alignment that rewards fluent, confident answers under uncertainty (guess rather than abstain); weak grounding; long free-form traces |
| Tool-selection / tool-execution error | Wrong or unnecessary tool, bad args, tool bypass, stale/off-strategy returns   | Open tool autonomy; large tool menus; multi-turn ReAct                                                                                                                    |
| Scaffold / attention diversion        | Follows planning/memory/format instructions instead of the investment decision | Overloaded “All-In” scaffolds; prompt-level Planning / Memory bloat                                                                                                       |


**Key amplification channels:**


| Channel                  | What happens                                                            | Usual culprit                                                                                                |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Within-trace compounding | Mistake at step *t* treated as ground truth at *t+1…T* inside one agent | Long tool chains / ReAct with no checkpoints (Kim et al.: ~17× without verify → ~4× with centralized verify) |
| Cross-agent propagation  | One agent’s bad claim becomes another’s premise                         | Debate / peer handoffs without a verifier who can *override*                                                 |


Worth knowing but secondary here: path stochasticity (same agent configuration, wild score dispersion), retrieval miss / lost-in-the-middle (Liu et al., 2024; right tools, wrong snippet), and schema/emit failures.

#### D.4 Net effect formula and plain-language rules

The same trade-off applies to **every layer** — model, scaffold, and components — not only tools and scaffolds. A stronger model can raise capability (information, reasoning, tools...), but it can also affect base error rate (e.g. more capable models may still hallucinate confidently) and amplification channels. The scaffold then scales that base error through amplification.

> **Net(agent configuration) ≈ capability delta − (Base error delta × Amplification delta)**

- **Base error** is whatever enters at the source (hallucination, tool mistakes, scaffold diversion, …)
- **Amplification:** (>1) appears once you add multi-step traces, tools, or agent handoffs — within-trace compounding and cross-agent propagation. For a **floor LLM** agent configuration (single shot, no tools, no multi-agent), amplification collapses to ~**1×** and the error term is predominantly driven by the model’s **hallucination rate**.

In plain language:

1. Treat the **model** as another knob with the same mechanism: more intelligence ≠ free lunch if base error (hallucination rate) rises with it.
2. Add a scaffold / tool / agent only if its **marginal information** still exceeds its **marginal error × amplification**.
3. Prefer scaffolds that **cut amplification** (e.g. centralized verification on decomposable tasks) when errors are costly.
4. Prefer **simpler adequate** scaffolds when capability is high enough that CCI shrinks — but do not assume “All-In” or “more tools” wins.

This is a conceptual and directional framework for now until we can directly measure the deltas and confirm whether it is applicable across a wide range of investment strategies and financial settings. Nonetheless, it has enabled me to first-shot a better ex-ante agent configuration compared to all agent configurations in the grounding grid and aligns with all further iterative findings.

---

## Citation

If you reference this work, please cite:

```bibtex
@misc{daga2026optimizing,
  author       = {Daga, Felix},
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