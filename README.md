# n8n-harness-benchmark

**How fast, frugal, and compliant is AI-driven workflow creation on n8n?** Code-first GitOps (`n8n-as-code`) vs. remote JSON-RPC (`n8n Native MCP`) — evaluated on the same live n8n instance under identical conditions, with zero subjective LLM judges, server-side RPC validation, and universal minimax scaling.

**Results:** <https://etiennelescot.github.io/n8n-harness-benchmark/>  
*Historical run data, reports, and workflow JSON files are archived in [`results/`](results/).*

---

## 🚀 Run it

This benchmark is designed to be executed by an **AI Coding Agent** (Orchestrator) — such as **Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, or a custom CLI runner. The agent sets up hermetic sandboxes, dispatches subagents, and triggers deterministic server audits.

### 1. The Ideal Prompt for your Coding Agent

Simply paste this prompt into your coding agent:

```text
Clone le repo https://github.com/EtienneLescot/n8n-harness-benchmark.git, lis les instructions du benchmark et lance l'évaluation comparative entre n8n-as-code et n8n Native MCP sur mon instance n8n.
```

*(English version)*:
```text
Clone https://github.com/EtienneLescot/n8n-harness-benchmark.git, read the benchmark instructions, and run the comparative evaluation between n8n-as-code and n8n Native MCP on my n8n instance.
```

**What the Orchestrator will do automatically:**
1. **Credentials Gate**: Reads `.env` for `N8N_HOST`, `N8N_API_KEY`, `N8N_NATIVE_MCP_URL`, and `N8N_NATIVE_MCP_TOKEN` (prompting you in chat if anything is missing).
2. **Lock Parameters**: Standardizes model IDs (`Gemini 3.8 Flash High`, `Claude 3.7 Sonnet`, etc.) and temperature (`0.2`).
3. **Partition Sandboxes**: Spawns isolated workspaces for Branch A (`n8n-as-code`) and Branch B (`n8n Native MCP`) with universal confinement and opaque naming (`workflow-<timestamp>`).
4. **Deploy & Time**: Dispatches subagents to install dependencies and author the multi-agent workflow under external stopwatch timing.
5. **Deterministic API Audit**: Queries the n8n Cloud server's official `validate_node_config` RPC, calculates universal minimax scores, and updates `results/` and `docs/`.

---

### 2. Manual CLI Utilities (Inspection & Diagnostics)

Developers can also run standalone verification and compilation utilities directly from the terminal:

```bash
git clone https://github.com/EtienneLescot/n8n-harness-benchmark.git
cd n8n-harness-benchmark && npm install

# 1. Verify credentials and connectivity to your n8n instance & Native MCP server
npm run verify

# 2. Deterministically audit a live workflow on n8n Cloud (Zero LLM: validate_node_config RPC)
npm run validate <workflowId>

# 3. Evaluate a local workflow JSON file against the rubric
npm run evaluate -- results/history/run_3/workflow_n8n_as_code.json

# 4. Compile reports, update aggregate.json, and refresh dashboard
npm run report
```

---

## 🎯 What is measured

Both toolchains receive **strictly and exclusively** the authentic user prompt with zero system preamble or filesystem paths:

> *"Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."*

### Architecture Tested:
- **Triggers**: Schedule trigger (daily run) and/or Webhook entrypoint.
- **Multi-Agent Orchestrator**: LangChain agent node wired to language models, window buffer memory, and tool subnodes.
- **Tools**: Google Mail tool and Google Calendar tool.
- **Output Presentation**: Responsive HTML briefing dashboard template with inline styles.

---

## 🔬 What a result means

Scores are calculated across four standardized dimensions:

| Dimension | Weight | Measurement Source | Scoring Formula |
|---|:---:|---|---|
| **1. Workflow Quality** | **40%** | Live n8n Cloud API + server `validate_node_config` | $0.60 \times \text{NodeValidity} + 0.40 \times \text{GraphIntegrity}$ |
| **2. Creation Time** | **25%** | External harness stopwatch ($T_{\text{build}}$) | $100 \times \frac{\min(T_A, T_B)}{T_X}$ (Universal Minimax) |
| **3. Token Efficiency** | **25%** | Prompt + completion tokens ($K$) | $100 \times \frac{\min(K_A, K_B)}{K_X}$ (Universal Minimax) |
| **4. Setup Time** | **10%** | External harness stopwatch ($T_{\text{inst}}$) | $100 \times \frac{\min(T_{\text{inst},A}, T_{\text{inst},B})}{T_{\text{inst},X}}$ (Universal Minimax) |

