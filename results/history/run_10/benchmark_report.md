# Benchmark Report — run_10 (Claude Code / Opus 5)

**n8n-as-code vs. n8n Native MCP** — real workflows deployed to `https://etiennel.app.n8n.cloud`, audited with zero LLM inference.

`run_10` is the first run on the cleaned harness. Three things changed, and they changed
together: the scoring has one definition instead of four, the builder prompt is fixed and
archived instead of composed at dispatch, and the two branches were **strictly sequenced**
with branch A's workflow deleted from the instance before branch B was dispatched.

## Result

Correctness 35 / tokens 35 / build 30. Setup is measured and reported but not scored.

Cost axes score against the cheaper branch with exponential decay,
`100 × e^(-1.5 × (X/min − 1))`: scale-invariant, so only the A/B ratio counts and runs on
different orchestrators stay comparable. Native MCP spent about 30 % more on both cost axes;
that overage costs it 36.7 points rather than the 23.4 a plain reciprocal would have charged.

| Axis | Weight | n8n-as-code | Native MCP | Winner |
|---|---:|---|---|---|
| **Correctness** | 35 % | **100 / 100** | **100 / 100** | tie |
| — requirement coverage | 40 % of it | 100 (6/6) | 100 (6/6) | tie |
| — node schema validity | 40 % of it | 100 (10/10) | 100 (10/10) | tie |
| — graph integrity | 20 % of it | 100 (0 orphans) | 100 (0 orphans) | tie |
| **Token efficiency** | 35 % | **118 001** → 100 | 153 971 → 63.30 | n8n-as-code |
| **Build time** | 30 % | **346.0 s** → 100 | 449.8 s → 63.76 | n8n-as-code |
| **Composite** | 100 % | **100.00** | 76.28 | n8n-as-code |

**Telemetry, not scored:**

| | n8n-as-code | Native MCP |
|---|---|---|
| Setup ease (friction 70 % / commands 30 %) | 39.3 | **100** |
| — friction events | 2 | **0** |
| — install commands | 14 | **7** |
| Acquisition | 47.8 s (three local tarballs) | 0.05 s (copying four supplied `.ps1` helpers) |

Setup left the score after this run measured what keeping it costs: at 10 % it moved 6.07
points on a final gap of 5.54, so a cost paid once outweighed the gap it was added to.
Installation is paid once and amortises away; build time and tokens are paid on every
workflow. Both acquisition figures are benchmark artefacts — see *Method*.

Both workflows: 10 nodes, 3 LangChain agents with a shared chat model, 0 invalid nodes,
0 orphans, left inactive.

## The run_9 convergence does not reproduce

`run_9` produced two near-identical workflows and could not rule out contamination. Under
the cleaned protocol, with copying made **impossible** rather than merely discouraged:

| | run_9 | run_10 |
|---|---|---|
| Identical node names | 5 / 8 | **1 / 10** |
| Identical canvas positions | 4 / 8 | **1 / 10** |
| Same node-type multiset | yes | **no** |
| Gmail `limit` | 20 / 20 (schema default is 50) | **50 / 50** |
| Real agent nodes | 0 / 0 | **3 / 3** |

What still agrees across the two branches is exactly what an isolated cold sample also
agrees on. Sixteen independent designs of the same brief, no tools and no shared context,
were measured before this run: `triggerAtHour: 7` appeared in **8/8** samples, `limit: 50`
(the schema default) in **8/8**, and "Email Triage Agent" recurred freely. Those three are
precisely the survivors in `run_10`. Every marker that had **no** prior explanation in that
sample — `limit: 20` at 0/8, the name and position overlap — is gone.

**What this does and does not establish.** Copying was structurally impossible here, so
run_10's agreement is prior, full stop. It does not retroactively prove run_9 was clean:
three variables changed at once (worker model muse-spark → Opus 5, improvised prompt →
fixed prompt, shared instance → sequenced instance), so run_9's convergence cannot be
attributed to one cause. What is established is that the current protocol does not produce
anomalous convergence, and that the alarm is no longer live.

## The credential clause was the cause of the missing agents

`run_9`'s orchestrator improvised, at dispatch time, a clause that exists nowhere in the
benchmark repository:

> `NEVER fabricate, create, or assign OAuth credentials (Gmail/Google/OpenAI); leave credential slots empty.`

