# Standardized Benchmark Rubric (Ground-Truth API + Scale-Invariant Relative Cost)

This rubric establishes a 100% deterministic, reproducible evaluation model. It eliminates
subjective LLM grading in favour of **ground-truth n8n API validation** and **scale-invariant
relative scoring** on every quantitative metric.

> Every weight and every formula below is defined once, in `benchmark/harness/scoring.mjs`.
> This document describes that module; it does not redefine it.

---

## 🏆 Summary of Evaluated Dimensions

| Dimension | Weight | Measurement Source | Scoring Formula |
|---|:---:|---|---|
| **1. Correctness** | **35 %** | Live n8n Cloud API + `validate_node_config` | $0.40 \times \text{RequirementCoverage} + 0.40 \times \text{NodeValidity} + 0.20 \times \text{GraphIntegrity}$ |
| **2. Token Efficiency** | **35 %** | Prompt + completion tokens | $100 \times e^{-1.5(K_X/\min(K_A,K_B) - 1)}$ |
| **3. Build Time** | **30 %** | External harness stopwatch | $100 \times e^{-1.5(T_X/\min(T_A,T_B) - 1)}$ |
| *Setup ease* | *telemetry* | Installer log: friction (70 %) and commands (30 %) | Reported, not scored |
| **Composite** | **100 %** | Weighted sum of the three scored dimensions | $\sum (\text{Weight}_i \times \text{Score}_i)$ |

---

## 🔬 Dimension 1: Correctness (35 % Weight — Ground-Truth API Audit)

Correctness is evaluated with ZERO LLM inference directly on the live n8n instance via `GET /api/v1/workflows/:id` and `validate_node_config`:

> Weights live in `benchmark/harness/scoring.mjs` and nowhere else. Every number below is
> a description of that module, not a second definition of it.

### 1.1 Requirement Coverage (40 % of Correctness)
Checks the deployed graph against `requirements.expectedCapabilities` in
`benchmark/config/benchmark.config.json`, each capability worth an equal share:
$$\text{RequirementCoverage} = 100 \times \frac{\sum \text{capability credit}}{\text{capability count}}$$
- Decided on **node types and wiring only, never on node names**. A Code node named
  “Email Sorter Agent” is a Code node.
- `multi_agent` requires real `@n8n/n8n-nodes-langchain.*` agent nodes: full credit for two
  or more with a language model pinned via `ai_languageModel`, half for one, a quarter for
  an agent with no model pinned.
- `triage_step` is scored separately from `multi_agent`, so a workflow that sorts in a Code
  node gets credit for sorting without getting credit for being agentic.

**Why this component exists.** Node validity and graph integrity are both normalised by the
workflow's own node count, so on their own they make doing less free. In `run_8` a 4-node
workflow with no triage step scored 100/100 against a 15-node one that fulfilled the brief.
Coverage is the only component that a workflow cannot improve by shrinking.

### 1.2 Node Schema Validity (40 % of Correctness)
Every node in the deployed workflow is audited by n8n's server-side `validate_node_config` tool:
$$\text{NodeValidityScore} = 100 \times \frac{\text{Valid Nodes (0 errors)}}{\text{Total Nodes}}$$
- Audits parameter types, required fields, subnodes, and display options against the official n8n server schema.
- Flags parameter discrepancies (e.g. invalid default flags, missing required subnodes).

### 1.3 Graph Topology & Integrity (20 % of Correctness)
Audits the mathematical graph structure formed by nodes and connections:
- Identifies functional orphaned nodes (nodes with 0 incoming and 0 outgoing edges, excluding valid triggers and response sinks).
- Verifies subconnection wiring (`ai_languageModel`, `ai_tool`, `ai_memory`, `ai_outputParser`).
$$\text{GraphIntegrityScore} = 100 \times \frac{\text{Functional Nodes} - \text{Orphaned Nodes}}{\text{Functional Nodes}}$$

