# Protocol: Environment Isolation & Impartiality Standards

This document establishes the mandatory isolation barriers and impartiality rules for running the benchmark comparing **n8n-as-code** and **n8n Native MCP**.

---

## 1. Core Principle of Impartiality

To guarantee valid, scientific, and uncompromised comparison:
1. **Identical Machine & Network**: Both branches must run on the exact same host machine, utilizing the same network conditions and accessing the same n8n instance (or twin instances).
2. **Identical LLM Engine**: The exact same model, configuration, and temperature must be used for both branches:
   - Model: **Gemini 3.8 Flash (High)**
   - System Prompt / Agent Baseline: Identical tool-calling capabilities.
   - Temperature: Fixed at `0.2` (or default deterministic mode).
3. **Identical Benchmark Prompt**:
   > *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*
   No hints, extra instructions, or pre-crafted node IDs may be given to either branch.
4. **Independent Evaluation**: Evaluation must follow the standardized rubric ([`EVALUATION_RUBRIC.md`](EVALUATION_RUBRIC.md)) without bias toward code-first or remote-first approaches.

---

## 2. Sandbox & Filesystem Isolation Barriers

Each tool execution must occur in a dedicated, isolated sandbox directory:
- `sandboxes/run_<timestamp>_n8n_as_code/`
- `sandboxes/run_<timestamp>_n8n_native_mcp/`

### Rules of Isolation:
- **No Shared Filesystem State**: Neither branch is allowed to read from or write to the other branch's directory.
- **Pristine Environment**: Each sandbox starts without pre-existing `n8nac-config.json`, generated `.workflow.ts` files, or cached schemas.
- **Clean Configuration**:
  - `n8n-as-code` runs `n8nac env add` inside its own sandbox.
  - `n8n Native MCP` establishes its own session (`initialize` handshake) without sharing MCP session tokens or memory.
- **Artifact Preservation**: All generated files (`workflow.json`, `workflow.ts`, logs, transcripts) are preserved in their respective sandboxes for auditability.

---

## 3. Subagent & Context Isolation (Auto Mode)

In **Auto Mode**, Antigravity spawns subagents to act as the workflow builders:
- **Zero Cross-Talk**: Subagent A (`n8n-as-code`) and Subagent B (`n8n Native MCP`) must be spawned in separate conversation threads (`Workspace: 'branch'` or isolated subagent context).
- **No Shared Memory**: Subagent B must have zero awareness of Subagent A's tool calls, errors, or generated code.
- **Order Invariance**: The order of execution (A then B, or B then A, or in parallel) must not leak any context between runs.
- **Autonomous Role Separation**:
  - The **Parent Agent** plays the role of the User (prompting, supplying credentials from `.env` only when requested) and Judge (evaluating after completion).
  - The **Subagents** play the role of the Builder (installing, generating, validating, deploying).

---

## 4. Instance-Level Isolation

When operating against a live n8n instance:
- **Namespace Tagging**: Workflows created by either branch must include distinct identifiers in their name or tags (e.g. `[Benchmark-N8NAC]` vs `[Benchmark-NativeMCP]`).
- **No Overwriting**: Each branch generates a new workflow with a unique ID; neither branch is permitted to edit the workflow created by the other.
- **Auditability**: Both workflows remain live and inspectable on the canvas to verify node connections, parameters, and layout cleanliness.
