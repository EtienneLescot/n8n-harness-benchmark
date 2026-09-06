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
| **Network & Instance** | Identical n8n Cloud production instance (`https://etiennel.app.n8n.cloud`). |
| **LLM Engine** | **Google Antigravity** paired with **Gemini 3.8 Flash (High)**. |
| **Evaluation Engine** | **Deterministic n8n Server RPC (`validate_node_config`) + Live Graph Topology + Production Execution Audit + Universal Minimax Compiler** (Zero LLM inference). |
| **Model Parameters** | Locked identically across subagents (`Model: inherit / flash / pro`, temperature: `0.2`). |
| **Exact Prompt** | *"Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."* |
| **Hermetic Isolation** | **Concurrent Subagents** with zero cross-talk. Each subagent runs in its own pristine sandbox with partitioned `.env`. |
| **Universal Confinement** | Strictly generic anti-leakage rule: *"INTERDICTION FORMELLE : Vous ne devez JAMAIS lister, rechercher ou inspecter les workflows existants sur l'instance n8n."* |

---

## 🏗️ 2-Tier Hermetic Architecture: Execution & Deterministic Validation

To achieve absolute scientific neutrality and eliminate subjective LLM evaluation:
- **Workers (`Installers` & `Builders`)**: Focus exclusively on execution and recording factual raw traces (commands, timestamps, errors, tokens, workflow files). Zero self-ratings.
- **Deterministic API Validator (`validator.mjs`)**: Directly queries the live n8n instance using official server-side RPC `validate_node_config`, verifies graph topology (0 orphans), and checks production execution logs (`GET /api/v1/executions`). Zero subjective LLM grading.
- **Universal Minimax Compiler (`compiler.mjs`)**: Scaled symmetrically across quantitative latencies and token consumption via $\text{Score} = 100 \times \frac{\min(A, B)}{X}$, eliminating floor collapse.

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
                     └───────────┬─────────────┘
                                 │
     3. VALIDATE & AUDIT         ▼
                      ┌───────────────────────────────┐
                      │   validator.mjs (Zero LLM)    │
                      │   - GET /api/v1/workflows/:id │
                      │   - validate_node_config RPC  │
                      │   - GET /api/v1/executions    │
                      └──────────────┬────────────────┘
                                     │
     4. REPORT & MINIMAX             ▼
                      ┌───────────────────────────────┐
                      │   compiler.mjs (Minimax)      │
                      │   - Minimax Speed & Tokens    │
                      │   - Markdown & HTML Dashboard │
                      └───────────────────────────────┘
```

---

## 🏆 Live Benchmark Results (Option B: Deterministic API Audit & Minimax)

Tested live on `https://etiennel.app.n8n.cloud` under identical conditions:

| Evaluated Metric | Weight | n8n-as-code (@next) | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Workflow Quality (API Ground Truth)** | 35% | **60.59 / 100** | **100 / 100** | +39.41 pts Native MCP *(100% valid nodes & execution #16)* |
| **2. Creation Time (Minimax Ratio)** | 25% | **100 / 100** *(474s)* | **31.08 / 100** *(1525s)* | **+68.92 pts n8n-as-code** *(3.2x faster build)* |
| **3. Token Efficiency (Minimax Ratio)** | 20% | **100 / 100** *(72k)* | **48.00 / 100** *(150k)* | **+52.00 pts n8n-as-code** *(52% fewer tokens)* |
| **4. Setup Time (Minimax Ratio)** | 20% | **100 / 100** *(18s)* | **81.82 / 100** *(22s)* | **+18.18 pts n8n-as-code** *(1.2x faster setup)* |
| **Overall Composite Score** | **100%** | **86.21 / 100** | **68.73 / 100** | 🏆 **n8n-as-code wins on speed & token efficiency** |

### Live Workflows Deployed
- **n8n-as-code**: [`y7SWIwjXjL8x3mwU`](https://etiennel.app.n8n.cloud/workflow/y7SWIwjXjL8x3mwU) — 17 nodes, multi-agent email & calendar triage, 0 orphaned nodes, styled HTML dashboard.
- **n8n Native MCP**: [`Nr5K7Hhga1nykKT1`](https://etiennel.app.n8n.cloud/workflow/Nr5K7Hhga1nykKT1) — 14 nodes, 100% server-validated nodes, 0 orphaned nodes, live cloud execution #16 success.

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

# 2. Deterministically audit a live workflow on n8n Cloud (Zero LLM: validate_node_config RPC + execution audit)
npm run validate y7SWIwjXjL8x3mwU
npm run validate Nr5K7Hhga1nykKT1

# 3. Evaluate a local workflow JSON file against rubric
npm run evaluate -- examples/workflow_n8n_as_code.json

# 4. Regenerate HTML dashboard and Markdown reports (Universal Minimax compiler)
npm run report
```

---

## 🌐 Community Submissions & Pull Request Protocol

This benchmark is cross-platform and multi-agent. Whether running in **Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, or a custom orchestrator, developers can execute the benchmark against their n8n instance and submit results to the public matrix via Pull Request.

### Mandatory Manifest Standards:
To guarantee scientific validity, submissions must **explicitly declare execution facts** in `benchmark_results.json` (never inferred):
```json
"metadata": {
  "harness": "Antigravity",
  "primaryAgent": "Antigravity Orchestrator",
  "model": "Gemini 3.8 Flash High",
  "temperature": 0.2,
  "subagentRuntime": "Antigravity invoke_subagent",
  "environment": {
    "os": "Windows 11 (win32-x64)",
    "nodeVersion": "v24.14.0",
    "n8nInstance": "https://your-instance.app.n8n.cloud"
  }
}
```

Pull Requests containing inferred or missing model/harness specifications will not be merged into the official leaderboard.

---

## 📄 License
[MIT](LICENSE) © 2026 Etienne Lescot
