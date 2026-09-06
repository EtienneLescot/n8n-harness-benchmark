# n8n Benchmark Harness: n8n-as-code vs. n8n Native MCP

A standardized, rigorous benchmark harness comparing **n8n-as-code** with **n8n Native MCP** for AI-driven workflow creation.

---

## 🎯 Benchmark Matrix

- **Host Environment:** Same machine (Windows).
- **LLM Harness:** Antigravity + Gemini 3.8 Flash High.
- **Evaluation Harness:** Antigravity + Gemini 3.8 Flash High.
- **Test Prompt:**
  > *"use [n8n native MCP / n8n-as-code] to build on my n8n instance a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*
- **Isolation:** Pristine, isolated filesystem sandboxes for every run (`benchmark/sandboxes/run_<timestamp>_<tool>/`).
- **2 Execution Modes:**
  1. **Interactive Mode**: You get the user role, Antigravity acts as the assistant, guiding you through installation and workflow authoring.
  2. **Auto Mode**: The agent acts autonomously, picks credentials from `.env`, executes end-to-end, and outputs reports.

---

## 📐 Evaluated Metrics (Option B: Deterministic API Audit & Universal Minimax)

1. **Workflow Quality** (**35%**):
   - **40% Node Schema Validity**: Audited by n8n Cloud's official RPC tool `validate_node_config`.
   - **30% Graph Topology & Integrity**: Mathematical adjacency verification (0 functional orphans).
   - **30% Live Execution Status**: Queried from `GET /api/v1/executions` on production instance.
2. **Time to Create Workflow** (**25%**):
   - Evaluated via Universal Minimax Ratio: $\text{Score} = 100 \times \frac{\min(T_A, T_B)}{T_X}$.
3. **Token Efficiency** (**20%**):
   - Evaluated via Universal Minimax Ratio: $\text{Score} = 100 \times \frac{\min(K_A, K_B)}{K_X}$.
4. **Setup Time** (**20%**):
   - Evaluated via Universal Minimax Ratio: $\text{Score} = 100 \times \frac{\min(T_{\text{inst},A}, T_{\text{inst},B})}{T_{\text{inst},X}}$.

---

## 🚀 CLI Commands & Validation Tools

### 1. Verify Credentials & Connectivity
Verify connection to n8n REST API and Native MCP server:
```bash
npm run verify
```

### 2. Audit Any Live Workflow on n8n Cloud (Zero LLM)
Audits node schema validity via `validate_node_config`, graph topology, and live execution history:
```bash
npm run validate <workflowId>
# Example:
npm run validate y7SWIwjXjL8x3mwU
```

### 3. Compile Benchmark Reports & Dashboard
Compiles telemetry and live API audit into Markdown, HTML, and JSON reports:
```bash
npm run report
```

---

## 📊 Output Reports

Each run automatically compiles three reporting artifacts in `benchmark/reports/`:
1. `benchmark_report.md`: Executive summary table, delta comparisons, and ground-truth audit.
2. `benchmark_results.json`: Full machine-readable telemetry data (timestamps, tokens, scores, validator output).
3. `benchmark_dashboard.html`: Interactive, responsive Generative UI dashboard with radar charts, bar graphs, and metrics breakdown.

---

## 📚 Documentation & Specifications
- [Evaluation Rubric & Methodology (Option B)](../skills/benchmark-n8n-workflow-creation/references/EVALUATION_RUBRIC.md)
- [Isolation & Impartiality Standards](../skills/benchmark-n8n-workflow-creation/references/ISOLATION_AND_IMPARTIALITY.md)
- [Antigravity Benchmark Skill](../skills/benchmark-n8n-workflow-creation/SKILL.md)
