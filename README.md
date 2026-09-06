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

## 🏗️ 3-Tier Agentic Architecture: The Zero Self-Evaluation Rule

In this benchmark, **no agent ever judges its own work**:
- **Workers (`Installers` & `Builders`)**: Focus exclusively on execution and recording factual raw traces (commands, timestamps, errors, tokens, workflow files). They issue zero self-ratings.
- **Judge Subagent (`Impartial LLM Judge`)**: An independent external subagent that receives raw logs and workflow JSONs, and evaluates all qualitative dimensions (Installation, Ease of Use / DX, Workflow Quality).

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
            - Produit: Raw Install Log - Produit: Raw Install Log
            (AUCUNE AUTO-ÉVALUATION)   (AUCUNE AUTO-ÉVALUATION)
                     │                         │
     2. BUILD        ▼                         ▼
            [Sous-Agent Builder A]     [Sous-Agent Builder B]
            - Conçoit & déploie wf     - Conçoit & déploie wf
            - Produit: Raw Build Log   - Produit: Raw Build Log
            (AUCUNE AUTO-ÉVALUATION)   (AUCUNE AUTO-ÉVALUATION)
                     │                         │
                     └───────────┬─────────────┘
                                 │
                   Transmission des Traces Brutes
                   - Raw Install Logs (A & B)
                   - Raw Build Logs & Telemetry (A & B)
                   - Workflows JSON Déployés (A & B)
                                 │
                                 ▼
     3. JUDGE        ┌───────────────────────────────┐
                     │   [Sous-Agent Juge LLM]       │
                     │   (Totalement neutre & externe)│
                     │   - Juge l'Installation (20%) │
                     │   - Juge l'Utilisation / DX   │
                     │   - Juge la Qualité wf (30%)  │
                     │   - Calcule Tokens & Temps    │
                     └──────────────┬────────────────┘
                                    │
                                    ▼
                     ┌───────────────────────────────┐
                     │  Rapport & Dashboard Final    │
                     └───────────────────────────────┘
```

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
