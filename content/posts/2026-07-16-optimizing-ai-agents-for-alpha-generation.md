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

---

## Novelty

- First general framework that combines scientific AI practice and research with systematic investment research to optimize AI agents based on a given investment strategy, including a method to single-shot a hypothetical near-optimal configuration prior to any backtesting, expanded upon Kim et al. (MIT/Google) and Liu (Amazon).
- First study and incorporation of the implications of LLM stochasticity in investment research.
- First applied demonstration of such a framework identifying statistically significant idiosyncratic alpha from an AI agent.

## Key findings

**1. Stochasticity is real and substantial — but controllable.** Same frozen agent configurations on identical inputs can produce materially different scores and PnL: in our grid, mean score dispersion spans **~4.4×** across agentic scaffolds (one-shot LLM vs open tool-calling OpenClaw). Agentic capability and freedom amplify it — more turns, tools, and handoffs. A **single backtest is one draw**, not the signal. The fix is to treat each config as a **distribution**: **K independent repeats**, equal-weight ensemble per (date, ticker). Twin continuity confirms configurations still cluster as recoverable identities (82–100% nearest-neighbour hits vs ~8% chance) — noise exists, but **character persists**; ensembling can address diversifiable run-level wobble without pretending systematic errors away.

**2. More is not always better — actually, better is not always better.** The financial performance of your agent is often dominated by **error rate × amplification**, not raw intelligence or agentic sophistication. On the same model, a **one-shot LLM often outperforms** open ReAct + tools (Yao et al., 2023) and a multi-role trading desk; **Grok 4.5** (higher intelligence, higher hallucination) underperformed **Grok 4.3** on idiosyncratic fundamental insights — smarter words do not equate to better scores. Popular agentic features can hurt performance, **such as a performance feedback loop**; **OpenClaw-style configuration** was the noisiest and weakest performer among tested agents. The sophistication paradox: **deeper rationales ≠ better quantitative insights**. Net effect from introducing an additional configuration change or different model ≈ **capability gain − (base error × amplification)**; tools, debate, and planning often raise the second term more than the first.

**3. There is a method to construct a better agent before any backtesting.** Strategy and **task structure** govern architecture: independent information streams (market / fundamentals / news) → **parallel specialists + centralized verifier**; sequential chains → single agent; knowable information set → **prefetch and feed**, not open tool loops at run-time. Further expanding Kim et al. (MIT/Google; agent scaling), Liu (Amazon; cross-component interference), and a proprietary finance-specific error taxonomy, we **first-shot an ex-ante configuration** that stripped error amplifiers (tool loops, unverified debate) and added error reducers (stream-aligned split, evidence audit) — **no iterative tuning required to beat the grounding set of configurations on performance and significance**. Common financial priors that held in the demo: verification beats debate; memory/reflection often net-negative on retrieval-like synthesis; mid-tier grounded model beats frontier IQ with high hallucination; **don't use OpenClaw / Claude Code as your investment agent**!

**4. Systematic iteration can optimize toward additive alpha — and we demonstrated it.** Promotion bar: **residual mean IC + Newey–West t** after style + sector scrub — additive edge, not factor reload. Over **~16k ticker-views** (11 configs, K = 3, DJIA quarterly panel), **only the ex-ante agent** cleared a credible threshold (**residual NW t > 3**). Controlled ablations moved KPIs in the direction the framework predicts while preserving configuration “character”; the iterative impact is stable enough to refine one axis at a time.

## Implications

**If you have deployed, or are planning to deploy, an AI agent to trade a sizable portfolio, you must first assess and optimize it scientifically and comprehensively.** Your current setup is **likely suboptimal**, and perhaps even **worse than a simpler, cheaper** variant while carrying larger uncertainties. A standard single-run backtest will not suffice. Credible agentic optimization requires: a **defined mandate and KPIs**; **K repeats and ensembling to model stochasticity**; a **grounding grid** of sensible configurations; **one-knob iterative ablations**; and analytics beyond headline IC (stochasticity, twin continuity, factor attribution). This is not a simple exercise — it often requires deep understanding of the information dependencies and role/task decomposability of your strategy, plus dozens of backtests and thousands of agent simulations. In this demonstration alone, **~16k ticker-views** across **11 configs** (K = 3) yielded **one** cell with credible residual significance.

