# n8n-harness-benchmark

**How fast, frugal, and compliant is AI-driven workflow creation on n8n?** Code-first GitOps (`n8n-as-code`) vs. remote JSON-RPC (`n8n Native MCP`) — evaluated on the same live n8n instance under identical conditions. Correctness is settled server-side with no LLM anywhere near it. Quality is graded by an isolated three-judge panel per build, under a [published rubric](skills/judging/references/QUALITY_RUBRIC.md) that says what a grade must cite to count. Cost is scored relative to the better branch, scale-invariantly.

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

**What the Orchestrator will do automatically**, following [`skills/benchmark-n8n-workflow-creation/SKILL.md`](skills/benchmark-n8n-workflow-creation/SKILL.md):

1. **Credentials gate**: reads `.env` for `N8N_HOST`, `N8N_API_KEY`, `N8N_NATIVE_MCP_URL` and `N8N_NATIVE_MCP_TOKEN`, prompting you in chat if anything is missing.
2. **Lock parameters**: records the exact model and temperature used, identically for both branches.
3. **Partition sandboxes**: isolated workspaces for Branch A (`n8n-as-code`) and Branch B (`n8n Native MCP`), each with an unguessable workflow token. No sandbox holds a rubric or a requirement list, and neither prompt names the other branch's directory. `npm run guard` proves it rather than promising it.
4. **Readiness gate** (`npm run ready -- <runId>`): each sandbox must carry something that makes its toolchain discoverable — `AGENTS.md` for Branch A, a usable MCP caller for Branch B. A builder that cannot find its toolchain writes the JSON by hand and the cost axes then measure nothing. This has voided three branches.
5. **Deploy and time**: dispatches one builder per branch under an external stopwatch, with the request sent verbatim and archived before dispatch.
6. **Usage gate** (`npm run used -- <runId>`): each builder log must show the branch driving its own toolchain. A log showing only REST traffic voids the run.
7. **Deterministic audit**: the live server's `validate_node_config` RPC plus graph traversal settle correctness. No LLM takes part.
8. **Quality panel**: three judges per build, one workflow each, blinded, under [`JUDGING_PROTOCOL.md`](skills/benchmark-n8n-workflow-creation/references/JUDGING_PROTOCOL.md) and [`QUALITY_RUBRIC.md`](skills/judging/references/QUALITY_RUBRIC.md). A judge never sees the other workflow, the costs, or the correctness result.
9. **Compile and publish**: relative cost scores, the composite, and an update to `results/` and `docs/`.

> **Both phases are required for a publishable run.** If your runtime cannot dispatch
> sub-agents, write `judging.eligible = false` into the results and publish it as
> correctness-tier. Do not run the panel single-agent: a finder and an attacker sharing one
> context confirm each other, which is the failure the protocol exists to prevent.

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

# 4. The three gates a publishable run must pass
npm run guard                  # no sandbox can read a scoring document
npm run ready -- <runId>       # every sandbox can discover its toolchain
npm run used  -- <runId>       # every builder actually drove it

# 5. Compile the report from the two builder logs and the live server audits
npm run report

# 6. Check the harness itself
npm test
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

| Dimension | Measurement source | How it scores |
|---|---|---|
| **Quality** | Three isolated LLM judges per build, under [`QUALITY_RUBRIC.md`](skills/judging/references/QUALITY_RUBRIC.md) | **Absolute**, against the prompt. The idea, node structure, connections, answer to the brief. |
| **Correctness** | Live n8n API + server `validate_node_config` RPC | **Absolute**, deterministic. Requirement coverage, node validity, graph integrity. No LLM. |
| **Token efficiency** | Prompt + completion tokens | **Relative** to the cheaper branch, exponential decay |
| **Build time** | External harness stopwatch | **Relative** to the faster branch, exponential decay |
| *Setup ease* | Installer log: friction and command count | *Reported, not scored* |

**Why quality is the only absolute score.** Tokens and seconds have no yardstick: 143k tokens is
neither good nor bad on its own, only cheaper or dearer than the other branch, so the only
meaningful figure is the A/B ratio. Quality has one — the prompt. A workflow can be measured
against what was asked with no second workflow in the room. Both branches may score 90. Both
may score 40.

