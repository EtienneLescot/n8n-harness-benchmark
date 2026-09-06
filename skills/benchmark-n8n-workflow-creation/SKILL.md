---
name: benchmark-n8n-workflow-creation
description: Standardized, scientifically impartial benchmark harness comparing n8n-as-code with n8n Native MCP using strictly symmetrical, hermetic pipelines (Installer -> Builder -> Judge per branch) with zero cross-talk, zero self-evaluation, and zero judge contrast bias.
---

# Skill: Benchmark n8n-as-code vs. n8n Native MCP

Use this skill when asked to benchmark, compare, or scientifically evaluate **n8n-as-code** versus **n8n Native MCP**.

---

## 🎯 Hermetic Symmetrical Architecture: One Judge per Branch

To achieve absolute scientific neutrality:
1. **Zero Self-Evaluation**: No worker (Installer or Builder) grades or evaluates its own work. They produce only factual, raw execution traces.
2. **Zero Judge Contrast Bias (One Judge per Branch)**:
   - If a single judge evaluates both tools, the evaluation of the second tool is inevitably contaminated by anchoring, recency, or contrast bias against the first.
   - Therefore, **each branch has its own dedicated Judge Subagent** (`Judge A` for n8n-as-code, `Judge B` for Native MCP).
   - `Judge A` evaluates **only** Branch A against the absolute rubric, having **never seen** Branch B.
   - `Judge B` evaluates **only** Branch B against the exact same absolute rubric, having **never seen** Branch A.
3. **Total Pipeline Isolation**: The two branches run in complete hermetic silos from installation to final scoring. The Primary Orchestrator merely aggregates the two independent scorecards.

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

## 📋 Execution Protocol (Step-by-Step)

### Step 1: Environment & Execution Manifest Gate (Explicit, Never Inferred)
Because this benchmark is portable across diverse agent environments (Antigravity, Claude Code, Cursor, Windsurf, custom harnesses) and results will be contributed via Pull Requests for a community leaderboard, **the execution environment must be captured explicitly as concrete facts, never inferred**:

1. Read or verify the following parameters in `.env` (or environment variables):
   - `BENCHMARK_HARNESS`: Name of the orchestrating platform (e.g., `Antigravity`, `Claude-Code`, `Cursor`, `Windsurf`, `Custom-CLI`)
   - `BENCHMARK_PRIMARY_AGENT`: Identity of the primary orchestrator (e.g., `Antigravity Orchestrator`)
   - `BENCHMARK_MODEL`: Exact model ID powering the subagents (e.g., `Gemini 3.8 Flash High`, `Claude 3.7 Sonnet`, `GPT-4.5`)
   - `BENCHMARK_TEMPERATURE`: Model sampling temperature (locked at `0.2`)
   - `BENCHMARK_SUBAGENT_RUNTIME`: Subagent execution runtime (e.g., `Antigravity invoke_subagent`, `Process Fork`, `Docker Sandbox`)
2. Automatically record system hardware / OS (`process.platform`, `process.arch`, `process.version`).
3. Include these exact parameters in `metadata` of `benchmark_results.json`. Any Pull Request submitted to the benchmark repository without these explicit fields is considered unverified.

---

### Step 2: Credentials Gate
Check `.env` for the 4 essential n8n parameters:
- `N8N_HOST`: URL of the n8n instance
- `N8N_API_KEY`: n8n REST API key
- `N8N_NATIVE_MCP_URL`: Native MCP server URL
- `N8N_NATIVE_MCP_TOKEN`: Native MCP bearer token

If any are missing:
- Prompt the user directly in chat with instructions on where to find them in the n8n UI (`Settings > n8n API` and `Settings > Instance-level MCP`).
- Save them to `.env`.

---

### Step 2: LLM Model Locking
To guarantee scientific parity:
- Lock the model parameter for **all 6 subagents** (`Model: 'inherit'`, `'flash'`, or `'pro'`).
- The chosen model is recorded in the benchmark telemetry and shown in the final reports.

---

### Step 3: Phase 1 — Installation Execution (`Installers`)
Spawn two independent installer subagents via `invoke_subagent`:

#### Installer A (`n8n-as-code Installer`)
- **Workspace**: `benchmark/sandboxes/run_<id>_n8nac/`
- **Task**: Install and link n8n-as-code to the target instance using credentials from `.env`.
- **Output**: Return a factual execution log (`commandsExecuted`, `durationMs`, `stdout`, `stderr`, `frictionEvents`, `status`).

#### Installer B (`Native MCP Installer`)
- **Workspace**: `benchmark/sandboxes/run_<id>_native_mcp/`
- **Task**: Establish connection to the Native MCP server via credentials from `.env` and query available tools.
- **Output**: Return a factual execution log (`headersUsed`, `durationMs`, `toolsDiscovered`, `frictionEvents`, `status`).

---

### Step 4: Phase 2 — Workflow Building Execution (`Builders`)
Spawn two independent builder subagents in their respective configured sandboxes:

- **Standardized Prompt**:
  > *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*

#### Builder A (`n8n-as-code Builder`)
- Authors the workflow, validates locally via `n8nac skills validate`, pushes to instance via `n8nac push`.
- Returns raw facts: workflow ID, deployed JSON, turns taken, validation errors encountered, wall-clock time, tokens used.

#### Builder B (`Native MCP Builder`)
- Authors the workflow using `@n8n/workflow-sdk`, deploys via `create_workflow_from_code` (or `create_workflow`).
- Returns raw facts: workflow ID, deployed JSON, turns taken, validation errors encountered, wall-clock time, tokens used.

---

### Step 5: Phase 3 — Symmetrical Independent Evaluation (`Judges A & B`)
Spawn **two separate Judge Subagents** concurrently, each reviewing strictly its own branch:

#### Judge A (`Judge n8n-as-code`)
- **Input**: Only Installer A Log, Builder A Log, Telemetry A, Workflow A JSON, and [`references/EVALUATION_RUBRIC.md`](references/EVALUATION_RUBRIC.md).
- **Task**:
  - Score Installation A (20%)
  - Score Ease of Use / DX A (20%)
  - Score Workflow Quality A (30%)
  - Compute Tokens A (15%) and Time A (15%)
  - Output structured scorecard with line-by-line justifications.

#### Judge B (`Judge Native MCP`)
- **Input**: Only Installer B Log, Builder B Log, Telemetry B, Workflow B JSON, and [`references/EVALUATION_RUBRIC.md`](references/EVALUATION_RUBRIC.md).
- **Task**:
  - Score Installation B (20%)
  - Score Ease of Use / DX B (20%)
  - Score Workflow Quality B (30%)
  - Compute Tokens B (15%) and Time B (15%)
  - Output structured scorecard with line-by-line justifications.

---

### Step 6: Final Aggregation & Dashboard Compilation
The Primary Orchestrator receives both independent scorecards, merges them into the comparative reports, and displays the results:
- 📄 `benchmark/reports/benchmark_report.md`
- 📊 `benchmark/reports/benchmark_dashboard.html`
- 💾 `benchmark/reports/benchmark_results.json`
