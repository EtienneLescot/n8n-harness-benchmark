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
   > *“STRICT PROHIBITION: You must NEVER list, search for, or inspect existing workflows on the n8n instance. You must only design your own workflow and interact solely with the identifier returned upon its creation.”*
4. **Relative Cost Scoring**: latencies and token counts are scored against the better branch via $\text{Score} = 100 \times e^{-1.5(X/\min(A,B) - 1)}$ — scale-invariant, so only the A/B gap counts.

```
                      ┌───────────────────────────────┐
                      │    User (Etienne Lescot)      │
                      └──────────────┬────────────────┘
                                     │ "Run the benchmark"
                                     ▼
                      ┌───────────────────────────────┐
                      │   Primary Agent / Orchestrator│
                      │   1. Credentials Gate (.env)  │
                      │   2. Locks Subagent Model     │
                      │   3. Creates Pristine Sandboxes│
                      └──────┬─────────────────┬──────┘
                             │                 │
             ┌───────────────┴──┐           ┌──┴───────────────┐
             │   n8nac BRANCH   │           │ NativeMCP BRANCH │
             └───────┬──────────┘           └──┬───────────────┘
                     │                         │
     1. INSTALL      ▼                         ▼
            [Installer Subagent A]     [Installer Subagent B]
            - Executes installation    - Executes installation
            - Output: Raw Install Log  - Output: Raw Install Log
                     │                         │
     2. BUILD        ▼                         ▼
            [Builder Subagent A]       [Builder Subagent B]
            - Designs & deploys wf     - Designs & deploys wf
            - Output: Raw Build Log+wf - Output: Raw Build Log+wf
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
     4. REPORT & SCORE               ▼
                      ┌───────────────────────────────┐
                      │   compiler.mjs                │
                      │   - Relative speed & tokens   │
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
- STRICT PROHIBITION: You must NEVER list, search for, or inspect existing workflows on the n8n instance. You must only design your own workflow and interact solely with the identifier returned upon its creation.
- Mandatory workflow name: use exactly the opaque token supplied to you in your task prompt. Do not derive a name from the request, and do not use a shared or guessable format.
- Credentials: never create, assign, or fabricate any credential, and never invent a secret value. This is a rule about SECRETS ONLY. It is NOT a restriction on which nodes you may use: nodes that require credentials are expected, and you add them with their credential slot left empty.`,
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
  Install n8n-as-code (https://github.com/EtienneLescot/n8n-as-code). Credentials are in .env
  ```
- **Harness Tracking**: The orchestrator records start/end timestamps and captures the installer commands and status.

#### Installer B (`Native MCP Installer`)
- **Invocation**: `TypeName: "hermetic_worker"`, `Role: "Installer B (Native MCP)"`, `Workspace: "branch"`
- **Pure User Prompt**:
  ```text
  Install and configure n8n Native MCP (https://docs.n8n.io/connect/connect-to-n8n-mcp-server). Credentials are in .env
  ```
- **Harness Tracking**: The orchestrator records start/end timestamps and captures the installer commands and status.

---

### Step 4: Phase 2 — Workflow Building Execution (`Builders`)
Spawn two independent builder subagents in their respective configured sandboxes using `TypeName: "hermetic_worker"` and `Workspace: "branch"`.

> [!IMPORTANT]
> **The builder prompt is fixed, not composed per run.**
> It is exactly two blocks: the `hermetic_worker` confinement text registered in Step 2,
> plus the verbatim user request below. **The orchestrator adds nothing else** — no
> deliverables list, no toolchain steps, no design guidance, no restatement of a scoring
> rule. Only two per-run values are substituted: the sandbox path and the opaque workflow
> token.
>
> **Exact User Prompt Sent to Both Builders**:
> ```text
> Create on my n8n instance a multi-agent workflow that daily checks my Google emails and calendar, sorts the information, and presents an HTML daily briefing dashboard.
> ```

> [!CAUTION]
> **Why this is a hard rule.** In `run_9` the orchestrator improvised a clause that exists
> nowhere in this repository — `NEVER fabricate, create, or assign OAuth credentials
> (Gmail/Google/OpenAI)` — by restating a *scoring* caveat as a *design* constraint. Both
> builders read the parenthesis as a ban on the OpenAI-backed Agent node and replaced it
> with Code nodes named “… Agent”. `requirements.expectedNodeTypes` asks for
> `@n8n/n8n-nodes-langchain.agent`, so one improvised sentence deleted the capability under
> test from both branches at once — and manufactured a design convergence that then had to
> be investigated as suspected contamination.
>
> Before dispatching, the orchestrator **must** write the exact prompt it is about to send
> to `benchmark/sandboxes/<runId>_builder_prompt_<branch>.txt`, verbatim. `run_9` wrote only
> a timestamp, so its prompt was unrecoverable from the repository and had to be extracted
> from a conversation export.

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

The validator performs, with weights read from `benchmark/harness/scoring.mjs` (the single
source of truth — do not restate weights anywhere else):

1. **Requirement Coverage (40% of Quality)**: Checks the deployed graph against
   `requirements.expectedCapabilities`, on node TYPES and wiring only, never on node names.
2. **Node Schema Validity (40% of Quality)**: Calls n8n server RPC `validate_node_config`
   for each node (parameters, required subnodes, credentials).
3. **Graph Topology & Integrity (20% of Quality)**: Graph adjacency check verifying all
   functional nodes are connected with 0 orphaned nodes.

**Live execution is telemetry, not score.** The benchmark cannot provision third-party
OAuth, so scoring a successful run would measure credential availability. This exclusion is
about scoring only: it never licenses a builder to omit nodes that need credentials.

Requirement coverage exists because components 2 and 3 are both normalised by the
workflow's own node count, so on their own they make doing less free. In `run_8` a 4-node
workflow with no triage step scored 100/100 against a 15-node one that fulfilled the brief.

---

### Step 6: Phase 4 — Deterministic Relative Cost Compilation & Reporting
The Primary Orchestrator compiles the factual telemetry and API validation results into final reports using:

```bash
npm run report
```

This executes `benchmark/harness/compiler.mjs`, calculating:
- **Relative Cost Scoring**: $100 \times \frac{\min(A, B)}{X}$ for Creation Time (25%), Token Efficiency (20%), and Setup Time (20%).
- Generates:
  - 📄 `benchmark/reports/benchmark_report.md` (Markdown summary)
  - 📊 `benchmark/reports/benchmark_dashboard.html` (Interactive Generative UI dashboard)
  - 💾 `benchmark/reports/benchmark_results.json` (Machine-readable facts & scores)



---

### Step 7: Phase 5 — Adversarial Judging (eligibility-gated)

Correctness answers *does it work*. It cannot answer *does it hold up*: in `run_10` a
workflow scored 100/100 correctness while chaining the Calendar fetch downstream of an
unrelated LLM agent.

The second judge is specified in full in
`references/JUDGING_PROTOCOL.md`. Two things the orchestrator must do before Phase 4, not
after:

1. **Declare eligibility.** If the runtime exposes no sub-agent dispatch, write
   `judging.eligible = false` into `benchmark_results.json` and publish the run as
   correctness-tier. Do NOT run the loop single-agent: a finder and an attacker sharing a
   context confirm each other, which is the failure mode the protocol exists to prevent.
2. **Assert spatial isolation.** No sandbox may hold a scoring or judging document, under
   its own name, renamed, or reachable through a symlink. This is checked, not promised:

   ```bash
   npm run guard
   ```

   Non-zero exit means a builder could read how it is graded. Abort the run; do not
   delete the offending file and continue, because whatever put it there will do it
   again next run.

The judge itself runs only after both builds are frozen and archived, reads the archived
JSON through `blindWorkflow()`, and scores nothing an agent merely asserted: a finding
enters the Latent Defects axis only when a predicate over the artefact returns true.