**Correctness answers *does it work*. Quality answers *is this a good answer*.** They are
separate phases with separate safeguards, and a quality judge never sees a correctness result.
In `run_12` both branches scored 100/100 correctness while one of them built an HTML briefing
every morning and left it in the execution data, because its terminal node had no outgoing
edge. That is a quality question, and it now has somewhere to go.

**Setup is measured but not scored.** Installation is paid once and amortises away, while
build time and tokens are paid on every workflow. `run_10` measured the cost of keeping it:
at 10% the setup axis moved 6.07 points on a final gap of 5.54, so a once-paid cost decided
the ranking. Acquisition seconds are excluded on both branches, each carrying a benchmark
artefact: unpublished tarballs on one side, a hand-rolled HTTP client on the other.

### 1. Correctness has no LLM in it

Instead of asking a judge to guess whether a workflow works, the benchmark queries the live n8n server's official `validate_node_config` RPC:
- **Requirement coverage (40% of correctness)**: checks the deployed graph against the six required capabilities, on node types and wiring only, never on node names.
- **Node schema validity (40%)**: parameter types, required fields and conditional display options against official server schemas.
- **Graph topology (20%)**: connection adjacency, verifying every functional node is connected with zero orphans.
- **Live execution (informative only)**: a standardised benchmark cannot require real third-party OAuth credentials, so execution history is tracked without touching the score.

### 2. The quality panel, and what constrains it

An absolute grade from a language model is an opinion unless it is constrained. The rubric sets five rules and a grade breaking any of them is void. The load-bearing ones:

- **One workflow per judge, never two in one context.** A judge that sees both stops grading and starts comparing. `run_12`'s first panel broke this and the grades moved with presentation order: 4 points from the judge who saw the eventual winner first, 23 and 10 from the two who saw it second. That panel was voided and re-run isolated.
- **Every dimension score cites a JSON pointer that resolves.** No citation, no score.
- **Three judges per build, independent contexts.** Published grade is the median, so one outlier cannot drag it. Across builds the panel is pooled rather than taking a median of medians, which threw away most of the sample and once produced a spurious dead heat.
- **Disagreement is published, not smoothed.** A spread wider than 15 points prints all three grades.
- **A blind pairwise check runs alongside, by different agents**, who produce no grade of their own. If it contradicts the ranking the isolated grades produced, the report says so.

Each judge sees one workflow, blinded, the brief verbatim, the harness rules, and the structural facts computed from that workflow. No judge sees the other workflow, the correctness scores, the token counts, the build times, or the branch names.

### 3. Scale-invariant relative cost scoring

Cost axes are scored against the better branch, never against an absolute threshold:

$\text{Score}(X) = 100 \times e^{-1.5\,(X/\min(A,B) - 1)}$

**Why exponential decay and not the plain ratio.** Both read only `X / min(A, B)`, so both
are scale-invariant: multiply every measurement in a run by any factor and the scores do
not move. That property is the point — absolute token counts and wall-clock seconds vary
enormously with the orchestrator, so only the gap between the two branches is comparable
across runs.

They differ in how that gap becomes points. The reciprocal `100 * min/X` understates every
overage: spending 30 % more scored 76.6, a 23 % deficit for a 30 % cost, and the gap widened
with the ratio — doubling the cost lost only half the score. Exponential decay is steeper
where it matters and, unlike a straight line, needs no floor: it approaches zero without
reaching it, so a 2x branch and a 10x branch still rank in the right order instead of both
flattening to nothing.

| Overage | Reciprocal | Exponential |
|---:|---:|---:|
| +10 % | 90.9 | 86.1 |
| +30 % | 76.6 | 63.3 |
| +50 % | 66.7 | 47.2 |
| +100 % | 50.0 | 22.3 |
| +334 % | 23.0 | 0.7 |
### 4. Anti-contamination and sandboxing
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
│   │   ├── compiler.mjs  # relative cost scores + composite from the builder logs
│   │   └── evaluator.mjs # offline view of scoring.mjs for an undeployed workflow
│   ├── reporters/        # markdown, json, html generators
│   ├── config/           # benchmark.config.json + the native MCP helper reference
│   └── sandboxes/        # partitioned worker sandboxes (gitignored)
└── skills/
    ├── benchmark-n8n-workflow-creation/  # the orchestration protocol, isolation rules, gates
    └── judging/                          # the judge kit: quality rubric, defect catalogue,
                                          # n8n execution semantics
```

---

## 📄 License
[MIT](LICENSE) © 2026 Etienne Lescot