### 1.4 Live Cloud Execution (Informative Only — Excluded from Score)
Live execution status is queried from `GET /api/v1/executions?workflowId=:id` and recorded as engineering telemetry:
- **Scoring Rationale**: Standardized AI benchmarks cannot and should not demand real third-party OAuth2 credentials (such as live personal Gmail or Google Calendar tokens). Requiring successful execution on unauthenticated services introduces uncontrollable noise into the benchmark.
- Execution traces and node runs are displayed informatively in the final dashboard without penalizing the composite score.
- **This exclusion is about scoring only.** It is never restated to a builder as a
  design constraint. `run_9` turned it into “never assign OAuth credentials
  (Gmail/Google/OpenAI)”, both builders read that as a ban on the OpenAI-backed Agent
  node, and the capability under test disappeared from both branches. Nodes that need
  credentials are expected; the credential slot is simply left empty.

---

## 🧰 Setup Ease — measured, never scored

Setup is scored on what the installer ran into, never on wall clock:

$$\text{SetupEase}(X) = 0.70 \times \text{FrictionScore}(X) + 0.30 \times \text{CommandScore}(X)$$

Both components use the same relative curve on `count + 1`, so zero friction on both sides
is a tie at 100 rather than a division by zero.

**Why friction and not seconds.** Installation is paid once and amortises to nothing, while
build time and tokens are paid on every workflow. And most of the wall clock was never a
product property: it was bandwidth and registry latency. A dead end — a command that
answers wrongly, a documented path that does not exist — is reproducible, attributable to
code, and fixable. Command count carries the smaller share because a branch can be terse
and still misleading.

**Acquisition seconds are excluded from the score on BOTH branches**, and reported as
telemetry. Each branch carries a benchmark artefact and only one of them was being
discounted: n8n-as-code installs from local tarballs because the build under test is
unpublished, and native MCP has its workers hand-roll an HTTP client because the benchmark
runtime ships no wired MCP client. A real user of either does neither.

---

## ⚡ Dimensions 2 & 3: Scale-Invariant Relative Cost Scoring

Both cost axes are scored against the better branch of the same run:

$$\text{Score}(X) = 100 \times e^{-1.5\,(X/\min(A,B) - 1)}$$

**Why exponential decay and not the plain ratio.** Both read only `X / min(A, B)`, so both
are scale-invariant: multiply every measurement in a run by any factor and the scores do
not move. That property is the point — absolute token counts and wall-clock seconds vary
enormously with the orchestrator, so only the gap between the two branches is comparable
across runs.

They differ in how that gap becomes points. The reciprocal `100 * min/X` understates every
overage: spending 30 % more scored 76.6, a 23 % deficit for a 30 % cost, and the gap widened
with the ratio — doubling the cost lost only half the score. Exponential decay is steeper
where it matters and, unlike a straight line, needs no floor: it approaches zero without
reaching it, so a 2x branch and a 10x branch still rank in the right order instead of both
flattening to nothing.

| Overage | Reciprocal | Exponential |
|---:|---:|---:|
| +10 % | 90.9 | 86.1 |
| +30 % | 76.6 | 63.3 |
| +50 % | 66.7 | 47.2 |
| +100 % | 50.0 | 22.3 |
| +334 % | 23.0 | 0.7 |

### Properties
1. **The better branch scores 100.** Its overage is zero, so the exponent is zero.
2. **Scale-invariant.** Only the A/B ratio is read; absolute magnitudes cancel.
3. **No floor, no ceiling below 100.** The curve approaches zero asymptotically, so a
   large gap never collapses two different ratios onto the same score.
4. **One tunable.** The decay constant lives in `benchmark/harness/scoring.mjs` as
   `DECAY`, and nothing restates it.
---

## 📊 Physical Operational Telemetry (Reported Raw)

The following operational metrics are recorded and presented as factual engineering telemetry without arbitrary composite grading:
- **Setup Commands ($N_{\text{cmd}}$)**: Number of CLI commands required to install and authenticate.
- **Interaction Turns ($N_{\text{turns}}$)**: Number of conversational turns required to reach completion.
- **Error Recovery Events ($N_{\text{errors}}$)**: Number of command failures or self-recovery events during execution.
