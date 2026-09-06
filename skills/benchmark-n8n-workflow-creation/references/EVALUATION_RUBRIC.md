# Standardized Benchmark Rubric (Option B: Ground-Truth API & Universal Minimax)

This rubric establishes a 100% deterministic, reproducible evaluation model. It eliminates subjective LLM grading in favor of **ground-truth n8n API validation** and **symmetrical Minimax scaling** across all quantitative performance metrics.

---

## 🏆 Summary of Evaluated Dimensions

| Dimension | Weight | Measurement Source | Scoring Formula |
|---|:---:|---|---|
| **1. Workflow Quality** | **35%** | Live n8n Cloud API + `validate_node_config` | $0.60 \times \text{NodeValidity} + 0.40 \times \text{GraphIntegrity}$ |
| **2. Creation Time** | **25%** | External stopwatch ($T_{\text{build}}$) | $100 \times \frac{\min(T_A, T_B)}{T_X}$ (Universal Minimax) |
| **3. Token Efficiency** | **20%** | Total prompt + completion tokens ($K$) | $100 \times \frac{\min(K_A, K_B)}{K_X}$ (Universal Minimax) |
| **4. Setup Time** | **20%** | External stopwatch ($T_{\text{inst}}$) | $100 \times \frac{\min(T_{\text{inst},A}, T_{\text{inst},B})}{T_{\text{inst},X}}$ (Universal Minimax) |
| **Composite Score** | **100%** | Weighted combination of 4 dimensions | $\sum (\text{Weight}_i \times \text{Score}_i)$ |

---

## 🔬 Dimension 1: Workflow Quality (35% Weight — Ground-Truth API Audit)

Workflow Quality is evaluated with ZERO LLM inference directly on the live n8n instance via `GET /api/v1/workflows/:id` and `validate_node_config`:

### 1.1 Node Schema Validity (60% of Quality Score)
Every node in the deployed workflow is audited by n8n's server-side `validate_node_config` tool:
$$\text{NodeValidityScore} = 100 \times \frac{\text{Valid Nodes (0 errors)}}{\text{Total Nodes}}$$
- Audits parameter types, required fields, subnodes, and display options against the official n8n server schema.
- Flags parameter discrepancies (e.g. invalid default flags, missing required subnodes).

### 1.2 Graph Topology & Integrity (40% of Quality Score)
Audits the mathematical graph structure formed by nodes and connections:
- Identifies functional orphaned nodes (nodes with 0 incoming and 0 outgoing edges, excluding valid triggers and response sinks).
- Verifies subconnection wiring (`ai_languageModel`, `ai_tool`, `ai_memory`, `ai_outputParser`).
$$\text{GraphIntegrityScore} = 100 \times \frac{\text{Functional Nodes} - \text{Orphaned Nodes}}{\text{Functional Nodes}}$$

### 1.3 Live Cloud Execution (Informative Only — Excluded from Score)
Live execution status is queried from `GET /api/v1/executions?workflowId=:id` and recorded as engineering telemetry:
- **Scoring Rationale**: Standardized AI benchmarks cannot and should not demand real third-party OAuth2 credentials (such as live personal Gmail or Google Calendar tokens). Requiring successful execution on unauthenticated services introduces uncontrollable noise into the benchmark.
- Execution traces and node runs are displayed informatively in the final dashboard without penalizing the composite score.

---

## ⚡ Dimensions 2, 3 & 4: Universal Minimax Scaling

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
