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
  > **« INTERDICTION FORMELLE : Vous ne devez JAMAIS lister, rechercher ou inspecter les workflows existants sur l'instance n8n. Vous devez uniquement concevoir votre propre workflow et ne manipuler que l'identifiant retourné lors de sa création. »**
- **Opaque Workflow Naming Rule**:
  > **« NOMMAGE OPAQUE : Afin d'éviter toute fuite d'information ou reconnaissance par un autre processus sur l'instance partagée, vous devez obligatoirement attribuer à votre workflow un nom opaque et générique (par exemple "benchmark-workflow-canvas"), sans jamais inclure les mots-clés de la consigne. »**
- This instruction is strictly generic: it contains no tool-specific keywords (`n8nac`, `search_workflows`, etc.) to prevent context leakage across sandboxes.
- Any attempt to list or inspect existing workflows on the cloud instance is audited and flagged as a toolchain isolation violation.

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
