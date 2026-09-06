<div align="center">

# ⚡ n8n-harness-benchmark

### Standardized Agentic Benchmark: `n8n-as-code` vs. `n8n Native MCP`

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![LLM: Gemini 3.8 Flash High](https://img.shields.io/badge/LLM-Gemini%203.8%20Flash%20High-purple.svg)](https://deepmind.google/technologies/gemini/)
[![Agent: Antigravity](https://img.shields.io/badge/Agent-Google%20Antigravity-orange.svg)](https://n8nascode.dev/)
[![Status: Complete](https://img.shields.io/badge/Benchmark-Validated%20Live-success.svg)]()

**A scientifically reproducible benchmark comparing code-first GitOps (`n8n-as-code`) with remote JSON-RPC (`n8n Native MCP`) for building AI-driven automations on n8n.**

</div>

---

## 🎯 The Benchmark Matrix & Impartiality Protocol

To ensure 100% scientific validity and prevent bias:

| Dimension | Standardized Condition |
|---|---|
| **Host Machine** | Identical local machine (Windows 11). |
| **Network & Instance** | Identical n8n Cloud production instance. |
| **LLM Engine** | **Google Antigravity** paired with **Gemini 3.8 Flash (High)**. |
| **Judge / Evaluator** | Same Antigravity + Gemini 3.8 Flash (High) using standardized rubric. |
| **Model Temperature** | Fixed at `0.2` (deterministic). |
| **Exact Prompt** | *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"* |
| **Isolation** | Hermetic sandboxing per run (`sandboxes/run_<timestamp>_<tool>/`). Zero shared state or cache. |
| **2 Modes** | **Interactive Mode** (human user + assistant) & **Auto Mode** (autonomous subagents). |

---

## 🏆 Live Benchmark Results

Tested and validated on a live n8n instance:

| Evaluated Metric | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Ease of Installation** | 20% | **92 / 100** | **84 / 100** | **+8 pts n8n-as-code** |
| **2. Ease of Use & Feedback Loop** | 20% | **94 / 100** | **88 / 100** | **+6 pts n8n-as-code** |
| **3. Token Consumption** | 15% | **96 / 100** *(5,550 tokens)* | **88 / 100** *(8,300 tokens)* | **+8 pts n8n-as-code** |
| **4. Creation Time** | 15% | **92 / 100** *(42s)* | **86 / 100** *(58s)* | **+6 pts n8n-as-code** |
| **5. Workflow Quality** | 30% | **98 / 100** | **98 / 100** | **Tie** |
| **Overall Composite Score** | **100%** | **94 / 100** | **89 / 100** | 🏆 **n8n-as-code wins** |

---

## 🔍 Key Findings & Architectural Trade-offs

### 1. Pre-flight Local Validation vs. Remote Rejection
- **n8n-as-code**: The local schema linter (`n8nac skills validate`) caught a parameter typo (`generateHtml` instead of `generateHtmlTemplate`) instantly in **offline pre-flight**, providing the exact TypeScript definition snippet in under 1 second.
- **n8n Native MCP**: Validation requires round-trip HTTP requests to `validate_workflow`. While the server warnings are descriptive, fixing them requires iterating over JSON-RPC round-trips.

### 2. Context & Token Efficiency
- **n8n-as-code**: The agent has local schema knowledge and stubs bundled in the workspace (`n8nac update-ai`), using only **5,550 tokens**.
- **n8n Native MCP**: The agent must retrieve the SDK reference and coding patterns over MCP (`get_workflow_sdk_reference`), resulting in **8,300 tokens** (~50% higher context consumption).

### 3. Workflow Quality Parity
Both paradigms produced an exceptional **98/100** workflow quality:
- **Google Mail** ingestion node (unread messages from last 24h)
- **Google Calendar** events ingestion node (today's agenda)
- **Merge Node** combining both streams
- **LangChain AI Agent** node triaging items into Action Items, Schedule Prep, and Executive Briefing
- **HTML Dashboard Node** generating a dark-mode responsive dashboard with cards and priority badges

---

## 📦 Antigravity Skill: `benchmark-n8n-workflow-creation`

This repository embeds the dedicated Antigravity skill in:
[`skills/benchmark-n8n-workflow-creation/`](skills/benchmark-n8n-workflow-creation/)

- [`SKILL.md`](skills/benchmark-n8n-workflow-creation/SKILL.md): Complete operational instructions.
- [`references/ISOLATION_AND_IMPARTIALITY.md`](skills/benchmark-n8n-workflow-creation/references/ISOLATION_AND_IMPARTIALITY.md): Strict protocol for sandboxing and impartiality.
- [`references/EVALUATION_RUBRIC.md`](skills/benchmark-n8n-workflow-creation/references/EVALUATION_RUBRIC.md): Full scoring breakdown (0–100).
- [`references/N8N_AS_CODE_GUIDE.md`](skills/benchmark-n8n-workflow-creation/references/N8N_AS_CODE_GUIDE.md): n8n-as-code authoring reference.
- [`references/N8N_NATIVE_MCP_GUIDE.md`](skills/benchmark-n8n-workflow-creation/references/N8N_NATIVE_MCP_GUIDE.md): Native MCP authoring reference.

---

## 🚀 How to Run the Benchmark

### Prerequisites
- Node.js `v18+`
- An accessible n8n instance (Local Docker or n8n Cloud)

### 1. Interactive Mode (Human in the Loop)
You act as the user, and the model guides you through setup and authors the workflows:
```bash
npm run benchmark:interactive
```

### 2. Auto Mode (Fully Autonomous)
1. Configure credentials in `.env`:
   ```env
   N8N_HOST=https://your-instance.app.n8n.cloud
   N8N_API_KEY=your_api_key
   N8N_NATIVE_MCP_URL=https://your-instance.app.n8n.cloud/mcp-server/http
   N8N_NATIVE_MCP_TOKEN=your_mcp_bearer_token
   ```
2. Run:
   ```bash
   npm run benchmark:auto
   ```

### 3. Generated Artifacts
Every run compiles:
- 📄 `benchmark/reports/live_benchmark_report.md` (Markdown Summary)
- 📊 `benchmark/reports/live_benchmark_dashboard.html` (Interactive Generative UI Dashboard)
- 💾 `benchmark/reports/live_benchmark_results.json` (Raw Telemetry)

---

## 📄 License
[MIT](LICENSE) © 2026 Etienne Lescot
