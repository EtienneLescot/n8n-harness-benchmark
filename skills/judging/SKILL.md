---
name: judging
description: Adversarial second judge for the n8n benchmark. Runs after both builds are frozen, finds latent defects a deterministic correctness audit cannot see, and admits a finding only when a predicate over the archived workflow JSON confirms it. Never used by, shown to, or copied near a builder.
---

# Skill: Adversarial Judging

> **This skill must never enter a builder sandbox.** `npm run guard` fails the run if it
> does. See `../benchmark-n8n-workflow-creation/references/JUDGING_PROTOCOL.md`, Barrier 2.

Correctness (`validator.mjs`) answers *does it work*. It scored `run_10`'s n8n-as-code
workflow **100/100** while that workflow chained a Google Calendar fetch downstream of an
email triage agent. Every node was valid, every node was connected, every requirement was
covered, and the architecture was still wrong.

This skill is the judge that catches that. It rests on one rule:

> **Sub-agents notice. A predicate proves. Nothing an agent asserts becomes a score.**

That is what defeats *the judge is weaker than the builder*. The judge never has to be right
— it has to be right **and able to hand over the code that shows it**.

---

## Preconditions — refuse the run rather than approximate it

1. **Sub-agent dispatch.** No dispatch capability, no judging. Write
   `judging.eligible = false` with `tier: "correctness-only"` into `benchmark_results.json`
   and stop. Do **not** run the loop in a single context: the finder and the attacker would
   share a context, so the attacker inherits the finder's framing and confirms it, which is
   the exact failure this design exists to prevent.
2. **Both builds frozen and archived.** The judge reads
   `results/history/<runId>/workflow_*.json`, never the live instance.
3. **Spatial isolation intact.** `npm run guard` exits zero.
4. **The prompts below are fixed.** Copy them verbatim into
   `results/history/<runId>/judging/prompts/` before dispatch. Composing a judge prompt per
   run is how `run_9` deleted the capability under test from both branches at once.

---

## Step 1 — Blind the artefacts

```bash
node -e "import('./benchmark/harness/scoring.mjs').then(async m => {
  const fs = await import('node:fs');
  for (const b of ['n8nac','native_mcp']) {
    const w = JSON.parse(fs.readFileSync('results/history/RUN/workflow_'+b+'.json','utf8'));
    fs.writeFileSync('results/history/RUN/judging/blinded_'+b+'.json', JSON.stringify(m.blindWorkflow(w), null, 2));
  }
})"
```

`blindWorkflow()` strips the provenance the n8n server stamps itself: `run_10`'s native MCP
workflow carries `meta: { aiBuilderAssisted: true, builderVariant: "mcp" }` on line 2 while
the n8n-as-code one carries `meta: null`. That asymmetry alone unblinds a judge before it
reads a single node.

Present the two blinded files to finders as **Workflow 1** and **Workflow 2**, in an order
randomised per finder. Node names survive blinding because expressions resolve through them
— the finder prompt forbids reading them for provenance.

## Step 2 — Structural facts, before any agent looks

```bash
node benchmark/harness/predicates.mjs results/history/RUN/judging/blinded_n8nac.json
```

Give each finder this output alongside the workflow. It is deterministic ground truth about
the graph, and handing it over stops a finder inventing an edge to support a claim.

## Step 3 — Dispatch finders (3 to 5, independent contexts)

Same inputs, no shared context, no visibility of each other. Fixed prompt:

```text
You are auditing one deployed n8n workflow for latent defects: things that are wrong and
that a schema-and-connectivity audit already passed.

You are given the workflow JSON, the structural facts computed from it, the user request it
was built from, the n8n execution semantics reference, and the confirmation catalogue.

Report every defect you can support. For each one give:
  - what breaks, or what runs in an order that costs something
  - a JSON pointer into the workflow that resolves (e.g. /connections/Some Node/main/0/0)
  - which catalogue family it belongs to
  - the predicate that would prove it, in words

Rules:
  - A claim without a resolving JSON pointer is discarded before anyone reads it.
  - Judge the graph, never the naming. Node names are not evidence of anything.
  - Do not infer which tool built this workflow, and do not mention any guess about it.
  - Do not propose improvements. You are not designing, you are finding what is wrong.
  - Report nothing rather than pad. An empty finding list is a valid result.
```

