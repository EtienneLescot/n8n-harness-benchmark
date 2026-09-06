---
name: benchmark-n8n-workflow-creation
description: Standardized, scientifically impartial benchmark harness comparing n8n-as-code with n8n Native MCP using strictly separated Worker Subagents (Installers, Builders) and an external Impartial Judge Subagent (zero self-evaluation).
---

# Skill: Benchmark n8n-as-code vs. n8n Native MCP

Use this skill when asked to benchmark, compare, or scientifically evaluate **n8n-as-code** versus **n8n Native MCP**.

---

## 🎯 Separation of Execution & Evaluation: The Zero Self-Evaluation Rule

In this benchmark, **no agent ever judges itself**:
1. **Worker Subagents (`Installers` & `Builders`)**:
   - Focus exclusively on execution.
   - Record factual raw traces (commands executed, error messages, timestamps, token counts, deployed workflows).
   - **Never grade, score, or evaluate their own performance.**
2. **Judge Subagent (`Impartial LLM Judge`)**:
   - Independent subagent that wrote zero code and executed zero installations.
   - Receives the raw installation logs, build logs, telemetry, and deployed workflow JSONs.
   - Evaluates all dimensions objectively:
     - **Ease of Installation (20%)** based on raw installer traces.
     - **Ease of Use / DX (20%)** based on raw builder iteration logs and friction events.
     - **Quality of Workflow (30%)** based on the deployed workflow JSON against the rubric.
     - **Tokens (15%) & Time (15%)** computed mathematically from raw telemetry.

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

## 📋 Execution Protocol (Step-by-Step)

### Step 1: Credentials Gate
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
- Lock the model parameter for **all subagents** (`Model: 'inherit'`, `'flash'`, or `'pro'`).
- The chosen model is recorded in the benchmark telemetry and shown in the final reports.

---

### Step 3: Phase 1 — Installation Execution (`Installers`)
Spawn two independent installer subagents via `invoke_subagent`:

#### Installer A (`n8n-as-code Installer`)
- **Workspace**: `benchmark/sandboxes/run_<id>_n8nac/`
- **Task**: Install and link n8n-as-code to the target instance using credentials from `.env`.
- **Output**: Return a factual execution log:
  ```json
  {
    "tool": "n8n-as-code",
    "commandsExecuted": ["n8nac env add...", "n8nac env auth..."],
    "durationMs": 18000,
    "stdout": "...",
    "stderr": "...",
    "frictionEvents": [],
    "status": "ready"
  }
  ```

#### Installer B (`Native MCP Installer`)
- **Workspace**: `benchmark/sandboxes/run_<id>_native_mcp/`
- **Task**: Establish connection to the Native MCP server via credentials from `.env` and query available tools.
- **Output**: Return a factual execution log:
  ```json
  {
    "tool": "n8n-native-mcp",
    "headersUsed": ["Accept: application/json, text/event-stream", ...],
    "durationMs": 24000,
    "toolsDiscovered": 39,
    "frictionEvents": [],
    "status": "ready"
  }
  ```

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

### Step 5: Phase 3 — Impartial Evaluation (`Judge Subagent`)
Spawn an **independent Judge Subagent** with zero prior context:
- **Role**: `Impartial Benchmark Judge`
- **Model**: Same locked model
- **Inputs**:
  - Raw Installer Logs (A & B)
  - Raw Builder Logs (A & B)
  - Raw Telemetry (duration, tokens)
  - Deployed Workflow JSONs (A & B)
  - Standardized Rubric ([`references/EVALUATION_RUBRIC.md`](references/EVALUATION_RUBRIC.md))
- **Judge Responsibilities**:
  1. **Scores Installation (20%)** based on command count, errors, and onboarding complexity.
  2. **Scores Ease of Use / DX (20%)** based on iteration loops, linting safety, and friction.
  3. **Scores Workflow Quality (30%)** across Brief (25), Nodes & Wiring (25), Wow/Style (25), and Execution (25).
  4. **Computes Tokens (15%) & Time (15%)** using mathematical normalization formulas.
  5. Produces detailed justifications for every score without bias.

---

### Step 6: Final Reporting & Dashboard
The Primary Agent aggregates the Judge's evaluations into:
- 📄 `benchmark/reports/benchmark_report.md`
- 📊 `benchmark/reports/benchmark_dashboard.html`
- 💾 `benchmark/reports/benchmark_results.json`

And presents the final scores and deployed workflow links to the user.
