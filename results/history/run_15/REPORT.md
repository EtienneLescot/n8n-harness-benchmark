# run_15 — n8nac@2.7.0-rc.1 against n8n Native MCP

Five builds per branch, both branches measured in the same session. Ten builds, thirty
isolated quality judges, one deterministic correctness pass per artefact.

**n8n-as-code 94.5, n8n Native MCP 87.3.**

| | quality /100 | correctness | tokens | build time | delivered |
|---|---|---|---|---|---|
| n8n-as-code | 85.0 | 99.3 | 122 850 | 503 s | 5/5 |
| n8n Native MCP | 91.2 | 100 | 147 690 | 619 s | 5/5 |

## It wins the composite while losing quality

17% cheaper in tokens and 19% faster, which takes 100 on both relative axes against 73.8
and 70.7. Six points of quality do not cover that under the published weights.

Both figures are medians over five builds. The two arms ran interleaved in the same
session, so a slow machine minute hit both.

## The quality gap has one cause

Three of the five n8n-as-code builds chain the calendar agent behind the email agent,
although the two reads share no data. Thirty judges graded in isolation, one workflow each,
and every judge who saw one of those builds found it without being told to look:

| | connections /25 |
|---|---|
| n8n-as-code, chained builds | 13 to 17 |
| n8n-as-code, fan-out builds | 23, 24 |
| n8n Native MCP, all five | 23, 24 |

On idea, node structure and answer-to-the-prompt the two branches are level. The whole
six-point gap is this one dimension.

It is not inherent to the tool. The two n8n-as-code builds that fanned out scored 91 and 89,
level with Native MCP's 90 to 93. What varies is the build, not the toolchain.

The failure mode the judges describe is consistent: the serialisation is load-bearing,
because the composing agent then reaches back through a `$('Email Triage Agent')` reference
that only resolves because the chain made it an ancestor. A Merge would have made the rejoin
explicit. As wired, an inbox failure takes the calendar branch with it.

## What the panel is worth

- One workflow per judge, blinded through `blindWorkflow()`, packets copied out of the
  repository so a judge had nothing else to read.
- Every dimension score cites a JSON pointer into its own packet.
- Widest spread across the three judges of one workflow: **4 points**, against the 15-point
  threshold that would require publishing disagreement.
- Mean-of-medians and pooled median agree: 85 and 85, 91.2 and 91. No aggregation artefact.

## Correctness is saturated

100 on nine artefacts, 96.36 on one (a single invalid node). Six requirement checks satisfied
on all ten. The axis no longer separates the two tools and has not for three runs.

## Delivery

All ten builds delivered. The previous published run had three of ten produce a briefing that
nothing sent anywhere.

## What this run also established

**The local-install command form shipped and works.** `update-ai` wrote
`node node_modules/n8nac/dist/index.js` into the generated context, reaching a builder through
the full chain for the first time: release, npm publish, and an installer reading only the
documentation. Measured earlier at 150 ms per call against 1280 ms warm and 2600 ms cold for
the npx form.

**That change broke a gate in this harness.** The usage gate searched for the literal
`n8nac <subcommand>`, which the new form no longer produces, so five builders drove the CLI
about thirty times and the gate read zero. The ten builder logs were inspected before the
gate was touched; it now accepts both documented forms, and two self-check cases pin them so
a future narrowing fails the test rather than a run.

**Prerelease publication is not atomic.** The npm dist tag moved to 2.7.0-rc.1 several
minutes before its dependency was resolvable, so `npx n8nac@next` pointed at a version that
could not install for about ten minutes.

**The platform assigned a credential on one branch only.** On all five Native MCP builds the
n8n server attached the account's existing model credential by itself, although the submitted
code declared empty slots. The builders invented nothing and logged it. The benchmark forbids
builders from assigning credentials; this is the platform doing it, and it is asymmetric.

**An npm resolution hazard, recorded and repaired.** The n8n-as-code installer ran
`npm install` in a directory holding only `.env`. With no local `package.json`, npm walked up
and installed into this repository, exiting 0. It was reverted before any build ran and is
not counted against the branch: it is an npm behaviour in an empty directory, not a property
of either toolchain. It is a real first-run defect for the product, since that is the
directory shape a new user starts from.