## Step 4 — Dispatch one attacker per candidate, fresh context

The attacker succeeds by **refuting**. This is what killed the fluent non-findings in the
panels that produced this protocol.

```text
Someone claims the following defect in this n8n workflow. The claim is probably wrong.

  <finding, its pointer, its family>

You have the workflow JSON, the structural facts, the user request, and the n8n execution
semantics reference.

Refute it. Look for: a connection that makes the ordering necessary rather than accidental,
an engine behaviour that makes the concern moot, a reading of the request that the claim
ignores, a pointer that does not resolve to what the claim says it does.

Answer REFUTED with the reason, or SURVIVES with the single predicate over the workflow JSON
that would settle it. Do not soften a refutation into agreement.
```

## Step 5 — Confirm mechanically

For each survivor, express the predicate against `benchmark/harness/predicates.mjs` and run
it. The harness decides, not the attacker.

```bash
node benchmark/harness/predicates.mjs --self-check   # the primitives are sound
node results/history/RUN/judging/predicates/<finding-id>.mjs
```

A predicate is a few lines. `run_10`'s confirmed finding is:

```js
import { graphOf, runsAfter } from '../../../../benchmark/harness/predicates.mjs';
const g = graphOf(JSON.parse(fs.readFileSync(artefact, 'utf8')));
// The calendar fetch cannot start until an email triage LLM call it shares no data with returns.
export default runsAfter(g, 'Fetch Todays Events', 'Email Triage Agent');
```

**Partition, and it is not negotiable:**

| Predicate | Where it goes |
|---|---|
| returned true | the Latent Defects axis |
| exists but returned false | discarded |
| cannot be written | `report.md` as a reasoned finding, beside the attacker's counter-argument, **never scored** |

This is what lets the judge be stochastic without the benchmark losing reproducibility. Two
passes surface different candidates; only the confirmable subset moves a number, and that
subset is a function of the archived artefact, not of the pass.

---

## Budget

The design panels behind this protocol cost ~1.8 M tokens against 272 k for both `run_10`
builders combined. Cap the judge at **3x the combined builder token spend** and truncate the
finder pool to stay under it. Record `judging.tokens` and `judging.durationMs`; the results
page prints them beside the build cost. A benchmark that hides the cost of its own
measurement is not a benchmark.

## Output

```
results/history/<runId>/judging/
  blinded_*.json   what the finders actually saw
  prompts/         the dispatched prompts, verbatim
  findings.json    every candidate: citation, attacker verdict, predicate result
  predicates/      one runnable .mjs per confirmed finding
  report.md        confirmed findings, then reasoned findings with counter-arguments
  manifest.json    kit hashes, model IDs, tokens, duration, eligibility
```

## What this skill does not do

It detects what does not hold. It does not certify what is good. There is no predicate for
ambition, and a judge asked to score it scores resemblance to its own idea of a good
workflow — the model preference this benchmark spent its history removing from the rubric.
Ambition is reported at weight 0 with no promotion path until someone demonstrates a
predicate for it.

## References

- `references/N8N_EXECUTION_SEMANTICS.md` — how the engine runs a graph. Facts only.
- `references/CONFIRMATION_CATALOGUE.md` — the seven admissible families and their predicates.
- `../benchmark-n8n-workflow-creation/references/JUDGING_PROTOCOL.md` — why all of this.

<!-- JUDGE-KIT: this file must never appear inside a builder sandbox. The marker is what lets `npm run guard` catch it after a rename. -->
