# run_17 — (executed locally as run_17; renumbered at publication because a parallel Antigravity evaluation landed run_17 on main first) n8n-as-code vs n8n Native MCP

**Winner: n8n Native MCP, 97.9 vs 88.4** (full composite: quality 35 % · correctness 30 % · tokens 20 % · build time 15 %).

Harness: ZCode orchestrator, GLM-5.3-Flash on every worker, temperature not exposed by the runtime.
Date: 2026-09-11 (UTC). Instance: etiennel.app.n8n.cloud. One build per branch, dispatched in
parallel under an external stopwatch. Full tier: quality panel + adversarial defect panel both ran.

## The four axes

| Axis | n8n-as-code | Native MCP | Measured by |
|---|---:|---:|---|
| Quality | **86** (judges 86/88/83) | **94** (judges 94/94/92) | 3 isolated blinded judges per workflow, median, citations mechanically verified |
| Correctness | 100 | 100 | server `validate_node_config` + graph walk, zero LLM |
| Token efficiency | 75.81 | **100** | 2,284,234 vs 1,928,255 tokens, relative exp. decay |
| Build time | 87.80 | **100** | 883.3 s vs 812.8 s, external stopwatch |
| *Setup (telemetry)* | *498 s · 28 cmd · 3 dead ends* | *404 s · 16 cmd · 5 dead ends* | reported, never scored |

## Why Native MCP won: the delivery gap

The quality gap is entirely one dimension — *answer to the prompt*, 23 vs 18, with idea, structure
and connections level. All three n8n-as-code judges independently cited the same weakness: the
workflow terminates at `Convert Dashboard To File`, leaving `daily-briefing.html` as binary in
execution data — nothing emails, uploads or serves it, so on the daily schedule no human ever sees
the briefing. The Native MCP build renders the dashboard deterministically and emails it (to a
flagged placeholder recipient).

Correctness saturated at 100 on both sides (all six capabilities, 16/16 and 18/18 valid nodes,
zero orphans, three real LangChain agents each). The axis separated nothing.

The blind pairwise check split 1–1, both votes high-confidence, one with an inverted rationale
(it attributed email delivery to the workflow that terminates at Convert-to-File). Published
verbatim; per the rubric it never enters the grades.

## Adversarial defect panel — both confirmed defects sit on the winner

Latent Defects axis, penalty-only at **weight 0** this run: nativeMcp **2**, n8nac **0**.

| # | Target | Claim | Verdict |
|---|---|---|---|
| C | Native MCP | Gmail `simple:false` (raw/mailparser shape) while the digest consumes the simplified contract — every sender reaches the analyst as `[object Object]`, snippet and labels destroyed | **CONFIRMED** (predicate true; mechanism verified against `GmailV2.node.ts` at 1.30.0/1.64.0/master) |
| E | Native MCP | `executionOrder v1` starts the calendar fetch only after the email agent's LLM call returns, though the branches share no data | **CONFIRMED** (predicate true; engine source: v1 = depth-first, topmost branch first) |
| A | Native MCP | Empty-source day starves the merge | refuted — Merge v3.2 `requiredInputs: 1` in append mode; fires on one input, fallbacks engage |
| B | n8nac | Same empty-source stall | discarded by harness predicate — same engine fact: `Merge Analyses` is 3.2 `combine`, fires on one input (its attacker never inspected the node) |
| D | n8nac | Same v1 ordering | refuted — real but temporally neutral: the engine is strictly sequential under any `executionOrder` |

D and E are symmetric claims; one died by attacker refutation and one survived on confirmability.
That is attacker variance, published rather than smoothed (both verbatims are archived).

## The run itself

- **21:09** credentials gate green (REST + MCP, 39 tools). **21:11** installers dispatched in parallel.
- **Mid-run incident:** the instance-level MCP token was revoked server-side between the verify pass
  and the installer probes — three independent clients got 401. A fresh key was issued from the n8n
  UI and propagated; verify green again. The run's only human intervention.
- **21:27** gates re-run (`npm run verify`, `npm run ready -- run_17` — both green), builders
  dispatched in parallel with the verbatim archived prompt. **21:41/21:43** both delivered.
  `npm run used -- run_17` green: each log shows its own toolchain (`tools/call` vs `n8nac push --verify`).
- Judge budget: 3,688,175 tokens against a 12.6 M cap (3× builder spend). Detail: `judging/manifest.json`.

## Limits

One run, one build per branch: run_15 measured five builds per branch and its cost direction is the
opposite of this one. Gaps smaller than the run-to-run spread are not resolved. Runs from different
harnesses and models are not numerically comparable; only the two branches within a run are.

## Artifacts

`workflow_n8nac.json` · `workflow_native_mcp.json` (deployed, faithful) · `validator_*.json` ·
`benchmark_results.json` · `judging/` (blinded artefacts, prompts, findings.json, predicates,
report of the panel, manifest) · sandboxes preserved under `benchmark/sandboxes/run_17_*`.
Preview: `run_17_preview.html` at the repo root (same visual language as the published page).
