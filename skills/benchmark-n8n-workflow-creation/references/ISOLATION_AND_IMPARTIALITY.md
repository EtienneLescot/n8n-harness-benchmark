# Protocol: Environment Isolation & Impartiality Standards

This document establishes the mandatory isolation barriers, context protection rules, and impartiality protocols for running the benchmark comparing **n8n-as-code** and **n8n Native MCP**.

---

## 1. Core Principles of Scientific Impartiality

### ⚖️ Principle 1: Zero Self-Evaluation
No worker agent may ever evaluate, score, or comment qualitatively on its own performance.
- **Workers (Installers & Builders)**: Execute the task and output objective, factual telemetry logs (commands, stdout/stderr, timestamps, errors, tokens, workflow artifacts).
- **Judges**: External subagents that have not executed any installation or authored any workflows.

### 🛡️ Principle 2: One Judge per Branch (Zero Contrast / Anchoring Bias)
When a single evaluator reviews two artifacts sequentially:
- **Anchoring & Order Bias**: Whichever artifact is reviewed second is judged relative to the first rather than measured against the absolute rubric.
- **Cognitive Carryover**: Thoughts, critiques, and preferences formulated during the first evaluation leak into the scoring of the second.

**The Solution**:
- **Judge A** evaluates **only** Branch A (`n8n-as-code`), using the absolute rubric, having **never seen** Branch B.
- **Judge B** evaluates **only** Branch B (`Native MCP`), using the exact same absolute rubric, having **never seen** Branch A.
- Both judges are spawned with identical model configuration and temperature (`0.2`).
- The Primary Orchestrator merely aggregates the two independent scorecards deterministically.

### 📋 Principle 3: Concrete Execution Manifest (Never Inferred)
Because benchmark results can be contributed by multiple developers and agent runtimes into a shared public leaderboard:
- Every run **must** record the concrete identity of:
  - `harness`: The orchestrating environment (e.g., `Antigravity`, `Claude-Code`, `Cursor`, `Windsurf`)
  - `primaryAgent`: The orchestrator role/agent name
  - `model`: The exact model ID running the subagents (e.g., `Gemini 3.8 Flash High`, `Claude 3.7 Sonnet`, `GPT-4.5`)
  - `temperature`: Locked sampling temperature (`0.2`)
  - `subagentRuntime`: How subagents are spawned (e.g., `invoke_subagent`, `process_fork`)
- These fields must be explicit, verifiable facts—never inferred, assumed, or approximated.
- Pull Requests submitted to the leaderboard without this verified manifest are rejected.

### 🗣️ Principle 4: Pure Natural User Prompts (Zero Preamble, Zero Micro-Management)
Workers and judges must be tested under 100% natural, realistic user conditions:
- **No Path Dictation in User Prompts**: Prompts must NEVER tell an agent *"Ton répertoire de travail exclusif est /path/to/sandbox"*. Workspace confinement is a runtime security and harness constraint, NOT user intent.
- **No System Role Preamble in User Prompts**: Prompts must NEVER include artificial meta-instructions like *"You are an AI assistant in an workspace configured with..."* or *"Target environment: connected to..."*.
- **No Implementation Guidance**: Prompts must NEVER dictate internal implementation (e.g. specifying node types to wire, subnodes, or expression syntax). A tool's capacity to guide the model towards idiomatic architecture is a core facet of Developer Experience (DX).
- **No File or Reporting Overhead**: Prompts must NEVER ask builders to convert files locally, write specific JSON artifacts, or compute telemetry.

### ⏱️ Principle 5: External Harness-Measured Timing (No Self-Report Asymmetry)
To prevent disparate duration reporting (such as one subagent recording an entire 400s human-like authoring session while another records only a 400ms HTTP POST network latency):
- The **Orchestrator** records `startTime` upon launching the builder subagent and `endTime` when the subagent signals completion.
- `durationMs = endTime - startTime` is calculated externally and passed directly to the Judge.
- Both branches are subjected to the exact same wall-clock stopwatch.

