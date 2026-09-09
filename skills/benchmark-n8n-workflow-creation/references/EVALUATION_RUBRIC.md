# Standardized Benchmark Rubric (Option B: Ground-Truth API & Universal Minimax)

This rubric establishes a 100% deterministic, reproducible evaluation model. It eliminates subjective LLM grading in favor of **ground-truth n8n API validation** and **symmetrical Minimax scaling** across all quantitative performance metrics.

---

## 🏆 Summary of Evaluated Dimensions

| Dimension | Weight | Measurement Source | Scoring Formula |
|---|:---:|---|---|
| **1. Workflow Quality** | **40%** | Live n8n Cloud API + `validate_node_config` | $0.40 \times \text{RequirementCoverage} + 0.40 \times \text{NodeValidity} + 0.20 \times \text{GraphIntegrity}$ |
| **2. Creation Time** | **25%** | External stopwatch ($T_{\text{build}}$) | $100 \times \frac{\min(T_A, T_B)}{T_X}$ (Universal Minimax) |
| **3. Token Efficiency** | **25%** | Total prompt + completion tokens ($K$) | $100 \times \frac{\min(K_A, K_B)}{K_X}$ (Universal Minimax) |
| **4. Setup Ease** | **10%** | Installer log: friction events and command count | $0.70 \times \text{FrictionScore} + 0.30 \times \text{CommandScore}$, each a Universal Minimax ratio |
| **Composite Score** | **100%** | Weighted combination of 4 dimensions | $\sum (\text{Weight}_i \times \text{Score}_i)$ |

---

## 🔬 Dimension 1: Workflow Quality (40% Weight — Ground-Truth API Audit)

Workflow Quality is evaluated with ZERO LLM inference directly on the live n8n instance via `GET /api/v1/workflows/:id` and `validate_node_config`:

> Weights live in `benchmark/harness/scoring.mjs` and nowhere else. Every number below is
> a description of that module, not a second definition of it.

### 1.1 Requirement Coverage (40% of Quality Score)
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

### 1.2 Node Schema Validity (40% of Quality Score)
Every node in the deployed workflow is audited by n8n's server-side `validate_node_config` tool:
$$\text{NodeValidityScore} = 100 \times \frac{\text{Valid Nodes (0 errors)}}{\text{Total Nodes}}$$
- Audits parameter types, required fields, subnodes, and display options against the official n8n server schema.
- Flags parameter discrepancies (e.g. invalid default flags, missing required subnodes).

### 1.3 Graph Topology & Integrity (20% of Quality Score)
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

## 🧰 Dimension 4: Setup Ease (10% Weight — friction, not seconds)

Setup is scored on what the installer ran into, never on wall clock:

$$	ext{SetupEase}(X) = 0.70 	imes 	ext{FrictionScore}(X) + 0.30 	imes 	ext{CommandScore}(X)$$

Both components are Universal Minimax ratios on `count + 1`, so zero friction on both sides
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

## ⚡ Dimensions 2 & 3: Universal Minimax Scaling

To eliminate arbitrary cut-off thresholds (floor effect where both contenders get 0 pts despite 3x performance differences), all cost and latency metrics are evaluated using the **Universal Minimax Ratio**:

$$\text{Score}(X) = 100 \times \frac{\min(A, B)}{X}$$

### Properties of Minimax Scoring:
1. **Best Contender receives 100 pts**: The fastest or most token-efficient harness achieves the maximum score.
2. **Proportional Degradation**: A contender taking $2\times$ longer receives $100 \times 1/2 = 50.00$ pts. A contender taking $3.2\times$ longer receives $100 \times 1/3.2 = 31.25$ pts.
3. **Zero Floor Effect**: Scores never artificially collapse to 0 on complex enterprise tasks.
4. **Scale Invariance**: Works identically for a 30-second toy task and a 1500-second multi-agent architecture.

---

## 📊 Physical Operational Telemetry (Reported Raw)

The following operational metrics are recorded and presented as factual engineering telemetry without arbitrary composite grading:
- **Setup Commands ($N_{\text{cmd}}$)**: Number of CLI commands required to install and authenticate.
- **Interaction Turns ($N_{\text{turns}}$)**: Number of conversational turns required to reach completion.
- **Error Recovery Events ($N_{\text{errors}}$)**: Number of command failures or self-recovery events during execution.
