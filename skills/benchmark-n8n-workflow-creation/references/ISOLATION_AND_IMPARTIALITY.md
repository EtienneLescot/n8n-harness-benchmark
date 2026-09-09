# Protocol: Environment Isolation & Impartiality Standards

This document establishes the mandatory isolation barriers, context protection rules, and impartiality protocols for running the benchmark comparing **n8n-as-code** and **n8n Native MCP**.

---

## 1. Core Principles of Scientific Impartiality

### ⚖️ Principle 1: Zero Self-Evaluation
No worker agent may ever evaluate, score, or comment qualitatively on its own performance.
- **Workers (Installers & Builders)**: Execute the task and output objective, factual telemetry logs (commands, stdout/stderr, timestamps, errors, tokens, workflow artifacts).
- **Validation**: Performed deterministically via code (`validator.mjs`) inspecting the live n8n instance API.

### 🛡️ Principle 2: Zero Instance Contamination (Universal Confinement & Opaque Naming)
When running on a shared n8n Cloud instance with common API credentials:
- **Universal System Prompt Instruction**:
  > **“STRICT PROHIBITION: You must NEVER list, search for, or inspect existing workflows on the n8n instance. You must only design your own workflow and interact solely with the identifier returned upon its creation.”**
- **Opaque Naming Rule** — the orchestrator generates one unguessable token per branch
  (e.g. `bench-3f9a1c72`) and passes it in that branch's task prompt:
  > **“Mandatory workflow name: use exactly the opaque token supplied to you. Do not derive a name from the request, and do not use a shared or guessable format.”**
- The tokens must be **independent random values**, never a shared prefix plus a timestamp.
  `run_9` used `workflow-<timestamp>` on both branches, which made each workflow trivially
  recognisable to the other on the shared instance — it replaced the anti-recognition rule
  with a rule that defeats it. n8n Cloud has no read audit, so a recognition channel that
  exists cannot be shown afterwards to have gone unused.
- **Never name the sibling sandbox.** Confinement is expressed as “operate only inside your
  own working directory”, never as “do not read `<the other branch's path>`”, which tells
  the worker exactly where its counterpart is.
- **Never place the rubric, the requirement list, or any scoring document inside a sandbox.**
  A worker that can read how it is graded optimises for the grader.
- Any attempt to list or inspect existing workflows on the cloud instance is audited and flagged as a toolchain isolation violation.

### 🧪 Principle 2b: The Builder Prompt Is Fixed, Not Composed Per Run
The builder's task prompt is the confinement block plus the verbatim user request, and
nothing else. The orchestrator may not add design guidance of any kind.

This is not hypothetical. In `run_9` the orchestrator invented, at dispatch time, a clause
that appears nowhere in this repository:

> `NEVER fabricate, create, or assign OAuth credentials (Gmail/Google/OpenAI); leave credential slots empty.`

Both builders read the parenthesis as a ban on the OpenAI-backed **Agent node** and replaced
it with plain Code nodes named “… Agent”. The benchmark's own
`requirements.expectedNodeTypes` asks for `@n8n/n8n-nodes-langchain.agent`, so an
improvised prompt clause silently deleted the capability under test — on both branches at
once, which also manufactured the design convergence the run then had to investigate.

Rules that follow from it:
- Any constraint given to a builder **must exist in this repository** before the run.
- A scoring caveat is never restated as a design constraint. “Execution is not scored
  because OAuth cannot be provisioned” must not become “do not use nodes that need OAuth”.
- The exact dispatched prompt is written to the run directory **verbatim** before the
  workers start. `run_9` wrote only a timestamp, which is why its prompt had to be
  recovered from a conversation export.

### 📋 Principle 3: Concrete Execution Manifest (Never Inferred)
Because benchmark results can be contributed by multiple developers and agent runtimes into a shared public leaderboard:
- Every run **must** record the concrete identity of:
  - `harness`: The orchestrating environment (e.g., `Antigravity`)
  - `primaryAgent`: The orchestrator role/agent name
  - `model`: The exact model ID running the subagents (e.g., `Gemini 3.8 Flash High`)
  - `temperature`: Locked sampling temperature (`0.2`)
  - `evaluationEngine`: Option B (Ground-Truth n8n API Validator + Universal Minimax)
- These fields must be explicit, verifiable facts—never inferred, assumed, or approximated.

### 🗣️ Principle 4: Pure Natural User Prompts (Zero Preamble, Zero Micro-Management)
Workers must be tested under 100% natural, realistic user conditions:
- **No Path Dictation in User Prompts**: Prompts must NEVER tell an agent *"Ton répertoire de travail exclusif est /path/to/sandbox"*. Workspace confinement is a runtime security and harness constraint, NOT user intent.
- **No System Role Preamble in User Prompts**: Prompts must NEVER include artificial meta-instructions like *"You are an AI assistant in an workspace configured with..."*.
- **No Implementation Guidance**: Prompts must NEVER dictate internal implementation (e.g. specifying node types to wire, subnodes, or expression syntax).

### ⏱️ Principle 5: External Harness-Measured Timing
- The **Orchestrator** records `startTime` upon launching the builder subagent and `endTime` when the subagent signals completion.
- `durationMs = endTime - startTime` is calculated externally by the harness stopwatch.

---

## 2. 2-Tier Architecture of Isolation & Deterministic Validation

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
     4. REPORT & MINIMAX             ▼
                      ┌───────────────────────────────┐
                      │   compiler.mjs (Minimax)      │
                      │   - Minimax Speed & Tokens    │
                      │   - Markdown & HTML Dashboard │
                      └───────────────────────────────┘
```