The good news: this paper presents a scalable **framework** you can adopt for implementation, with an open-source platform to follow that aims to make doing so as simple and efficient as possible. The same logic extends beyond trading to any scorable AI output within an investment process (daily brief, sentiment extract). Run-cost details: [Appendix C](#appendix-c--cost-and-data-of-this-demonstration).

---

## The systematic AI agent optimization framework

### Step 1 — Setup and design choices

- Similar to how the AI industry leverages various benchmarks during model training and harness engineering, we will need to specify a set of KPIs for a given investment strategy to serve as quantifiable objectives for the optimization process. The KPIs in this case should:
  - Capture as closely as possible the agent performance in different realistic situations: Standard backtest KPIs are natural candidates, such as the Information Coefficient (IC) and its adjacent metrics. Backtests should ideally span long horizons and different likely regimes — or at least demonstrate controls.
  - Demonstrate additivity: The KPIs should be net of the contribution from the individual sources your agent has access to — why use AI with the extra uncertainties/costs when the sources can do a better job mechanistically.
  - Avoid capturing downstream implementation-driven impact, since that could vary widely and cloud the direct contribution from the agent.

You also have to define the output schema of your agent, whether it is buy/sell/hold or a continuous score. It is advised to also include key rationale and citations for semantic understanding and sense-checking.

### Step 2 — Grounding configurations

- Generate a set of sensible agent configurations for grounding and comparison. The grounding configurations should cover the floor configurations that represent the simplest implementation of your agent. I recommend a minimal set of base configurations where:
  - The "agent" is just a range of LLM models fed with all relevant information (strategy prompt + raw data) to generate the output.
- It can also include any available or off-the-shelf configurations you have — the more the merrier. Though they might serve in place of the ex-ante agent if you are skipping Step 3.

### Step 3 — Ex-ante near-optimal configuration

While this is highly strategy-dependent and under-researched, especially for financial application, I have synthesized a practical framework from various academic research alongside my empirical findings, demonstrated in the [Framework demonstration](#framework-demonstration) section. The goal is not to claim a universal “best agent,” but to provide a disciplined way to achieve **near-optimal configuration before even running any tests**.

#### Two notable papers

**Kim, Y., et al. (2026; MIT/Google). [Towards a Science of Scaling Agent Systems](https://arxiv.org/html/2512.08296).** arXiv:2512.08296 — *how agents are wired*:

- Architecture–task alignment matters more than number of agents. Across 260 configs / six agentic benchmarks, a mixed-effects model (R² ≈ 0.37) predicts architecture choice at ~87% accuracy on held-out configs *within those benchmarks*.
- Three recurring patterns: (1) **capability saturation** — once a single-agent baseline is already strong, adding agents tends to hurt; (2) **tool–coordination trade-off** — tool-heavy work pays a multi-agent tax (token budget fragmentation); (3) **error amplification** — independent / unverified multi-agent traces amplify early errors ~17×; centralized verification cuts that to ~4×.
- Decomposability is the governing task property: parallel, independent information streams → centralized multi-agent with verification; sequential / planning-like chains → single-agent; high-entropy search → more decentralized exploration.
- On their **Finance-Agent** benchmark specifically (entry-level analyst / multi-step financial reasoning; factual-correctness metric), Finance is their *strongest MAS-positive* domain: all multi-agent topologies beat SAS, with Centralized best at **+80.8%** vs SAS (mean 0.631 vs 0.349), then Decentralized +74.5%, Hybrid +73.1%, and Independent still about +57%. Mechanism they give: the task naturally splits into parallel information streams (e.g. news/regulatory, filings, operational factors) that a centralized orchestrator can verify and synthesize.

**Liu, M. (2026; Amazon). [More Is Not Always Better: Cross-Component Interference in LLM Agent Scaffolding](https://arxiv.org/html/2605.05716).** arXiv:2605.05716 (posted 7 May 2026) — *which modules you turn on inside an agent*:

- More scaffolding is not better. On retrieval QA, every proper subset matches or beats the “All-In” agent; on math, the optimal subset still beats All-In. Specific Shapley ranks are benchmark-specific, but the *directional* pattern (cross-component interference / CCI; gap shrinks with model scale) replicates across families.
- On HotpotQA-style retrieval: Tool Use dominates value; Planning is often harmful; Memory is directionally negative; interactions are frequently **sign-flipping**, not gentle diminishing returns.

#### Other side of the coin: Error rate

The insight is that error rate plays a large role in driving the financial performance of agents. Often, it can overpower the information/capability gains from the same configuration via cross-component interference:

> **Agent configuration net effect = Information/Capability gain − Error cost**

**Hallucination is only one error source.** For agents, the economically relevant failures are better split into (i) where the bad fact/action is *born*, and (ii) how the scaffold *amplifies* it.

**Key error sources:**


| Source                                | What it looks like                                                             | Usual culprit                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fabrication / content hallucination   | Invented figures, citations, events, or outcomes not in the evidence           | Model hallucination rate — training/alignment that rewards fluent, confident answers under uncertainty (guess rather than abstain); weak grounding; long free-form traces |
| Tool-selection / tool-execution error | Wrong or unnecessary tool, bad args, tool bypass, stale/off-mandate returns    | Open tool autonomy; large tool menus; multi-turn ReAct                                                                                                                    |
| Scaffold / attention diversion        | Follows planning/memory/format instructions instead of the investment decision | Overloaded “All-In” scaffolds; prompt-level Planning / Memory bloat                                                                                                       |


**Key amplification channels:**


| Channel                  | What happens                                                            | Usual culprit                                                                                                |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Within-trace compounding | Mistake at step *t* treated as ground truth at *t+1…T* inside one agent | Long tool chains / ReAct with no checkpoints (Kim et al.: ~17× without verify → ~4× with centralized verify) |
| Cross-agent propagation  | One agent’s bad claim becomes another’s premise                         | Debate / peer handoffs without a verifier who can *override*                                                 |


Worth knowing but secondary here: path stochasticity (same config, wild score dispersion), retrieval miss / lost-in-the-middle (Liu et al., 2024; right tools, wrong snippet), and schema/emit failures.

#### The hypothetical optimal agent: maximize capability gain minus error gain

The same trade-off applies to **every** configuration layer — including the model — not only tools and scaffolds. A stronger model can raise capability (information, reasoning, tools...), but it can also affect base error rate (e.g. more capable models may still hallucinate confidently) and amplification channels. Scaffold and architecture then scale that base error through amplification.

At a high level:

> **Net(Config) ≈ capability delta − (Base error delta × Amplification delta)**

- **Base error** is whatever enters at the source (hallucination, tool mistakes, scaffold diversion, …)
- **Amplification:** (>1) appears once you add multi-step traces, tools, or agent handoffs — within-trace compounding and cross-agent propagation. For a plain LLM with **no agent scaffold** (single shot, no tools, no multi-agent), amplification collapses to ~**1×** and the error term is predominantly driven by the model’s **hallucination rate**.

In plain language:

1. Treat the **model** as another knob with the same mechanism: more intelligence ≠ free lunch if base error (hallucination rate) rises with it.
2. Add a scaffold / tool / agent only if its **marginal information** still exceeds its **marginal error × amplification**.
3. Prefer architectures that **cut amplification** (e.g. centralized verification on decomposable tasks) when errors are costly.
4. Prefer **simpler adequate** scaffolds when capability is high enough that CCI shrinks — but do not assume “All-In” or “more tools” wins.

This is a conceptual and directional framework for now until we can directly measure the deltas and confirm whether it is applicable across a wide range of investment strategies and financial settings. Nonetheless, it has enabled me to first-shot a better ex-ante configuration compared to all configurations from the grounding set and aligns with all further iterative findings. Practical application checklists (mandate questions, SAS vs MAS, verification, component toggles) are in [Appendix A](#appendix-a--applying-the-ex-ante-framework). You could also adopt other methods to construct the ex-ante agent or skip this section completely for the grounding set — this is why iterative runs — Step 6 — are so important, as they ensure empirical alignment without relying on theories and assumptions.

### Step 4 — Incorporation of stochasticity + initial runs

LLMs are stochastic even when you set temperature to 0 — same prompt, same weights, and you can still get a different answer under real serving (Atil et al., 2024; He & Thinking Machines Lab, 2025). Agentic scaffolds amplify this further: a slightly different tool call or debate turn changes the next context, so scores and rationales could vary even more from the same configuration; a **single backtest is just one draw from a distribution, not the config’s true signal.** You have to treat each frozen configuration as a stochastic signal generator and sample it.

Rule of thumb: more thinking, more potential paths (more turns, tools, scaffolding) = more stochastic. Floor LLM calls tend to be tight; open tool-calling agents and multi-agent graphs open more forks. Path count is the driver — not model “intelligence” per se.

That said, under identical configurations agents still carry inherent investment characteristics that allow for differentiation and modelling — how they reason, how they rank, how the signal loads. Within-config disagreement is noise *around* that character; the complementary check (Step 5’s twin / nearest-neighbour tests) asks whether those characteristics are still recoverable as a config identity. If they are not, your configuration variations are too small for meaningful comparison.

**How to ensemble:**

- Freeze the configuration (model, scaffold, memory, tools, prompts).
- For each configuration, run the full backtest **K times in parallel** — same world, independent sessions. Start with **K = 3** for initial grounding; raise K when the scaffold is path-rich (open tools, long traces, multi-agent).
- Per (date, ticker), equal-weight average (since they are symmetrical) the raw quantitative outputs to form the ensembled outputs before KPIs are computed, instead of averaging at the KPI level.

**What it does:** averaging cancels diversifiable run-level stochasticity + noise when paths are imperfectly correlated. Ensembled KPIs vs mean individual run KPIs tend to be positive from noise reduction, higher for more stochastic scaffolds; near-deterministic floors move less; if the K paths move in lockstep, ensembling helps little — that is itself diagnostic.

Note this also implies that, upon live deployment, you have to adopt the same sampling methodology for alignment; otherwise what you trade ≠ what you test.

### Step 5 — Analytics

- The analytics should not only evaluate and compare the final KPIs across your set of configurations but also offer insights across the following layers in order:
  - Raw outputs for distributions and sanity checking — e.g. score distribution, score vs rationale correlation, semantic analysis
  - Stochasticity — e.g. for the same configurations, twin run variations and nearest-neighbour (NN) tests. The NN test is particularly important as it underlies the assumption that your configuration has inherent characteristics that can be differentiated from others and modelled
  - Raw KPI performance
  - Additivity tests — e.g. factor/bias controls
- Note: Downstream implementation and its analytics, such as portfolio optimization, are not part of the framework.

### Step 6 — Iterative runs and final configuration

- Once a near-optimal configuration is confirmed, you can then generate different iterative runs to optimize for the best configuration under the optimal agent framework until satisfactory. The iterations should hold everything else constant while iterating across a certain axis, e.g. swap a model, add memory or feedback, fine-tune key prompts, or explore feeding vs tool-calling.

### Agent backtesting infrastructure

- First and foremost it should aim at enforcing as much point-in-time (PIT) control as possible to avoid look-ahead bias. All dossiers or tools must enforce PIT strictly to ensure the agent can only access data on or before the backtest date. The underlying LLMs themselves are likely to have look-ahead bias, either because you will be using the latest frontier models (who wouldn't) or the minimal backtesting period extends beyond the date of model training (which happens for lower-frequency strategies or for regime testing). One option is to mask all identifiers from the data (Glasserman & Lin, 2023) but that is still imperfect and not practical with the wide information set current agents can access; often we want to leverage the inherent LLM knowledge of the asset to make judgments as well. A practical solution would be to establish buffers for the KPIs (sometimes focusing more on the delta between iterative configurations vs the absolute levels) and leverage factors to control for biases.
- Moreover, it should aim to simulate as much as possible the features and autonomy of the agent. This aims to close the gap between your backtest and deployed agent — invariably the two will differ slightly, as some critical features/data might not satisfy PIT control or be too costly to implement. An example for implementation: if the agent leverages tools to freely explore its information space, generate a twin MCP server with hardcoded PIT controls for the original skills/tools your agent has access to and expose that instead.
- Good to have:
  - Strategy- and agent-agnostic infrastructure — so you can easily swap and test without relying on different components that could drift. This means a standardized runner and schema to feed data and catch outputs from the agents for comparability. Also means a central config that allows you to swap across the configuration layers (model, tools, scaffold) and key variables (e.g. model thinking level, temperature) for fingerprints and runtime traces.
  - Concurrency — Each run will be heavy and there will be a lot of runs, so concurrency and parallelism features that enable speed without sacrificing features, e.g. separate gateways if sub-agents cannot be spawned in a local session.
  - Retry mechanisms — to ensure minimum impact to your runs when a single agent fails
  - Run-time diagnostics — to ensure each API or tool call is not breaking, which happens more often than you expect.
  - Cost tracing

### Delorean

To enable this study, I have built Delorean as a research tool that captures the end-to-end framework and provides the called-for infrastructure. It is designed as an **agentic skill** where the agent (or a researcher) can simply import and launch the backtest for itself (or for other agents) and run the analysis **end-to-end via CLI** — `configure`, `run` / `repeat`, `report`, `compare`. With Delorean, I have significantly reduced the time and cost to backtest and compare a new agent configuration.

I am open-sourcing Delorean so others can easily implement the framework and replicate the results. **Delorean will be published in [this repo](https://github.com/felixdaga/Optimized_Agent) when ready** — please **star it** if you are interested! Meanwhile, you can email me if you are interested in joining the project!

---

## Framework demonstration

### Setup

One shared backtest design for every configuration compared below — same mandate, data world, KPI stack, and ensembling rules.


| Element                   | Choice                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strategy**              | Fundamental equity analyst: each agent rates a company’s **risk/reward profile** (~1y risk-adjusted reward). A **rating**, not sizing, stops, or timing.                                                                  |
| **Data (PIT-controlled)** | **Massive** (primary): US prices, fundamentals, news, filings; **Brave** (secondary): web search/snippets where tools/prefetch allow. Cached locally; see [Appendix C](#appendix-c--cost-and-data-of-this-demonstration). |
| **Universe**              | DJIA-30; **point-in-time index constituents** resolved per decision date (`dow30` preset) — survivorship-bias controlled                                                                                                  |
| **Backtest window**       | Quarterly decision dates Jul 2022–Apr 2026 (**T ~ 15** h1 periods).                                                                                                                                                       |
| **Horizon**               | **h1** primary — forward return from one decision date to the next (one quarter, non-overlapping). h2+ reference only (overlapping holds, weaker power at T ~ 15).                                                        |
| **Output**                | Continuous score in **[-1, +1]** (attractive / mild / neutral / unattractive bands) + short rationale + evidenced key factors.                                                                                            |
| **Ensembling**            | **K = 3** independent runs per frozen config; same world, independent sessions.                                                                                                                                           |


#### Headline KPIs

The promotion object is not a single backtest draw or a raw score — it is **residual mean Pearson IC** and **Newey–West t** (Newey & West, 1987) on that IC series. Everything below is the pipeline that produces those two numbers:

```text
raw score (K runs)
  → within-date z-score (per run)
  → equal-weight ensemble per (date, ticker)
  → per-date Pearson IC vs h1 forward return        ← gross / face IC path
  → Fama–MacBeth residual (style + sector scrub)
  → per-date residual Pearson IC
  → mean residual IC + NW t on that IC series     ← headline KPIs
```

**Step 1 (KPI pipeline) — Ensemble the signal.** Each config is run **K = 3** times. Raw LLM scores often bunch and are not directly comparable across runs, so we z-score within each decision date *inside each run*, then **equal-weight average** across K per (date, ticker). That ensemble is the held signal for all KPIs — the same K-then-average rule should be used live if reported metrics are meant to describe the deployed signal.

**Step 2 (KPI pipeline) — Compute gross Pearson IC.** On each decision date, take the cross-section of names with both an ensemble score and a realised h1 forward return, and compute the **Pearson correlation** between those two series — one IC per date. **Mean IC** is the average over T dates. This is the gross / face read before any factor scrub.

**Step 3 (KPI pipeline) — Residual Pearson IC (Core KPI).** Gross IC can look strong when the model mostly **regurgitates known factor loadings** already represented mechanistically from the same PIT sources — especially on a short panel in a strong **momentum** regime (~four years of quarterly decisions; T ~ 15). To test **additivity / idiosyncrasy**, each date we run a **Fama–MacBeth** (Fama & MacBeth, 1973) cross-sectional OLS: regress the ensemble signal on style factors (also representing the core set of data attributes our agents have access to) + **GICS sector dummies**; take the **residual cross-section**; compute Pearson IC vs forward return on that residual. **Mean residual IC** is the promotion magnitude — predictive power **orthogonal to the control bundle**.

**Step 4 (KPI pipeline) — Residual Newey-West t (Core KPI).** Mean IC alone does not say whether the edge is real or a few lucky dates. NW *t* is computed on the **residual IC time series**: mean(IC) ÷ HAC standard error, lag = h−1 (overlap-robust at longer horizons; at h1 lag = 0 so the correction is mild). It asks whether that mean residual IC is distinguishable from zero. If IC swings wildly across dates, the variance term inflates the SE and *t* falls; if IC is consistent, SE is small and *t* rises. So a high *t* rewards period-to-period consistency/stability of the edge. We show NW *t* rather than a bootstrap CI on ICIR because at T ~ 15 the ICIR ratio is a small-n mean/std object whose bootstrap CI is right-skewed and fragile at the borderline.

**Headline KPIs for this demonstration:** **residual mean Pearson IC** + **NW t** on that series.

### Grounding configurations

The grounding set (Step 2) covers the **floor** and two **off-the-shelf** scaffolds — all run under the same setup above, each with K = 3.

**Floor model selection.** Floors hold the scaffold fixed — one PIT dossier, one LLM call per ticker, no tools — and vary the **base model** only (plus one memory ablation on MiMo). Checkpoints span **intelligence vs hallucination rate** using published priors (Artificial Analysis Intelligence Index; Omniscience hallucination / accuracy), not a monotonic IQ ladder:


| Model (floor label) | Intelligence | Hallu. rate | Role on model axis                                         |
| ------------------- | ------------ | ----------- | ---------------------------------------------------------- |
| MiMo-V2.5-Pro       | 42           | 25%         | Control — also fixed on the scaffold axis for agents below |
| MiniMax-M3          | 44           | **16%**     | Lowest hallucination in set                                |
| GLM-5.2             | 51           | 28%         | Higher intelligence                                        |
| Grok 4.3            | 38           | 25%         | Prior Grok iteration                                       |
| Grok 4.5            | **54**       | 52%         | Highest intelligence; highest hallucination trade-off      |



| Config                                     | Architecture                     | Key features                                                                                                                                | Design logic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Floor (MiMo, no memory)**                | SAS — dossier LLM                | Full PIT dossier in one prompt; no tools, no memory                                                                                         | **Capability floor** — pure model judgment on a fixed data packet; simplest implementation of the mandate                                                                                                                                                                                                                                                                                                                                                                                                |
| **Floor (MiMo)**                           | Same + log memory                | Platform injects same-ticker prior views (PIT-strict)                                                                                       | **Memory ablation** — isolates whether feeding prior decisions helps (Liu, Amazon: memory often net-negative on retrieval-like work)                                                                                                                                                                                                                                                                                                                                                                     |
| **Floor (GLM / MiniMax / Grok 4.3 / 4.5)** | Same as MiMo floor               | Swap base model only; memory on                                                                                                             | **Model axis** — does ranking edge track intelligence, groundedness, or neither? Same scaffold lets you read model swaps cleanly                                                                                                                                                                                                                                                                                                                                                                         |
| **Openclaw agent**                         | Tool-heavy SAS (ReAct)           | Per-ticker think → tool → observe loop; MCP tools (prices, fundamentals, filings, news, web, memory); **model-chosen** tool order and depth | **Off-the-shelf representative** of the popular “give your agent tools” pattern (OpenClaw / Claude Code style). Tests open autonomy vs the floor dossier                                                                                                                                                                                                                                                                                                                                                 |
| **Trading agent**                          | Multi-role desk (sequential MAS) | Fundamentals → narrative specialists (tool loops) → Bull → Bear → PM; memory off                                                            | **Off-the-shelf representative** of the popular open-source multi-agent framework. Lineage from [TradingAgents](https://github.com/TauricResearch/TradingAgents) — reimplemented and **trimmed for speed** (sequential lanes, capped tool/debate rounds), keeping the core pattern common across repos: role split, bull/bear debate, PM synthesis. Contrast cell for “popular upgrade” without centralized verification. This does not directly represent the performance of the official trading agent |


All agent scaffolds above use **MiMo** so the scaffold axis is read holding model fixed. Primary comparisons: floor vs OpenClaw (tool autonomy); floor vs trading agent (multi-role debate without verifier); model swaps within floors.

### Ex-ante agent

Step 3 applied: a **first-shot** configuration chosen from the ex-ante framework and grounding priors. Think of it as the **trading agent with the same information space**, but with error-amplifying features stripped and error-reducing structure added.

**Same world as trading agent.** Identical universe, dates, model (MiMo), lookbacks, prefetch settings, and output schema. The platform still builds the same PIT evidence (prices, fundamentals/valuation, news, filings/web snippets) — we did not shrink what the agent can see.

**What we stripped (error amplifiers):**

- **Tool loops at reason time** — trading agent’s fundamentals and narrative specialists run ReAct tool rounds (`evidence_mode: tools`); each extra turn is a new error and amplification surface (tool-selection mistakes, compounding context). Ex-ante **prefetches** the evidence packs and turns tools **off** at synthesis time.
- **Sequential specialist chain** — trading agent runs fund → narrative in series, so a mistake in the first lane becomes input to the second. Ex-ante runs **quantitative ‖ qualitative in parallel** — independent streams that only meet at the decision (Kim et al.: decomposable task → centralized MAS).
- **Bull/Bear debate without verifier** — peer critique with no agent that can audit against raw evidence and override bad claims; errors can propagate across handoffs. Ex-ante **drops the debate stage** entirely.

**What we reconfigured:**

- **Analyst roles by information stream**, not by trading-desk habit. Trading agent: *Fundamentals* + *Narrative* specialists (sequential, tool-heavy). Ex-ante: *Quantitative* (prices, ratios, fundamentals, valuation) + *Qualitative* (news, filings, web narrative) — aligned to the mandate’s natural PIT lanes and the ex-ante checklist (market / fundamentals / news as parallel inputs).

**What we added (error reducers):**

- **Centralized verifier** between specialists and PM — audits both reports against the **raw evidence packs** (not against each other’s prose), flags unsupported claims and cross-lane contradictions, emits structured advisory notes for the PM. Kim et al.: centralized verification cuts error amplification vs unverified multi-agent traces.

**Pipeline contrast:**


|                          | Trading agent                                  | Ex-ante agent                                                                 |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| **Per ticker**           | Fund (tools) → Narr (tools) → Bull → Bear → PM | Prefetch quant + qual packs → **Quant ‖ Qual** (parallel) → **Verifier** → PM |
| **Tools at reason time** | On (open tool rounds)                          | Off (prefetch only)                                                           |
| **Verification**         | Debate; no independent auditor                 | Centralized verifier vs raw evidence                                          |
| **LLM calls / ticker**   | Variable (tool + debate depth)                 | **4** fixed (2 specialists + verifier + PM)                                   |
| **Memory**               | Off                                            | Off                                                                           |


The ex-ante agent was specified and run once under the same rules as the grounding set — then compared on residual mean IC + NW t. Iterative agents (memory/feedback, verifier removed) are Step 6 ablations on this cell, not part of the grounding set.

### Results — initial KPI set

Headline metrics at **h1** on the grounding set + ex-ante agent (K = 3, Pearson face). Sorted by **residual NW t**:


| Config                  | Residual IC | NW t     |
| ----------------------- | ----------- | -------- |
| **Ex-ante agent**       | 0.139       | **3.24** |
| Floor (MiMo)            | **0.167**   | 2.67     |
| Floor (MiMo, no memory) | 0.165       | 2.62     |
| Floor (MiniMax)         | 0.097       | 2.15     |
| Trading agent           | 0.127       | 2.10     |
| Floor (Grok 4.3)        | 0.092       | 1.70     |
| Openclaw agent          | 0.077       | 1.35     |
| Floor (Grok 4.5)        | 0.058       | 1.24     |
| Floor (GLM)             | 0.058       | 1.21     |

{{< chart "main-residual-mean-ic.svg" "Residual mean IC by horizon" >}}

{{< chart "main-residual-nw-t.svg" "Residual NW t by horizon" >}}

**Key takeaway.** Floor (MiMo) posts the **highest mean residual IC** (0.167) — but only the **ex-ante agent** clears a credible significance bar at **NW t > 3** (3.24). That is the idiosyncratic-alpha read: orthogonal edge that is also **stable across periods**, not just a strong average inflated by factor reload or a lucky quarter. Every other cell sits at or below conventional |t| ≈ 2.7; OpenClaw does not clear |t| ≈ 2 at all on the residual.

**Factor attribution (gross → residual).** For almost every config, both **mean IC and NW t fall** after style + sector scrub — gross IC was partly reloading known factor loadings from the same PIT sources. The exception on NW t is **Floor (Grok 4.3)**, which ticks up slightly (1.53 → 1.70) while IC still drops. The standout is **ex-ante**: both metrics **rise** after scrub (IC 0.113 → 0.139; NW t 2.31 → 3.24) — the signal gets *cleaner* and *more significant* once factor exposure is removed, which is what you want if the claim is additive synthesis rather than factor mimicry.

**Trends (MiMo fixed where relevant):**

- **Floor beats off-the-shelf scaffolds** on the same model — Floor (MiMo) residual IC 0.167 / t 2.67 vs OpenClaw 0.077 / t 1.35 and Trading agent 0.127 / t 2.10. More agentic structure did not help under this KPI; open tools and unverified debate added error and noise.
- **Trading agent > OpenClaw** — structured multi-role desk beats open ReAct (aligning with Kim et al.'s Finance-Agent result that **MAS > SAS** on decomposable financial reasoning), but still trails the simple floor on both residual IC and t.
- **On the floor model axis, higher IQ + higher hallucination rate tends to underperform** when hallucination is the main error driver (amplification ≈ 1× on floors). **Grok 4.5** (IQ 54, hallu 52%) is the clearest case vs **Grok 4.3** (IQ 38, hallu 25%) — more “intelligence” without groundedness does not translate to residual edge. MiniMax (lowest hallu) and MiMo (control) sit at the top of the floor pack.

These reads line up with the ex-ante framework: strip error amplifiers (tools, unverified debate), add verification and stream-aligned architecture, promote on **residual** performance — and treat model IQ as a knob that trades off against hallucination rate, not a free upgrade.

### Sample of analytics beyond headline KPIs

Stochasticity and ensembling sit **before** the headline KPI table in the read order: if K repeats are pure noise with no config identity, comparing configs or averaging runs is ill-posed. Twin continuity clears that gate; output stochasticity quantifies how much repeats disagree; ensembling shows whether averaging K runs buys a cleaner signal.

#### Twin continuity (nearest-neighbour test)

**Question:** K repeats disagree — but does each config still cluster as a **recoverable identity**? For each of the **27 runs** (9 configs in the initial KPI grid × K = 3), find the closest peer in output-character space among the other 26. Count a **hit** when that neighbour is another repeat of the **same** config (a twin). Under random labels, hit rate ≈ **7.7%** (2 twins among 26 peers). We also shuffle config labels (500 draws) and require the observed rate to beat the null 95th percentile.

**Headline:** Twin continuity **passes on every face** for the initial set — config is a real clustering object, not a label on noise. Ensembling K runs and comparing configs is justified.


| Face                      | Hit rate | vs chance (~7.7%) | Label-shuffle null    |
| ------------------------- | -------- | ----------------- | --------------------- |
| Rationale (whole run)     | **100%** | ≫ chance          | PASS (null p95 = 22%) |
| Rationale (by date)       | **92%**  | t = 91.6          | PASS (null p95 = 17%) |
| Rank (whole run)          | **93%**  | ≫ chance          | PASS (null p95 = 19%) |
| Factor loadings (panel β) | **82%**  | ≫ chance          | PASS (null p95 = 19%) |


**What each face captures:**

- **Rationale** — cosine on mean rationale embeddings: do the *stories* cluster by config? Strongest signal (100% whole-run).
- **Rank** — Spearman on within-date score ranks, aggregated over the full schedule: do configs reproduce the same *book*? 93% whole-run.
- **Factor** — panel OLS loadings on seven style factors (~450 obs/run): do configs share a *style fingerprint*? 82% — identity persists in how the signal loads on known factors.

**Where it fails (expected).** Almost all rank/factor misses are **MiMo floor ± memory** swapping nearest neighbours — adjacent ablation, same generator, one knob different. Distant cells (OpenClaw, trading agent, ex-ante, model swaps) do not cross-match at random.

#### Output stochasticity

**Question:** How much do K repeats of the **same frozen config on the same inputs** disagree on the final score book? Measured at each (date × ticker) cell: **mean score std** across K, plus **sign agreement**, **rank correlation** (Spearman on within-date ranks), and rationale similarity. Lower score std / higher agreement = a more reproducible generator.

**Headline:** Stochasticity is **real and economically large** — and **configs vary widely** in how noisy they are. Model and scaffold choice is not just an IQ knob; it sets the width of the output distribution you must ensemble over.

**Key stats.** Mean score std spans **0.029–0.129** — a **4.4×** spread across nine configs on identical inputs. **OpenClaw** is the outlier: ~**4×** the MiMo floor’s score std and the lowest rank corr (0.66 vs 0.85 on MiMo). Agentic paths fork early (tool order, debate depth, growing context); one-shot floors stay tight. Trading agent is a split read: score-level agreement is high (sign agreement 0.99) but **rank corr is low** (0.65) — runs agree on direction more than on the cross-sectional book. The four metrics move together: high score std pairs with low sign agreement and rank corr.

{{< chart "main-stochasticity.svg" "Output stochasticity — mean score std" >}}

{{< chart "main-score-std-by-date.svg" "Mean score std by decision date" >}}

#### Ensembling — ensemble vs mean single-run gross IC

**Question:** If a single run is one draw from a noisy generator, does **equal-weight averaging the K transformed scores** per (date × ticker) lift gross RankIC vs the mean of the K single-run ICs? Dots = per-run IC at h1; ◆ = ensemble mean IC.

**Headline:** Ensembling **helps everywhere** on gross IC at h1 — most where stochasticity is highest. A single backtest systematically misstates skill when paths diverge.

**Key stats.** Per-run gross IC spread reaches **0.04+** on the noisier floors (Grok 4.5, MiniMax, GLM) and OpenClaw — vs **0.008** on MiMo (no mem), the tightest cell. **OpenClaw** and **ex-ante** show the largest ensemble lift given their per-run wobble; **MiMo floor** barely moves (paths already co-move). That matches forecast-combination logic (Bates & Granger, 1969): averaging cancels uncorrelated cross-run noise when the generator is wide; when paths are already aligned, K = 3 buys little extra. **Live implication:** report and deploy the **same K-then-average** object used in eval — a lucky or unlucky single seed is not the estimand.

{{< chart "main-ensemble-wobble.svg" "Ensemble vs single-run IC" >}}

#### Factor attribution — style and sector loadings

**Question:** How much of each config’s gross signal is **reload of known style and sector structure** already spanned by the PIT inputs — vs orthogonal alpha? Each date we regress the ensemble signal on seven style factors (value/earnings yield, 12–1 momentum, operating profitability, asset growth, inverse size, low-vol 60d, 1m reversal) plus **GICS sector dummies**; **mean R²** is the share of signal variance the bundle explains. Significant style **β** rows (|t| ≥ 2) show directional tilts; sector bias shows up in the sector-tilt chart (sectors enter as fixed effects, not β rows).

**Key findings:**

1. **All agents carry lower R² than every floor.** Off-the-shelf scaffolds (OpenClaw, trading agent, ex-ante) explain less of their own signal variance through the style + sector bundle — their books are **more idiosyncratic** before orthogonalisation. Floors sit at the top of the R² stack.
2. **Almost every config loads the same fundamental style triad: quality, earnings yield, low vol.** Operating profitability and earnings yield show up as significant positive β on nearly all floors and on the structured agents; low-vol loads on most configs too. That aligns with the mandate — rating **risk-adjusted reward** from fundamentals and valuation — and with what the PIT dossier emphasises (profitability, cheapness vs history, downside risk). The models are not inventing exotic style bets; they are **re-expressing a quality/value/defensive screen** the control bundle already knows.
3. **Sector tilts are shared and DJIA-shaped: overweight Financials, underweight Industrials.** All three agents lean the same way — bullish Financials, bearish Industrials — and floors show the same sign with **stronger magnitude** (floors concentrate sector bets more; agents dilute them slightly). **Materials** and **Consumer Discretionary** are also consistently underweight across the grid.

{{< chart "main-mean-r2.svg" "Mean R² — style + sector controls" >}}

{{< chart "main-style-betas.svg" "Style-factor loadings" >}}

### Step 6 — Iterative ablations and study close

The ex-ante agent is a **first-shot**, not a claim of global optimum. Step 6 holds the best configuration fixed and turns **one knob at a time** — the only disciplined way to refine without confounding model, tools, and architecture. We ran two ablations on the ex-ante configuration:

#### Ablation 1 — Remove verifier

**What the verifier does (ex-ante baseline).** In the ex-ante configuration, quant and qual specialists run **in parallel** on prefetch PIT packs, then a **third LLM stage** — the independent verifier — sits between them and the PM. It is **not** a second research analyst and does not rewrite the thesis or add outside facts. Its job is an **adversarial audit**: compare both specialist reports against the **raw evidence packs** (numbers pack + narrative pack still in the prompt) and flag:

- unsupported or numerically inconsistent claims vs what the packs actually contain;
- material evidence present in the packs but omitted from a report;
- valuation calls that ignore earnings quality or balance-sheet risk shown in the numbers;
- narrative-heavy conclusions without fundamental support;
- **cross-lane contradictions** (quant vs qual pointing different ways on the same fact);
- lane violations (quant citing news text, qual inventing figures).

The verifier emits a **structured advisory note** (forced tool call): severity, verified points, unsupported claims, and up to a few correction ids with required actions — plus an optional directional nudge (`KEEP` / `LOWER` / `RAISE` / `NEUTRALIZE`). The PM sees this block in its prompt and is instructed to **weigh it but may override it**; it is not a hard veto gate. Cost: **one fixed LLM call per ticker** (four calls total vs three when off).

**Design (ablation).** Identical to ex-ante except `enable_verification: false` — the graph becomes **Quant ‖ Qual → PM** with no audit hop. Same prefetch, same specialists, same model — only the one-hop check is removed.

**Result.** **Worse than ex-ante**, as expected — residual mean IC and NW t both step down. Without the audit, specialist hallucinations, cross-lane contradictions, and omitted-risk calls propagate straight into the final score. The framework prediction holds.

#### Ablation 2 — Performance reflection (learning loop)

**Design.** Same ex-ante scaffold plus `memory.level: feedback`. After each decision date the runner records the score; once the forward window closes (h1), a **separate reflection call** compares prior view vs realised return and writes a short `performance_feedback` lesson. The PM sees prior lessons via **prompt inject only** — no `get_memory` tool, no re-fetch at reason time — and only on dates **strictly after** the outcome is realised (PIT-safe). Specialists and verifier are unchanged. This is another “sophistication” feature commonly assumed to improve performance — in a learning loop where the PM is supposed to improve from past mistakes.

**Result.** **Worse again** — net gain is negative vs ex-ante, though still above OpenClaw and the trading agent on residual KPIs. Plausible reads: the loop is not yet well refined; reflection text **bloats PM context** with noisy coach-lessons that compete with the current PIT dossier; or error propagation — a wrong lesson from a lucky/unlucky quarter steers the next score. Either way, “add reflection” is not an improvement based on our strategy.

#### What stayed stable (why small iterations are useful)

Despite both ablations underperforming ex-ante, they exhibit neighbouring **investment character** across the analytics layers:

- **Gross → residual:** both still show **positive lift** in mean IC and NW t after the style + sector scrub — the same “signal gets cleaner under factor control” signature as ex-ante, not the factor-reload pattern of most floors.
- **Agent ranking:** both iterations **rank above every other agent scaffold** (OpenClaw, trading agent) on residual KPIs.
- **Factor fingerprint:** style load directions are **almost identical** to ex-ante (quality / earnings / defensiveness; Financials vs Industrials sector tilts in the same direction).

**Error, stochasticity, and ensembling.** The two ablations are the cleanest one-knob test: both exhibit higher stochasticity than ex-ante agents with lower performance — *consistent with* extra error surfaces (no audit hop; reflection context) showing up as run-to-run dispersion, though we did not decompose variance into errors vs benign noise. **Ensembling may partially neutralize that:** if mistakes differ across the K repeats, averaging scores can cancel idiosyncratic wrong calls the way it cancels path noise (Step 4). This only works when errors are **uncorrelated and unbiased** across runs; systematic errors or biases do not ensemble away — architecture still has to limit amplification, not only raise K.

**Bottom line:** Wrong knobs hurt KPIs predictably; **character** persists — small iterations are stable enough to walk toward a nearer optimum one ablation at a time.

{{< chart "ablation-residual-mean-ic.svg" "Ablation — residual mean IC" >}}

{{< chart "ablation-residual-nw-t.svg" "Ablation — residual NW t" >}}

{{< chart "ablation-stochasticity.svg" "Ablation — output stochasticity" >}}

### Demonstration summary

This study is a **real-life demonstration of the framework**, not a claim that I have discovered a production-ready money-making agent. The bar was **residual mean IC + NW t** on a short quarterly panel (T ≈ 15, DJIA-30, K = 3) — one mandate, one KPI stack, one grounding grid plus ex-ante and two iterative ablations. We cleared a **credible significance read in one cell only** (ex-ante, residual NW t > 3); every other result is directional or for reference. The deliverable is the **method** — stochasticity, ensembling, additivity and factor controls, twin continuity, controlled iteration — and the **recurring themes** observed:

**Themes observed**

1. **Stochasticity matters.** Same frozen config on identical inputs produces materially different outputs and thus investment outcomes (score std up to ~4× across scaffolds). Single-run backtests misstate skill; K repeats and ensemble averaging are part of the estimand, not an optional robustness check.
2. **More agentic scaffolding ≠ better;** Open tool autonomy and multi-role desks can broaden the information space and **increase stochasticity** while **hurting** residual KPIs vs a one-shot floor on the same model. Model IQ without groundedness is not a free upgrade (Grok 4.5 vs 4.3 on floors).
3. **Additive and idiosyncratic alpha from AI agents exist.** Most configs lose IC and t after style + sector scrub; gross strength often reloads known factor structure from the same PIT sources. The agent built with our ex-ante framework is the only standout where residual metrics **improve** after controlling for additivity and idiosyncrasy — and clear a credible statistical threshold.
4. **Architecture matches mandate.** Prefetch + parallel information streams as sub-agent split + centralized verification (ex-ante) beats tool-heavy SAS (OpenClaw) and noisy debate/learning loop.

**Framework and demonstration limitations**

Read the themes above as **framework validation**, not proof that it is production-ready. Specific limits of this run:

- **Framework maturity and scope.** This framework is still **in development** — test on **a few specific strategies** so far and demonstrated on one. A **different configuration framework** may be more suitable for other financial use cases (e.g. sequential planning chains, high-entropy discovery, overlay outputs such as briefs or sentiment scores). Treat it as a starting framework, not recipe.
- **Sample size and power.** T ≈ 15 quarterly h1 periods on DJIA-30 — adequate for demonstration but still short
- **Single mandate and universe.** One strategy (fundamental risk/reward rating), one KPI stack, one factor-control bundle. Results need not transfer to high-frequency trading, broad universes, or other output types without re-running the loop.
- **Model grid.** Mostly **open-weight via OpenRouter** (MiMo default on agents; floor model axis only elsewhere).
- **Look-ahead and regime.** Frontier LLMs may encode post-training knowledge; identifier masking is imperfect. The window (~Jul 2022–Apr 2026) spans a **strong momentum** stretch — gross IC can reload known factors; residual scrub is the promotion bar, not a substitute for live attribution or formal incremental-return regression.
- **Off-the-shelf agents** could vary in actual performance depending on user configuration. Trading agent in particular is a **reimplemention**, not the official repo’s performance.
- **Methodological bounds.** K = 3 is a pragmatic start — path-rich scaffolds may need higher K to control for stochasticity.
- Kim et al. / Liu mappings are **qualitative priors**, not transferred benchmark coefficients. Error ↔ stochasticity in ablations is **consistent with** the framework but not variance-decomposed. 
- Ex-ante agent is a **first-shot** near-optimal cell, not a searched global optimum.

**Finally, who is this framework for?**

- For enthusiast/retail investors building their own agents — yes. Because I am one. In total, I have spent **~$300** on LLM (OpenRouter) and data APIs (Massive/Brave Search) for the full demonstration grid, justifiable for optimizing an agent behind the average personal portfolio. Though I have spent far more time and resources developing the infrastructure to do so scalably, as I am not aware of any open-source, agent-agnostic backtesting platform that draws a parallel to my framework. My focus now will move to open-sourcing this platform so interested parties could run it as easily, quickly, and cheaply as possible. Nonetheless, I did **control** for costs by mainly leveraging open-source models (would love to test with OpenAI/Anthropic models but they are restricted in my location; Gemini will be next!), a small-ish universe (DJIA-30), cadence (quarterly), and window (16 dates). If you want to apply it to a **high-frequency S&P 500 trading strategy**, the cost could **implode**. Details on cost per run in [Appendix C](#appendix-c--cost-and-data-of-this-demonstration).
- For institutions or funds, cost is obviously less of a concern and scientific rigor is often valued and imposed. However, also coming from the industry, I know that most institutions are mainly leveraging AI to **improve** an existing investment process, not rushing into **treating AI as a direct source of alpha and reimagining strategies and workflows around that**. I would like to note that this framework also applies across a wide range of use cases **inside** that process, as long as AI serves as an overlay or driver of **critical outputs**. Say you want to fine-tune an AI-generated daily brief: instead of making small changes against today's news and hoping tomorrow reads the way you like, you can generate a set of backtested briefs and measurably optimize your AI for it. Same for a sentiment score extracted by AI that informs your investment decisions — you could also apply it and optimize with key metrics that you suspect it could reflect better. For those who are ready for the **next** level of adoption — **direct alpha generation** — this demonstration is a systematic investment framework that could **power or inspire** their own process.

#### Closing chart — Output sophistication

Across **~2,400** deduplicated rationales (one per config × date × ticker), I deployed an **LLM classifier** (blind to the score and config) to rate each rationale on a **fixed 0–4 sophistication scale**: 0 stat recital → 1 single-factor → 2 multi-factor synthesis → 3 franchise/moat → 4 strategic synthesis.

Sophistication climbs a clean ladder — **agent > floor LLM and smarter model > weaker model**. **Floor (MiMo)** posts the highest mean residual IC with modest sophistication; **OpenClaw** writes materially deeper rationales but clears neither residual significance nor gross edge; **Trading agent** tops the sophistication chart yet trails the simple floor on residual IC and t. **Ex-ante** is the partial exception — structured depth *and* the only cell with residual NW t > 3 — but it is not the most eloquent config on the ladder (trading agent is). This points to how our findings in this paper often seem paradoxical:

We could conflate **articulate synthesis** with **correct, additive skill** — a distinction that collapses when the output space reduces from the semantic to quantitative dimensions; the latter is the bridge between AI agent outputs and portfolio impact. More agentic structure buys richer prose and more strategic vocabulary; it also buys stochasticity, tool tax, and error-amplification paths that can destroy ranking edge.

Never judge a book by its cover — same goes for your AI agent.

{{< chart "main-sophistication-mean.svg" "Mean sophistication" >}}

{{< chart "main-sophistication-dist.svg" "Sophistication level distribution (L0–L4)" >}}

## Appendix

### Appendix A — Applying the ex-ante framework

#### A.1 Application checklists

Work top-down. Answer the questions in order; each row maps to a concrete config choice.

**A. Mandate and information structure**


| Ask                                                                                                   | If yes / mostly…                        | Lean toward                                                                     |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| Can the job be split into **independent information streams** that only need to meet at the decision? | Yes (e.g. market / news / fundamentals) | Centralized MAS: parallel specialists → aggregator / PM                         |
| Is the core work a **sequential constraint chain** (step N needs step N−1)?                           | Yes                                     | SAS (single agent, full context)                                                |
| Is the useful information set **knowable ex-ante** (stable PIT dossier)?                              | Yes                                     | Prefetch / feeding at reason time                                               |
| Must the agent **discover** sources interactively?                                                    | Yes                                     | Tool-using SAS (or decentralized explore); accept higher stochasticity; raise K |
| How costly is a single wrong fact relative to a missed insight?                                       | Very costly (most fundamental mandates) | Prefer verification + lower tool autonomy over max exploration                  |


**B. SAS vs MAS (architecture)**


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


| Component                                   | Default bias for fundamental research (quarterly, PIT)     | Flip the default if…                                   |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Tool Use at reason time                     | **Off** if prefetch covers the set; else constrained tools | Information truly must be discovered live              |
| Planning (prompt “decompose into subgoals”) | **Off** for retrieval-like synthesis                       | Task is genuinely multi-step procedural                |
| Memory across periods                       | **Off** if decisions are largely independent               | Strong cross-period dependence / continuity thesis     |
| Structured reasoning / schema               | **On**                                                     | Schema blocks needed judgment (rare)                   |
| Reflection as separate stage                | Prefer **external verifier** over self-reflect-only        | Strict single-agent constraint                         |
| Ensemble K                                  | **K ≥ 3** for path-rich scaffolds; match live              | Near-deterministic floor (still keep K≥2 for NN tests) |


#### A.2 Worked mapping (this study’s ex-ante agent — first shot, to refine)


| Decision     | Prior used                                                | Choice                                                        |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------- |
| Task class   | Independent PIT streams (market / news / fundamentals)    | Decomposable → Centralized MAS                                |
| Tools        | Open autonomy worst under residual KPI; tool–MAS tax      | Prefetch packs; tools off at reason time                      |
| Planning     | Prompt planning often net-negative on retrieval-like work | Pre-split specialists by data lane (architecture-level split) |
| Memory       | Near-zero in our floor ablation                           | Off                                                           |
| Verification | Unverified MAS amplifies errors                           | Centralized verifier before PM                                |
| Model        | Alignment > raw IQ under correct topology                 | Mid-tier capable model (MiMo in demo)                         |
| Ensemble     | Path noise from MAS                                       | K = 3, same at deploy                                         |


That specification is what we call the **ex-ante near-optimal** candidate: chosen from principles and grounding priors, then run under the same rules as floors and off-the-shelf agents. It is “near-optimal” only relative to the mandate, KPI, and grounding set — validated and refined in the demonstration (residual NW t > 3 on first shot; ablations moved KPIs as predicted).

### Appendix B — Config labels (short)

Floor — one PIT dossier, one LLM call. OpenClaw — ReAct + MCP tools. Trading agent — sequential tool specialists + Bull/Bear + PM. Ex-ante — prefetch, specialists, verifier, PM. OpenClaw ~ tool-heavy SAS; trading agent ~ tool+MAS/debate; ex-ante ~ low tool autonomy + centralized verification (qualitative Kim et al. alignment, not transferred coefficients).

### Appendix C — Cost and data of this demonstration

Token and API spend are logged per run (`cost_summary.json` in each run directory). Totals below sum **K = 3** repeats on the **16-date** panel (Jul 2022–Apr 2026), all **11 configs** in the demonstration: **9** in the initial KPI grid (6 floor variants + OpenClaw + trading agent + ex-ante) **+ 2** Step 6 iterative ablations. OpenClaw ledger pricing was incomplete; **~$70** is estimated from token volume (~150M tokens in) at MiMo list rates. Analytics (reports, compare viewer, twin tests, rationale coding) run **offline** — no further LLM spend.


| Config                  | Tok in    | Tok out  | Cost (USD) | Notes                        |
| ----------------------- | --------- | -------- | ---------- | ---------------------------- |
| Floor MiMo (no mem)     | 4.6M      | 0.8M     | 3.0        | 1 LLM call / ticker          |
| Floor MiMo              | 4.7M      | 0.8M     | 6.5        | + memory ablation runs       |
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


**Data (Massive + Brave).** LLM tokens dominate; **market-data API spend is secondary** but constrains design. **Massive** — US-equity prices, fundamentals, ticker-scoped news, filings; sentiment fields from ~Jul 2024 only (thinner controls on earlier dates). **Brave** — PIT web search/snippets for tool-heavy scaffolds and ex-ante prefetch; cached on disk. Data cost stays small because Delorean **reuses cache** across K and configs.

**Models.** Mostly **open-weight via OpenRouter** (MiMo default; GLM, MiniMax, Grok on floors). **Anthropic / OpenAI** would be natural comparators but **API access is restricted from my location** — this grid is not a full frontier shootout.

**Scaling law.** Spend scales roughly linearly with **K**, **universe**, **dates**, **configs in the grid**, **LLM calls per cell**, and **model $/token**. Rule of thumb: **O(universe × dates × K × configs × calls-per-cell)**. A quarterly DJIA study at floor scale is enthusiast-affordable; **high-frequency S&P 500** with agentic scaffolds is not without institutional budget. Delorean amortizes data and parallelizes runs; it does not change the exponent.

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

Bates, J. M., and Granger, C. W. J. (1969). The combination of forecasts. *Operational Research Quarterly*, 20(4), 451–468.

Fama, E. F., and MacBeth, J. D. (1973). Risk, Return, and Equilibrium: Empirical Tests. *Journal of Political Economy*, 81(3), 607–636.

Glasserman, P., and Lin, C. (2023). Assessing Look-Ahead Bias in Stock Return Predictions Generated by GPT Sentiment Analysis. *Journal of Financial Data Science*, 5(4). [https://doi.org/10.3905/jfds.2023.1.143](https://doi.org/10.3905/jfds.2023.1.143)

He, H., and Thinking Machines Lab (2025). Defeating Nondeterminism in LLM Inference. [https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)

Kim, Y., Gu, K., Park, C., Park, C., Schmidgall, S., Heydari, A. A., Yan, Y., Zhang, Z., Zhuang, Y., Liu, Y., Malhotra, M., Liang, P. P., Park, H. W., Yang, Y., Xu, X., Du, Y., Patel, S., Althoff, T., McDuff, D., and Liu, X. (2026). Towards a Science of Scaling Agent Systems. arXiv:2512.08296. [https://arxiv.org/abs/2512.08296](https://arxiv.org/abs/2512.08296)

Liu, M. (2026). More Is Not Always Better: Cross-Component Interference in LLM Agent Scaffolding. arXiv:2605.05716. [https://arxiv.org/abs/2605.05716](https://arxiv.org/abs/2605.05716)

Liu, N. F., et al. (2024). Lost in the Middle: How Language Models Use Long Contexts. *Transactions of the Association for Computational Linguistics*, 12, 157–173.

Newey, W. K., and West, K. D. (1987). A Simple, Positive Semi-Definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix. *Econometrica*, 55(3), 703–708.

Yao, S., et al. (2023). ReAct: Synergizing Reasoning and Acting in Language Models. *International Conference on Learning Representations (ICLR)*. [https://arxiv.org/abs/2210.03629](https://arxiv.org/abs/2210.03629)