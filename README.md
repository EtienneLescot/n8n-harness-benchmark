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
Clone https://github.com/EtienneLescot/n8n-harness-benchmark.git, read the benchmark instructions, and run the comparative evaluation between n8n-as-code and n8n Native MCP on my n8n instance.
```

**What the Orchestrator will do automatically:**
1. **Credentials Gate**: Reads `.env` for `N8N_HOST`, `N8N_API_KEY`, `N8N_NATIVE_MCP_URL`, and `N8N_NATIVE_MCP_TOKEN` (prompting you in chat if anything is missing).
2. **Lock Parameters**: Records the exact model and temperature used, identically for both branches.
3. **Partition Sandboxes**: Spawns isolated workspaces for Branch A (`n8n-as-code`) and Branch B (`n8n Native MCP`) with universal confinement and a distinct unguessable workflow token per branch (e.g. `bench-3f9a1c72`). Sandboxes contain no rubric and no requirement list, and neither prompt names the other branch's directory.
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

# 4. Compile the report from the two builder logs and the live server audits
npm run report
```

---

## 🎯 What is measured

Both toolchains receive **strictly and exclusively** the authentic user prompt with zero system preamble or filesystem paths:

> *"Create on my n8n instance a multi-agent workflow that daily checks my Google emails and calendar, sorts the information, and presents an HTML daily briefing dashboard."*

### Architecture Tested:
- **Triggers**: Schedule trigger (daily run) and/or Webhook entrypoint.
- **Multi-Agent Orchestrator**: LangChain agent node wired to language models, window buffer memory, and tool subnodes.
- **Tools**: Google Mail tool and Google Calendar tool.
- **Output Presentation**: Responsive HTML briefing dashboard template with inline styles.

---

## 🔬 What a result means

Every weight and every check below is defined in exactly one place,
[`benchmark/harness/scoring.mjs`](benchmark/harness/scoring.mjs). Nothing restates them.

| Dimension | Weight | Measurement Source | Scoring Formula |
|---|:---:|---|---|
| **1. Correctness** | **35%** | Live n8n Cloud API + server `validate_node_config` | $0.40 \times \text{RequirementCoverage} + 0.40 \times \text{NodeValidity} + 0.20 \times \text{GraphIntegrity}$ |
| **2. Token Efficiency** | **35%** | Prompt + completion tokens | Universal Minimax |
| **3. Build Time** | **30%** | External harness stopwatch | Universal Minimax |
| *Setup ease* | *telemetry* | Installer log: friction (70%) and command count (30%) | Reported, not scored |

**Correctness**, not quality: the axis answers whether the workflow works and whether it does
what was asked. Whether it is ambitious or elegant is a separate judgement, not implemented.

**Setup is measured but not scored.** Installation is paid once and amortises away, while
build time and tokens are paid on every workflow. `run_10` measured the cost of keeping it:
at 10% the setup axis moved 6.07 points on a final gap of 5.54, so a once-paid cost decided
the ranking. Acquisition seconds are excluded on both branches, each carrying a benchmark
artefact: unpublished tarballs on one side, a hand-rolled HTTP client on the other.

### 1. Zero Subjective LLM Judges (Ground-Truth Server RPC)
Instead of asking an LLM judge to guess code quality, the benchmark queries the live n8n Cloud server's official `validate_node_config` RPC tool:
- **Requirement Coverage (40% of Correctness)**: Checks the deployed graph against the six required capabilities, on node types and wiring only, never on node names.
- **Node Schema Validity (40% of Correctness)**: Validates parameter types, required fields, and conditional display options against official server schemas.
- **Graph Topology (20% of Correctness)**: Traverses connection adjacency to verify all functional nodes are fully connected (0 orphaned nodes).
- **Live Cloud Execution (Informative Only)**: Standardized benchmarks cannot and should not require real third-party OAuth2 credentials (such as personal Google tokens) on automated instances. Execution history is tracked informatively without distorting the score.

### 2. Universal Minimax Scaling
To eliminate arbitrary cut-off thresholds (floor effect where both contenders get 0 pts despite 3x performance differences), all latency and token metrics use the **Universal Minimax Ratio**:

$$\text{Score}(X) = 100 \times \frac{\min(A, B)}{X}$$

- The fastest or most frugal harness receives 100 pts.
- A harness taking $2\times$ longer receives $50.00$ pts. No arbitrary floor collapse.

### 3. Anti-Contamination & Sandboxing
- **Hermetic Workspaces**: Builders run concurrently in separate directories with isolated `.env` files.
- **Universal Confinement**: Builders operate under a strict rule:
  > *"STRICT PROHIBITION: You must NEVER list, search for, or inspect existing workflows on the n8n instance. You must only design your own workflow and interact solely with the identifier returned upon its creation."*
- **Opaque Workflow Naming**: Workflows must be named with a generic timestamp:
  > *"Mandatory naming format: workflow-<timestamp> (e.g., workflow-1741300000). Never include task keywords in the title."*

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
  "harness": "Claude-Code",
  "primaryAgent": "Claude Code Orchestrator",
  "model": "claude-opus-5",
  "temperature": 0.2,
  "subagentRuntime": "Claude Code Agent tool",
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
├── docs/
│   └── index.html        # GitHub Pages presentation, self-contained, no build step
├── results/
│   ├── benchmark_report.md      # the current run
│   ├── benchmark_results.json
│   └── history/run_10/          # per-run archive: report, audits, both deployed workflows
├── benchmark/
│   ├── harness/
│   │   ├── scoring.mjs   # THE definition of every weight and check — nothing restates it
│   │   ├── validator.mjs # live server audit (validate_node_config + graph)
│   │   ├── compiler.mjs  # minimax + composite from the two builder logs
│   │   └── evaluator.mjs # offline view of scoring.mjs for an undeployed workflow
│   ├── reporters/        # markdown, json, html generators
│   ├── config/           # benchmark.config.json + the native MCP helper reference
│   └── sandboxes/        # partitioned worker sandboxes (gitignored)
└── skills/               # the orchestration skill: protocol, rubric, isolation rules
```

---

## 📄 License
[MIT](LICENSE) © 2026 Etienne Lescot
