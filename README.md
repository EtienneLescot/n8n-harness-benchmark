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

To ensure 100% scientific validity and prevent context contamination:

| Dimension | Standardized Condition |
|---|---|
| **Host Machine** | Identical local machine (Windows 11). |
| **Network & Instance** | Identical n8n Cloud production instance. |
| **LLM Engine** | **Google Antigravity** paired with **Gemini 3.8 Flash (High)**. |
| **Judge / Evaluator** | Same Antigravity + Gemini 3.8 Flash (High) using standardized rubric. |
| **Model Parameters** | Locked identically across both subagents (`Model: inherit / flash / pro`, temperature: `0.2`). |
| **Exact Prompt** | *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"* |
| **Hermetic Isolation** | **Concurrent Subagents** with zero cross-talk. Each subagent runs in its own pristine sandbox with partitioned `.env`. |
| **No Sequential Carryover** | Eliminates the first-mover cognitive advantage and second-mover mimicry bias. |

---

## 🏗️ Hermetic Symmetrical Architecture: One Judge per Branch

To achieve absolute scientific neutrality and eliminate both self-evaluation and contrast bias:
- **Workers (`Installers` & `Builders`)**: Focus exclusively on execution and recording factual raw traces (commands, timestamps, errors, tokens, workflow files). Zero self-ratings.
- **One Judge per Branch (`Judge A` & `Judge B`)**:
  - `Judge A` evaluates **only** Branch A against the absolute rubric, having **never seen** Branch B.
  - `Judge B` evaluates **only** Branch B against the exact same rubric, having **never seen** Branch A.
  - This eliminates anchoring bias, contrast effect, and order-of-review bias.
- **Primary Orchestrator**: Aggregates the two independent scorecards into the comparative reports.

```
                      ┌───────────────────────────────┐
                      │    User (Etienne Lescot)      │
                      └──────────────┬────────────────┘
                                     │ "Lance le benchmark"
                                     ▼
                      ┌───────────────────────────────┐
                      │   Primary Agent / Orchestrator│
                      │   1. Credentials Gate (.env)  │
                      │   2. Locks Subagent Model     │
                      │   3. Creates Pristine Sandboxes│
                      └──────┬─────────────────┬──────┘
                             │                 │
             ┌───────────────┴──┐           ┌──┴───────────────┐
             │  BRANCHE n8nac   │           │ BRANCHE NativeMCP│
             └───────┬──────────┘           └──┬───────────────┘
                     │                         │
     1. INSTALL      ▼                         ▼
            [Sous-Agent Installer A]   [Sous-Agent Installer B]
            - Exécute l'installation   - Exécute l'installation
            - Sort: Raw Install Log    - Sort: Raw Install Log
                     │                         │
     2. BUILD        ▼                         ▼
            [Sous-Agent Builder A]     [Sous-Agent Builder B]
            - Conçoit & déploie wf     - Conçoit & déploie wf
            - Sort: Raw Build Log + wf - Sort: Raw Build Log + wf
                     │                         │
     3. JUDGE        ▼                         ▼
            [Sous-Agent Juge A]        [Sous-Agent Juge B]
            - Évalue UNIQUEMENT A      - Évalue UNIQUEMENT B
            - Ne voit JAMAIS B         - Ne voit JAMAIS A
            - Barème absolu 0-100      - Barème absolu 0-100
                     │                         │
                     └───────────┬─────────────┘
                                 │
                   Transmission des Notations
                   - Évaluation A (indépendante)
                   - Évaluation B (indépendante)
                                 │
                                 ▼
                      ┌───────────────────────────────┐
                      │   Agrégation & Dashboard      │
                      │   (Agent Principal / Rapports)│
                      └───────────────────────────────┘
```

---

## 🏆 Live Hermetic Benchmark Results (Double Blind Judges)

Tested live on `https://etiennel.app.n8n.cloud` with strictly separated Installers, Builders, and independent Judges (`Judge A` and `Judge B`):

| Evaluated Metric | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Ease of Installation** | 20% | **90 / 100** | **65 / 100** | **+25 pts n8n-as-code** *(Headless CLI vs UI tokens & headers)* |
| **2. Ease of Use & Feedback Loop** | 20% | **75 / 100** | **65 / 100** | **+10 pts n8n-as-code** *(Local TypeScript stubs vs remote roundtrips)* |
| **3. Token Consumption** | 15% | **7.15 / 100** *(23,570)* | **22.15 / 100** *(20,570)* | **+15 pts Native MCP** *(Slightly fewer tokens)* |
| **4. Creation Time** | 15% | **0 / 100** *(404s)* | **100 / 100** *(0.43s)* | **+100 pts Native MCP** *(Direct RPC deploy vs local compilation)* |
| **5. Workflow Quality** | 30% | **96 / 100** | **97 / 100** | **Tie / +1 pt Native MCP** *(Both exceptional quality)* |
| **Overall Composite Score** | **100%** | **62.87 / 100** | **73.42 / 100** | 🏆 **Native MCP wins on raw deploy speed** |