Both builders read the parenthesis as a ban on the OpenAI-backed Agent node and substituted
plain Code nodes named "… Agent". `requirements.expectedNodeTypes` asks for
`@n8n/n8n-nodes-langchain.agent`, so one improvised sentence deleted the capability under
test from both branches at once.

Rewritten to say what it meant — never fabricate a *secret*, credential-requiring nodes are
expected with empty slots — **both branches produced three real agent nodes with a chat
model pinned via `ai_languageModel`**, on the first attempt, with nothing else changed in
the prompt. That is the causal confirmation.

## Findings against n8n-as-code

Four build frictions, all reproducible:

1. **`node-info --compact` omits per-parameter option values** (merge `mode`/`combineBy`),
   so it is still not sufficient to author a node alone. This is the third run to report
   it — `run_6` and `run_7` said the same. The `resource`/`operation` discriminators were
   fixed; the rest of the options were not.
2. **`push` rewrote the local file and dropped the per-node `notes` fields** set in the
   `@node` decorators. Silent data loss on a round-trip.
3. `skills docs` and `skills search` return nothing for `alwaysOutputData`; the option is
   only discoverable in the shipped type declarations.
4. Redirecting to `/tmp` under Git Bash on Windows resolves to `G:\tmp` and fails ENOENT.

Two install frictions, both costing agent turns:

5. **`workspace status --json` exposes `accessStatus: "unknown"` with no caveat.** The text
   output already points at `env status` as the command that probes; the JSON output — the
   one an agent reads — carries neither the probe nor the pointer.
6. `npm --prefix ./.toolchain` writes shims to the prefix root on Windows, so the expected
   `./.toolchain/bin/` does not exist.

## Findings against Native MCP

1. **The server auto-assigned an existing user credential** (`n8n free OpenAI API credits`,
   type `openAiApi`) to the agent nodes during `create_workflow_from_code`, although the
   builder never requested one and was instructed not to assign credentials. The binding
   came from the server, not the agent.
2. `validate_node_config` reports `Required field subnodes is missing` for all three Agent
   nodes on a workflow whose sub-connections are correctly wired.
3. `get_workflow_best_practices` requires a `technique` argument that is not discoverable
   from the tool name; the first call failed.
4. `search_nodes` takes `queries` (array), not `query`; two failed calls.

## Method

Installers ran in parallel — neither performs any workflow operation. Builders ran
**strictly sequentially**: branch A built alone, was audited, and its workflow was deleted
from the instance before branch B was dispatched. The instance was verified empty of
`bench-*` workflows at that point. Each branch received an unguessable name token
(`bench-f024f288`, `bench-75e42601`) rather than a shared predictable format.

Both builder prompts were written to disk **before** dispatch and verified byte-identical
apart from the sandbox path and the name token. Neither contains design guidance.

Setup is **measured but not scored**. It is reported on friction (70%) and command count
(30%) rather than seconds, because most of the setup wall clock was bandwidth and registry
latency, not a product property. It left the composite because installation is paid once
and amortises away while build time and tokens are paid on every workflow — and because
this run showed the cost of keeping it: at 10% it moved 6.07 points on a 5.54-point gap.

**Acquisition seconds are excluded from the score on both branches.** Each carries a
benchmark artefact and only one of them used to be discounted: n8n-as-code installs from
local tarballs because the build under test is unpublished, and Native MCP has its worker
hand-roll an HTTP client because the benchmark runtime ships no wired MCP client. A real
user of either does neither. In this run the Native MCP helper was supplied pre-written
(promoted to reference after `run_9` paid 420 s building it), which is why its acquisition
reads 0.05 s. That is a protocol decision, not a measurement of the product.

**One run per branch.** The 1.30× build and token gaps are single observations and are not
separated from run-to-run variance.

Worker model: `claude-opus-5` on both branches, same runtime, same moment in the sequence.
Not numerically comparable to `run_3`–`run_9` (different worker runtimes and models).

## Files

- `workflow_n8nac.json`, `workflow_native_mcp.json` — the deployed graphs.
- `quality_n8nac.json`, `quality_native_mcp.json` — full server audits.
- `scores.json` — relative cost scores and composite computation.
- `benchmark/sandboxes/run_10_builder_prompt_*.txt` — the exact dispatched prompts.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