### 1. Zero Subjective LLM Judges (Ground-Truth Server RPC)
Instead of asking an LLM judge to guess code quality, the benchmark queries the live n8n Cloud server's official `validate_node_config` RPC tool:
- **Node Schema Validity (60% of Quality)**: Validates parameter types, required fields, and conditional display options against official server schemas.
- **Graph Topology (40% of Quality)**: Traverses connection adjacency to verify all functional nodes are fully connected (0 orphaned nodes).
- **Live Cloud Execution (Informative Only)**: Standardized benchmarks cannot and should not require real third-party OAuth2 credentials (such as personal Google tokens) on automated instances. Execution history is tracked informatively without distorting the score.

### 2. Universal Minimax Scaling
To eliminate arbitrary cut-off thresholds (floor effect where both contenders get 0 pts despite 3x performance differences), all latency and token metrics use the **Universal Minimax Ratio**:

$$\text{Score}(X) = 100 \times \frac{\min(A, B)}{X}$$

- The fastest or most frugal harness receives 100 pts.
- A harness taking $2\times$ longer receives $50.00$ pts. No arbitrary floor collapse.

### 3. Anti-Contamination & Sandboxing
- **Hermetic Workspaces**: Builders run concurrently in separate directories with isolated `.env` files.
- **Universal Confinement**: Builders operate under a strict rule:
  > *« INTERDICTION FORMELLE : Vous ne devez JAMAIS lister, rechercher ou inspecter les workflows existants sur l'instance n8n. Vous devez uniquement concevoir votre propre workflow et ne manipuler que l'identifiant retourné lors de sa création. »*
- **Opaque Workflow Naming**: Workflows must be named with a generic timestamp:
  > *« Nommez obligatoirement votre workflow sous la forme : workflow-<timestamp> (ex: workflow-1741300000). »*

---

## 🔍 Key Architectural Trade-offs

### 1. Pre-flight Local Validation vs. Remote Iteration
- **`n8n-as-code`**: Authoring workflows as declarative TypeScript allows instantaneous offline pre-flight validation, type-checking, and zero-roundtrip edits.
- **`n8n Native MCP`**: Interacts directly with the live server schema via JSON-RPC. While network round-trips add latency, iterative validation against `validate_node_config` catches subtle server parameter discrepancies before deployment.

### 2. Context & Token Efficiency
- **`n8n-as-code`**: Bundles localized schema knowledge in the workspace, consuming 19% to 50% fewer tokens than full MCP tool definitions.
- **`n8n Native MCP`**: Transports extensive tool definitions across conversational turns, leading to higher token footprint on complex multi-node graphs.

---

## 🌐 Community Submissions & Pull Request Protocol

This benchmark is cross-platform and portable. Whether running in **Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, or a custom CLI, developers can execute the benchmark against their n8n instance and submit results to the public matrix via Pull Request.

### Mandatory Manifest Standards:
Submissions must **explicitly declare execution facts** in `benchmark_results.json` (never inferred):
```json
"metadata": {
  "harness": "Antigravity",
  "primaryAgent": "Antigravity Orchestrator",
  "model": "Gemini 3.8 Flash High",
  "temperature": 0.2,
  "subagentRuntime": "Antigravity invoke_subagent",
  "environment": {
    "os": "Windows 11 (win32-x64)",
    "nodeVersion": "v24.14.0",
    "n8nInstance": "https://your-instance.app.n8n.cloud"
  }
}
```

Pull Requests containing inferred or missing model/harness specifications will not be merged.

---

## 📦 Repository Structure

```
.
├── docs/                 # GitHub Pages website (etiennelescot.github.io/n8n-harness-benchmark)
│   ├── index.html        # Interactive results presentation (Newsreader + IBM Plex Mono)
│   └── results.json      # Latest compiled benchmark data
├── results/              # Historical benchmark runs & artifacts
│   ├── benchmark_report.md
│   ├── benchmark_results.json
│   └── history/          # Archived runs with deployed workflow JSONs
├── benchmark/            # Core benchmark engine
│   ├── harness/          # compiler.mjs, validator.mjs, runner.mjs
│   ├── reporters/        # markdown, json, and html dashboard generators
│   └── sandboxes/        # Partitioned worker sandboxes
└── skills/               # Reusable Antigravity benchmark skill
```

---

## 📄 License
[MIT](LICENSE) © 2026 Etienne Lescot
