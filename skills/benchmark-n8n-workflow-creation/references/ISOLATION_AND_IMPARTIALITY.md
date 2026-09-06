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
- **Judge A** evaluates **only** Branch A (`n8n-as-code`), using the absolute rubric, without any knowledge of Branch B.
- **Judge B** evaluates **only** Branch B (`Native MCP`), using the exact same absolute rubric, without any knowledge of Branch A.
- Both judges are spawned with identical model configuration and temperature (`0.2`).
- The Primary Orchestrator merely aggregates the two independent scorecards.

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

### 🗣️ Principle 4: Agnostic User Prompts (No Technical Micro-Management)
Builders must be tested under natural, realistic user conditions:
- **No Implementation Guidance**: Prompts must NEVER dictate the internal implementation (e.g., specifying which node types to wire, subnodes to attach, or syntax patterns to use). The tool's ability to guide the model towards correct architectural choices is a core facet of Developer Experience (DX).
- **No Formatting / File Overhead**: Prompts must NEVER ask builders to convert files locally, write specific JSON filenames, or output internal diagnostics.
- **Natural Request Format**: The prompt must read like an authentic user request: *"Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."*

### ⏱️ Principle 5: External Harness-Measured Timing (No Self-Report Asymmetry)
To prevent disparate duration reporting (such as one subagent recording an entire 400s human-like authoring session while another records only a 400ms HTTP POST network latency):
- The **Orchestrator** records `startTime` upon launching the builder subagent and `endTime` when the subagent signals completion.
- `durationMs = endTime - startTime` is calculated externally and passed directly to the Judge.
- Both branches are subjected to the exact same wall-clock stopwatch.

### 🌐 Principle 6: Direct Live Instance Retrieval by Judge
Builders only deploy the workflow and return its `workflowId`.
- The **Judge** connects directly to the live n8n instance via REST API (`GET /api/v1/workflows/:id`) using the deployed ID.
- This verifies that the workflow actually exists and compiles in production, avoiding local mock files and ensuring the evaluated artifact is the real deployed state.


---

## 2. Preventing Context Contamination (Subagent Hermetic Isolation)

### ⚠️ The Danger of Sequential In-Chat Execution
When an agent creates Workflow A, and then creates Workflow B **within the same conversation thread**:
- **Cognitive Leakage**: All design decisions (node names, cron schedules, query parameters, HTML templates, layout coordinates) remain present in the model's active attention window.
- **First-Mover Penalty / Second-Mover Free Ride**: The second tool avoids the cognitive effort of architectural planning and simply translates the existing structure from JSON to SDK code.
- **Spurious Structural Correlation**: Both workflows end up having identical node names, pins, and canvas positions, invalidating any genuine comparison of how each tool naturally guides the agent.

### 🛡️ The Hermetic Symmetrical Subagent Solution
To eliminate context contamination at every single stage:
- **Phase 1 (Install)**: `Installer A` runs isolated from `Installer B`.
- **Phase 2 (Build)**: `Builder A` runs isolated from `Builder B`.
- **Phase 3 (Judge)**: `Judge A` runs isolated from `Judge B`.
- **Zero Shared Context**: Neither branch ever communicates with or references the other branch.

---

## 3. Sandboxes & Filesystem Isolation Barriers

Each worker runs in a dedicated sandbox directory:
- `benchmark/sandboxes/run_<timestamp>_n8nac/`
- `benchmark/sandboxes/run_<timestamp>_native_mcp/`

### Rules of Isolation:
- **No Shared Filesystem State**: Neither worker is allowed to read from or write to the other worker's sandbox.
- **Pristine Environment**: Each sandbox starts without pre-existing `n8nac-config.json`, generated `.workflow.ts` files, or cached schemas.
- **Clean Configuration**:
  - `n8n-as-code` worker runs `n8nac env add` inside its own sandbox.
  - `n8n Native MCP` worker establishes its own session (`initialize` handshake) without sharing MCP session tokens or memory.
- **Artifact Preservation**: All generated files (`workflow.json`, `workflow.ts`, logs, transcripts) are preserved in their respective sandboxes for auditability.

---

## 4. Credentials Injection Protocol

1. The **Primary Agent (Orchestrator)** checks for required credentials in `.env`:
   - `N8N_HOST`
   - `N8N_API_KEY`
   - `N8N_NATIVE_MCP_URL`
   - `N8N_NATIVE_MCP_TOKEN`
2. **Interactive Fallback**: If missing, the Orchestrator prompts the human user in the chat before spawning any subagents, providing instructions on how to generate the keys.
3. **Partitioned Distribution**: The Orchestrator writes partitioned `.env` files into each subagent's sandbox so that each subagent only receives the credentials it needs to perform its job.

---

## 5. Instance-Level Isolation

When operating against a live n8n instance:
- **Namespace Tagging**: Workflows created by either branch must include distinct identifiers in their name or tags (e.g. `[Benchmark-N8NAC]` vs `[Benchmark-NativeMCP]`).
- **No Overwriting**: Each branch generates a new workflow with a unique ID; neither branch is permitted to edit the workflow created by the other.
- **Auditability**: Both workflows remain live and inspectable on the canvas to verify node connections, parameters, and layout cleanliness.