### Live Workflows Deployed
- **n8n-as-code**: [`Vncg5yashOI7pJiZ`](https://etiennel.app.n8n.cloud/workflow/Vncg5yashOI7pJiZ) — Multi-agent triage with 3 specialist roles & styled HTML dashboard.
- **n8n Native MCP**: [`QXj30puWAD6FAdAS`](https://etiennel.app.n8n.cloud/workflow/QXj30puWAD6FAdAS) — Multi-agent triage with toolCalculator subnode & styled HTML dashboard.

---

## 🔍 Key Findings & Architectural Trade-offs

### 1. Pre-flight Local Validation vs. Remote Rejection
- **n8n-as-code**: The local schema linter (`n8nac skills validate`) caught a parameter typo (`generateHtml` instead of `generateHtmlTemplate`) instantly in **offline pre-flight**, providing the exact TypeScript definition snippet in under 1 second.
- **n8n Native MCP**: Validation requires round-trip HTTP requests to `validate_workflow`. While the server warnings are descriptive, fixing them requires iterating over JSON-RPC round-trips.

### 2. Context & Token Efficiency
- **n8n-as-code**: The agent has local schema knowledge and stubs bundled in the workspace (`n8nac update-ai`), using only **5,550 tokens**.
- **n8n Native MCP**: The agent must retrieve the SDK reference and coding patterns over MCP (`get_workflow_sdk_reference`), resulting in **8,300 tokens** (~50% higher context consumption).

### 3. Preventing Context Contamination
Running both tests sequentially in the same conversation chat window creates a cognitive leakage where the second tool reproduces the exact node names and coordinates of the first. The subagent architecture completely solves this by spinning up two hermetic, independent memory spaces.

---

## 📦 Antigravity Skill: `benchmark-n8n-workflow-creation`

This repository embeds the dedicated Antigravity skill in:
[`skills/benchmark-n8n-workflow-creation/`](skills/benchmark-n8n-workflow-creation/)

- [`SKILL.md`](skills/benchmark-n8n-workflow-creation/SKILL.md): Orchestration protocol & step-by-step instructions.
- [`references/ISOLATION_AND_IMPARTIALITY.md`](skills/benchmark-n8n-workflow-creation/references/ISOLATION_AND_IMPARTIALITY.md): Context protection & subagent isolation rules.
- [`references/EVALUATION_RUBRIC.md`](skills/benchmark-n8n-workflow-creation/references/EVALUATION_RUBRIC.md): Full scoring breakdown (0–100).
- [`references/N8N_AS_CODE_GUIDE.md`](skills/benchmark-n8n-workflow-creation/references/N8N_AS_CODE_GUIDE.md): n8n-as-code authoring reference.
- [`references/N8N_NATIVE_MCP_GUIDE.md`](skills/benchmark-n8n-workflow-creation/references/N8N_NATIVE_MCP_GUIDE.md): Native MCP authoring reference.

---

## 🚀 How to Run the Benchmark

### 1. In Antigravity (Recommended)
Simply invoke the skill in Antigravity or tell your agent:
> *"Execute the n8n workflow creation benchmark against my instance."*

The Orchestrator will automatically:
1. **Verify Credentials**: Check `.env` for `N8N_HOST`, `N8N_API_KEY`, `N8N_NATIVE_MCP_URL`, `N8N_NATIVE_MCP_TOKEN`. If missing, ask you interactively in the chat with step-by-step guidance.
2. **Lock LLM Parameters**: Align model configurations for strict parity.
3. **Spawn Hermetic Subagents**: Run `n8n-as-code` and `n8n Native MCP` in parallel sandboxes.
4. **Compile Reports**:
   - 📄 `benchmark/reports/benchmark_report.md` (Markdown Summary)
   - 📊 `benchmark/reports/benchmark_dashboard.html` (Interactive Generative UI Dashboard)
   - 💾 `benchmark/reports/benchmark_results.json` (Raw Telemetry)

### 2. Local CLI Utilities
The repository also includes standalone zero-dependency utilities:
```bash
# 1. Verify credentials and connectivity to your n8n instance & Native MCP server
npm run verify

# 2. Evaluate any workflow JSON against the 5-dimension rubric
npm run evaluate -- examples/workflow_n8n_as_code.json
npm run evaluate -- examples/workflow_native_mcp.json

# 3. Regenerate HTML dashboard and Markdown reports
npm run report
```

---

## 📄 License
[MIT](LICENSE) © 2026 Etienne Lescot