### 🌐 Principle 6: Live Instance Retrieval & Toolchain Adherence Verification
- **Toolchain Adherence**: The Judge verifies from the execution trace that Branch A actually utilized `n8n-as-code` (CLI commands, local validation) and Branch B actually utilized `n8n Native MCP` (JSON-RPC tools), penalizing any branch that bypassed its assigned toolchain (-25 pts penalty on *Ease of Use*).
- **Direct Cloud Download**: The Judge identifies the deployed `workflowId` (from the builder's final message, tool logs, or instance workflow list) and fetches the workflow directly via REST API: `GET {N8N_HOST}/api/v1/workflows/{WORKFLOW_ID}`.
- This verifies that the workflow actually exists and compiles in production, avoiding local mock files and ensuring the evaluated artifact is the real deployed state.

---

## 2. The 3-Tier Architecture of Isolation

To maintain rigorous separation of concerns, the benchmark strictly distinguishes between **Runtime Infrastructure**, **System Prompts**, and **User Prompts**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. RUNTIME & INFRASTRUCTURE LAYER (Harness)                             │
│ - Sets Current Working Directory (CWD) strictly to sandbox root         │
│ - Physical / Logical Sandboxing (Workspace: 'branch', chroot, docker)   │
│ - Provisions clean environment: .env, EVALUATION_RUBRIC.md, empty dirs  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ 2. SYSTEM PROMPT LAYER (Persona & Confinement Rules)                    │
│ - Defined via subagent definitions (e.g., define_subagent)              │
│ - UNIVERSAL CONFINEMENT: Operates strictly in '.'; forbids '..' or      │
│   exploring sibling directories across ALL roles (Worker & Judge)       │
│ - Worker Persona: Autonomous engineer discovering local tools           │
│ - Judge Persona: Double-blind auditor, evidence-based, zero assumptions │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ 3. USER PROMPT LAYER (Pure Human Intent)                                │
│ - 100% natural, user-facing prompts                                     │
│ - Zero path mentions, zero meta-instructions, zero technical policing   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Runtime & Infrastructure Layer (Harness)
1. **Working Directory (`cwd`)**: Set strictly to `benchmark/sandboxes/<run_id>/`.
2. **Workspace Isolation**: In agent engines supporting workspace isolation (e.g., Antigravity `Workspace: 'branch'`), each agent operates on an isolated branch/worktree without access to other sandboxes.
3. **Sandbox Pre-population**:
   - `references/EVALUATION_RUBRIC.md`: Copied into the sandbox so the Judge can inspect it locally.
   - `.env`: Partitioned credentials file containing the necessary keys (`N8N_HOST`, `N8N_API_KEY`, etc.).
   - `logs/` and `workflows/`: Pre-created empty directories for factual logs and artifacts.

### Tier 2: System Prompt Layer (Universal Confinement & Personas)
System prompts are configured when declaring agent types (e.g., via `define_subagent` in Antigravity or equivalent harness manifests). **All agents (Installers, Builders, and Judges) receive strict confinement rules in their System Prompt.**

#### A. Worker System Prompt (`hermetic_worker` - Installers & Builders)
```markdown
You are an autonomous software engineering agent tasked with executing development or configuration tasks.

CONFINEMENT & SECURITY RULES (CRITICAL):
- Your dedicated workspace is your current working directory ('.').
- You must operate exclusively within your current working directory.
- NEVER list, inspect, read, or execute commands in parent directories ('..') or sibling workspaces.
- Discover and utilize the tools, CLI binaries, libraries, or environment variables present in your local workspace.
- Do not make assumptions: verify your work locally before reporting completion.
```

#### B. Judge System Prompt (`blind_judge` - Double-Blind Evaluators)
```markdown
You are an independent, double-blind benchmark evaluator.

EVALUATION PRINCIPLES & CONFINEMENT RULES (CRITICAL):
- Your dedicated workspace is your current working directory ('.').
- You must operate exclusively within your current working directory. NEVER explore parent directories ('..') or other sandboxes.
- You are double-blind: you have NO knowledge of competitor branches, other tools, or parallel runs. You evaluate solely the artifacts in this environment against the absolute rubric.
- Strictly adhere to the standardized evaluation rubric found in 'references/EVALUATION_RUBRIC.md'.
- Every score must be strictly grounded in observable facts from 'logs/' (telemetry, turns, command history) and live API queries. Never invent or assume metrics.
- Verify toolchain adherence: if the worker circumvented its designated tools or violated sandbox isolation, apply the mandatory -25 pts penalty on Ease of Use.
- Output your final structured evaluation in 'logs/judge_log.json'.
```

### Tier 3: User Prompt Layer (Pure Human Intent)
Prompts received in the user role are completely free of filesystem paths, directory constraints, or benchmark meta-instructions.

| Role | Pure Natural User Prompt |
|---|---|
| **Installer A (`n8n-as-code`)** | `Installe n8n-as-code (https://github.com/EtienneLescot/n8n-as-code). Les credentials sont dans le .env` |
| **Installer B (`Native MCP`)** | `Installe et configure n8n Native MCP (https://docs.n8n.io/connect/connect-to-n8n-mcp-server). Les credentials sont dans le .env` |
| **Builder A & B** | `Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée.` |
| **Judge A & B** | `Évalue le travail réalisé dans cet environnement selon la grille standardisée 'references/EVALUATION_RUBRIC.md'. Récupère le workflow déployé sur l'instance n8n via l'API, vérifie l'adhérence aux outils sans contournement, et enregistre ton évaluation détaillée dans 'logs/judge_log.json'.` |

---

## 3. The Judge Isolation & Evaluation Protocol

### ⚖️ Why the Judge Must Be Hermetically Isolated
If a judge were to evaluate both branches, or have visibility into parent/sibling directories:
1. **Contrast & Anchoring Distortion**: A judge seeing a 14-node architecture in Branch A will artificially downgrade an 8-node architecture in Branch B, even if Branch B fulfills 100% of the rubric requirements.
2. **Context Leakage**: Explanations or issues discovered in one branch prime the judge's scrutiny on the other branch.
3. **Preserving Double-Blind Objectivity**: By giving each judge only its own sandbox and an absolute rubric (0-100), scores represent true independent measurements.

### 🔍 What the Judge Inspects
Each judge operates autonomously within its assigned sandbox and conducts a 4-stage audit:

1. **Phase 1: Installation Audit**
   - Reads `logs/installer_log.json`.
   - Counts interaction turns, command execution count, error recovery events, and installation duration.
   - Evaluates headless simplicity vs UI friction according to Criterion 1.

2. **Phase 2: Toolchain Adherence & Sandbox Compliance**
   - Inspects the builder's command history and tool traces in `logs/`.
   - Verifies whether the builder used the authorized toolchain (`n8nac` CLI commands for Branch A, Native MCP JSON-RPC tools for Branch B).
   - Verifies that the builder remained strictly within its sandbox directory.
   - **Penalty Enforcement**: If the builder bypassed its toolchain (e.g. hand-crafting raw HTTP requests instead of using MCP tools, or copying code across sandboxes via `shutil.copyfile`), the judge automatically subtracts **25 points** from Criterion 2 (*Ease of Use*).

3. **Phase 3: Live Cloud Ground-Truth Retrieval**
   - Identifies the deployed `workflowId` from the builder's completion log.
   - Makes a live REST API call:
     ```http
     GET {N8N_HOST}/api/v1/workflows/{WORKFLOW_ID}
     Header: X-N8N-API-KEY: {N8N_API_KEY}
     ```
   - Saves the verified production JSON to `workflows/deployed_workflow.json`.
   - Evaluates Criterion 5 (*Workflow Quality*):
     - Initial brief following (Gmail trigger/search, Calendar today query, multi-agent triage, HTML dashboard).
     - Node correctness & wiring (valid types, parameters, expressions, zero orphaned nodes).
     - Architecture & wow effect (clean visual layout, responsive dark styling, multi-agent hierarchy).
     - Live deployment validity.

4. **Phase 4: Scorecard Generation**
   - Computes Criterion 3 (*Token Consumption*) and Criterion 4 (*Creation Time*) using the mathematical formulas in `references/EVALUATION_RUBRIC.md`.
   - Writes `logs/judge_log.json` containing detailed scores (0-100), sub-criteria breakdowns, and qualitative justifications.

---

## 4. Subagent Definition in Antigravity / Harnesses

In Antigravity or compatible agent runtimes, subagents are instantiated using explicit type definitions:

```javascript
// 1. Define Hermetic Worker Type
define_subagent({
  name: "hermetic_worker",
  description: "Autonomous engineering subagent confined strictly to its local sandbox.",
  system_prompt: `You are an autonomous software engineering agent tasked with executing development or configuration tasks.

CONFINEMENT & SECURITY RULES (CRITICAL):
- Your dedicated workspace is your current working directory ('.').
- You must operate exclusively within your current working directory.
- NEVER list, inspect, read, or execute commands in parent directories ('..') or sibling workspaces.
- Discover and utilize the tools, CLI binaries, libraries, or environment variables present in your local workspace.
- Do not make assumptions: verify your work locally before reporting completion.`,
  enable_write_tools: true,
  enable_mcp_tools: true,
  enable_subagent_tools: false
});

// 2. Define Blind Judge Type
define_subagent({
  name: "blind_judge",
  description: "Double-blind evaluation agent confined strictly to its evaluation sandbox.",
  system_prompt: `You are an independent, double-blind benchmark evaluator.

EVALUATION PRINCIPLES & CONFINEMENT RULES (CRITICAL):
- Your dedicated workspace is your current working directory ('.').
- You must operate exclusively within your current working directory. NEVER explore parent directories ('..') or other sandboxes.
- You are double-blind: you have NO knowledge of competitor branches, other tools, or parallel runs. You evaluate solely the artifacts in this environment against the absolute rubric.
- Strictly adhere to the standardized evaluation rubric found in 'references/EVALUATION_RUBRIC.md'.
- Every score must be strictly grounded in observable facts from 'logs/' (telemetry, turns, command history) and live API queries. Never invent or assume metrics.
- Verify toolchain adherence: if the worker circumvented its designated tools or violated sandbox isolation, apply the mandatory -25 pts penalty on Ease of Use.
- Output your final structured evaluation in 'logs/judge_log.json'.`,
  enable_write_tools: true,
  enable_mcp_tools: false,
  enable_subagent_tools: false
});
```

When invoked:
```javascript
// Worker execution:
invoke_subagent({
  TypeName: "hermetic_worker",
  Role: "Builder A (n8n-as-code)",
  Workspace: "branch",
  Prompt: "Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."
});

// Judge execution:
invoke_subagent({
  TypeName: "blind_judge",
  Role: "Judge Sandbox A",
  Workspace: "branch",
  Prompt: "Évalue le travail réalisé dans cet environnement selon la grille standardisée 'references/EVALUATION_RUBRIC.md'. Récupère le workflow déployé sur l'instance n8n via l'API, vérifie l'adhérence aux outils sans contournement, et enregistre ton évaluation détaillée dans 'logs/judge_log.json'."
});
```

---

## 5. Instance-Level Isolation & Cleanliness

When operating against a shared live n8n instance:
- **Unique Workflows**: Each builder run creates a new distinct workflow; neither branch may alter or delete another branch's workflow.
- **Canvas Readability**: Nodes must be arranged cleanly with readable coordinates and proper spacing.
- **Preservation for Verification**: Deployed workflows are kept alive so human reviewers can verify the judge's scoring directly on the n8n canvas.
