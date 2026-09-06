---
name: benchmark-n8n-workflow-creation
description: Standardized, scientifically impartial benchmark harness comparing n8n-as-code with n8n Native MCP using strictly symmetrical, hermetic pipelines (Installer -> Builder -> Judge per branch) with zero cross-talk, zero self-evaluation, and zero judge contrast bias.
---

# Skill: Benchmark n8n-as-code vs. n8n Native MCP

Use this skill when asked to benchmark, compare, or scientifically evaluate **n8n-as-code** versus **n8n Native MCP**.

---

## 🎯 Hermetic Symmetrical Architecture: 2-Tier Execution + Deterministic Validation

To achieve absolute scientific neutrality and eliminate subjective LLM evaluation:
1. **Zero Self-Evaluation**: No worker (Installer or Builder) grades or evaluates its own work. They produce only factual, raw execution traces.
2. **Zero Subjective LLM Judges**: Replaced entirely by server-side ground truth via n8n's official `validate_node_config` RPC tool, graph topology inspection, and live cloud execution audits.
3. **Universal Confinement**: A strictly generic system prompt prevents agents from querying or listing existing workflows on the target instance:
   > *« INTERDICTION FORMELLE : Vous ne devez JAMAIS lister, rechercher ou inspecter les workflows existants sur l'instance n8n. Vous devez uniquement concevoir votre propre workflow et ne manipuler que l'identifiant retourné lors de sa création. »*
4. **Universal Minimax Scaling**: Quantitative latencies and token counts are scaled symmetrically via $\text{Score} = 100 \times \frac{\min(A, B)}{X}$, eliminating floor effects.

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

### Step 2: LLM Model Locking & Subagent Persona Registration
To guarantee scientific parity and strict sandbox confinement:
- Lock the model parameter for **all 6 subagents** (`Model: 'inherit'`, `'flash'`, or `'pro'`).
- The chosen model is recorded in the benchmark telemetry and shown in the final reports.

#### Register Subagent Persona with Universal Confinement
Before spawning workers, the orchestrator registers the hermetic worker persona via `define_subagent` (or harness configuration):

```javascript
define_subagent({
  name: "hermetic_worker",
  description: "Autonomous engineering subagent confined strictly to its local sandbox.",
  system_prompt: `You are an autonomous software engineering agent tasked with executing development or configuration tasks.

CONFINEMENT & SECURITY RULES (CRITICAL):
- Your dedicated workspace is your current working directory ('.').
- You must operate exclusively within your current working directory.
- NEVER list, inspect, read, or execute commands in parent directories ('..') or sibling workspaces.
- Discover and utilize the tools, CLI binaries, libraries, or environment variables present in your local workspace.
- INTERDICTION FORMELLE : Vous ne devez JAMAIS lister, rechercher ou inspecter les workflows existants sur l'instance n8n. Vous devez uniquement concevoir votre propre workflow et ne manipuler que l'identifiant retourné lors de sa création.
- Nommez obligatoirement votre workflow sous la forme : workflow-<timestamp> (ex: workflow-1741300000).`,
  enable_write_tools: true,
  enable_mcp_tools: true,
  enable_subagent_tools: false
});
```

---

### Step 3: Phase 1 — Installation Execution (`Installers`)
Spawn two independent installer subagents in their respective clean sandboxes using the `hermetic_worker` persona with `Workspace: 'branch'`.

> [!IMPORTANT]
> **Pure Natural Installer Prompts**: No filesystem paths, no technical preamble, no policing in the user prompt. Confinement is enforced by the system prompt.

#### Installer A (`n8n-as-code Installer`)
- **Invocation**: `TypeName: "hermetic_worker"`, `Role: "Installer A (n8n-as-code)"`, `Workspace: "branch"`
- **Pure User Prompt**:
  ```text
  Installe n8n-as-code (https://github.com/EtienneLescot/n8n-as-code). Les credentials sont dans le .env
  ```
- **Harness Tracking**: The orchestrator records start/end timestamps and captures the installer commands and status.

#### Installer B (`Native MCP Installer`)
- **Invocation**: `TypeName: "hermetic_worker"`, `Role: "Installer B (Native MCP)"`, `Workspace: "branch"`
- **Pure User Prompt**:
  ```text
  Installe et configure n8n Native MCP (https://docs.n8n.io/connect/connect-to-n8n-mcp-server). Les credentials sont dans le .env
  ```
- **Harness Tracking**: The orchestrator records start/end timestamps and captures the installer commands and status.

---

### Step 4: Phase 2 — Workflow Building Execution (`Builders`)
Spawn two independent builder subagents in their respective configured sandboxes using `TypeName: "hermetic_worker"` and `Workspace: "branch"`.

> [!IMPORTANT]
> **100% Natural User Request**:
> Both builders receive **strictly and exclusively** the authentic user request. Zero filesystem paths, zero system role preamble, zero technical micro-management, zero formatting overhead.
> 
> **Exact User Prompt Sent to Both Builders**:
> ```text
> Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée.
> ```

- **How Builders Discover Their Toolchain**:
  - **Branch A (`n8n-as-code`)**: Discovers its environment through its local sandbox setup (`AGENTS.md`, `.agents/skills/n8n-architect/`, `n8nac` commands).
  - **Branch B (`n8n Native MCP`)**: Discovers its environment through the MCP server tools exposed in its runtime.
- **External Harness Stopwatch**:
  - The Orchestrator records `startTime` upon dispatching the prompt and `endTime` when the subagent signals completion (`durationMs = endTime - startTime`).
  - The Orchestrator writes `logs/builder_run.json` with external telemetry and the builder's completion message.

---

### Step 5: Phase 3 — Ground-Truth API Validation & Quality Audit (`validator.mjs`)
Rather than relying on subjective LLM evaluator judges, quality is audited deterministically with **zero LLM inference** directly on the live n8n instance:

```bash
# Validate any workflow directly against n8n Cloud server schemas:
node benchmark/harness/validator.mjs <workflowId>
# Or via CLI:
npm run validate <workflowId>
```

The validator performs:
1. **Node Schema Validity (40% of Quality)**: Calls n8n server RPC `validate_node_config` for each node (parameters, required subnodes, credentials).
2. **Graph Topology & Integrity (30% of Quality)**: Graph adjacency check verifying all functional nodes are connected with 0 orphaned nodes.
3. **Live Execution Verification (30% of Quality)**: Queries `GET /api/v1/executions` to verify live cloud execution status and output payloads.

---

### Step 6: Phase 4 — Deterministic Minimax Compilation & Reporting
The Primary Orchestrator compiles the factual telemetry and API validation results into final reports using:

```bash
npm run report
```

This executes `benchmark/harness/compiler.mjs`, calculating:
- **Universal Minimax Scaling**: $100 \times \frac{\min(A, B)}{X}$ for Creation Time (25%), Token Efficiency (20%), and Setup Time (20%).
- Generates:
  - 📄 `benchmark/reports/benchmark_report.md` (Markdown summary)
  - 📊 `benchmark/reports/benchmark_dashboard.html` (Interactive Generative UI dashboard)
  - 💾 `benchmark/reports/benchmark_results.json` (Machine-readable facts & scores)


