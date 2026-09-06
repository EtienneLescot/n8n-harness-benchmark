# Protocol: Environment Isolation & Impartiality Standards

This document establishes the mandatory isolation barriers, context protection rules, and impartiality protocols for running the benchmark comparing **n8n-as-code** and **n8n Native MCP**.

---

## 1. Core Principle of Impartiality

To guarantee valid, scientific, and uncompromised comparison:
1. **Identical Machine & Network**: Both branches must run on the exact same host machine, utilizing the same network conditions and accessing the same n8n instance (or twin instances).
2. **Identical LLM Engine & Locked Parameters**: Both subagents **must** be spawned with the exact same model configuration (`Model: 'inherit'`, `'flash'`, or `'pro'`) and identical temperature (`0.2` or deterministic default). The model parameter must be explicitly logged in the benchmark telemetry and dashboard.
3. **Identical Benchmark Prompt**:
   > *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*
   No hints, extra instructions, or pre-crafted node IDs may be given to either branch.
4. **Independent Evaluation**: Evaluation must follow the standardized rubric ([`EVALUATION_RUBRIC.md`](EVALUATION_RUBRIC.md)) without bias toward code-first or remote-first approaches.

---

## 2. Preventing Context Contamination (The Subagent Imperative)

### ⚠️ The Danger of Sequential In-Chat Execution
When an agent creates Workflow A (e.g. via `n8n-as-code`), and then creates Workflow B (e.g. via `Native MCP`) **within the same conversation thread**:
- **Cognitive Leakage**: All design decisions (node names, cron schedules, query parameters, HTML templates, layout coordinates) remain present in the model's active attention window.
- **First-Mover Penalty / Second-Mover Free Ride**: The second tool avoids the cognitive effort of architectural planning and simply translates the existing structure from JSON to SDK code.
- **Spurious Structural Correlation**: Both workflows end up having identical node names, pins, and canvas positions, invalidating any genuine comparison of how each tool naturally guides the agent.

### 🛡️ The Hermetic Subagent Solution
To eliminate context contamination:
- **Zero Shared Context**: Workflow A and Workflow B must be built by **two independent subagents** spawned via `invoke_subagent`.
- **Clean Memory**: Subagent B is instantiated in a clean conversation with zero access to Subagent A's memory, files, tool calls, or reasoning tokens.
- **Isolated `.env`**: Each subagent receives an isolated working directory with an isolated `.env` file containing only the credentials relevant to its assigned tool.

---

## 3. Sandbox & Filesystem Isolation Barriers

Each subagent runs in a dedicated sandbox directory:
- `benchmark/sandboxes/run_<timestamp>_n8nac/`
- `benchmark/sandboxes/run_<timestamp>_native_mcp/`

### Rules of Isolation:
- **No Shared Filesystem State**: Neither subagent is allowed to read from or write to the other subagent's sandbox.
- **Pristine Environment**: Each sandbox starts without pre-existing `n8nac-config.json`, generated `.workflow.ts` files, or cached schemas.
- **Clean Configuration**:
  - `n8n-as-code` subagent runs `n8nac env add` inside its own sandbox.
  - `n8n Native MCP` subagent establishes its own session (`initialize` handshake) without sharing MCP session tokens or memory.
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
