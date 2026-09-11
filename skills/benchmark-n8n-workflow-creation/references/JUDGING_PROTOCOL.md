# Protocol: Adversarial Judging (the second judge)

Correctness (`validator.mjs`) answers *does it work and does it do what was asked*. It is
deterministic, cheap and blind to provenance, and it stays exactly as it is.

This document specifies the **second** judge: the one that answers *does it hold up*. It is
the axis correctness cannot reach — `run_10` is the proof. The n8n-as-code workflow scored
**100/100 correctness** while wiring `Email Triage Agent -> Fetch Todays Events`, which
serialises the Calendar fetch behind an LLM call that has nothing to do with it. Every
component correctness measures was satisfied. The architecture was still wrong.

---

## 0. The premise this protocol attacks

> *A judge is weaker than a builder, so a judge cannot evaluate what a builder produced.*

The premise holds for a judge that must **decide**. It does not hold for a judge that only
has to **notice**, because noticing is then handed to a mechanism that decides.

That split is the whole design:

| Role | Who | Property |
|---|---|---|
| **Notice** | judge sub-agents, adversarial, stochastic | may be wrong, is cheap to be wrong |
| **Prove** | a predicate over the archived JSON, run by the harness | deterministic, reproducible, cannot be argued with |

A judge that guesses well and proves nothing scores nothing. A judge that notices one real
defect and hands over the three lines that demonstrate it beats a builder that shipped it —
regardless of which is the stronger model.

**Existence proof.** The design session that produced this document ran two adversarial
panels against `run_10`. Every one of the four candidate designs took at least one `fatal`.
Three findings survived, and all three had been missed by correctness:

| Finding | How it became true |
|---|---|
| `executionOrder: v1` is sequential, so fan-out buys no wall clock | three independent attackers, then `node -e` on both archived JSON files |
| Sticky notes sat in the node-validity denominator (8/9 = 88.89 vs 9/10 = 90.00, free points) | reading `validator.mjs`, then arithmetic |
| `meta.builderVariant: "mcp"` identifies the branch on line 2 of the JSON | `grep` on both files |

In all three cases an agent **proposed** and a mechanical check **confirmed**. Proposals
that could not be confirmed died, including several that were plausible and fluent.

---

## 1. Eligibility gate — the orchestrator declares itself unfit

An orchestrator that cannot spawn sub-agents cannot run this protocol. It must say so
rather than approximate it.

**Required behaviour.** Before Phase 4, the orchestrator checks whether its runtime exposes
sub-agent dispatch. If it does not, it writes into `benchmark_results.json`:

```json
"judging": {
  "eligible": false,
  "reason": "orchestrator runtime exposes no sub-agent dispatch",
  "tier": "correctness-only"
}
```

and the run is published as a **correctness-tier** run.

**A single-agent orchestrator must not fake it.** Running the adversarial loop in its own
context is not a degraded version of this protocol, it is a different and worse thing: the
finder and the attacker share a context, so the attacker inherits the finder's framing and
confirms it. That is the failure mode the protocol exists to prevent.

**Consequence, stated up front:** the leaderboard has two tiers. Correctness-tier runs are
comparable to each other and to the correctness axis of full-tier runs. They are not
comparable to a full-tier composite. This must be visible on the results page, not
discovered by a contributor whose pull request is refused.

---

## 2. Isolation — three barriers, not one

The existing rule (*never place the rubric, the requirement list, or any scoring document
inside a sandbox*) is necessary and not sufficient. A judge that carries n8n expertise is
itself a scoring document.

### Barrier 1 — Temporal
The judge runs **only after both builds are frozen and archived**. Never concurrently, never
interleaved, never as a reviewer a builder can consult. A builder's run is over before a
judge's run begins.

### Barrier 2 — Spatial
- Judge skills live in `skills/judging/`, which is **never** copied into a sandbox.
- The judge writes nothing under `benchmark/sandboxes/`. Its outputs go to
  `benchmark/results/history/<runId>/judging/`.
- The judge reads the **archived** workflow JSON, not the live instance, so it cannot
  perturb what the next run measures.

**Mechanical check, not a promise.** `run_9` fell through a channel weaker than a copied
file. Before dispatching builders the orchestrator runs `npm run guard`
(`benchmark/harness/isolation-guard.mjs`) and aborts on a non-zero exit.

The guard audits every directory under `benchmark/sandboxes/` on three channels, because
each one defeats the previous:

| Channel | Catches |
|---|---|
| **path** | a scoring or judging file copied in under its own name |
| **content** | the same file renamed — scanned for scoring vocabulary |
| **symlink** | a link that reaches back into the repository the sandbox is nested inside |

The forbidden patterns and markers are defined once, in that module, and are deliberately
not restated here: this repository already carried four incompatible definitions of
"quality" and scored runs 6-9 by whichever one the caller happened to reach.

`node benchmark/harness/isolation-guard.mjs --self-check` plants one violation of each
channel and asserts the guard sees it, then asserts a plausible sandbox is clean. A guard
that never fires and a guard that always fires are equally useless.

**Known ceiling:** `node_modules` and `.git` are pruned. A scoring document planted inside
a dependency tree is not the accident this guards against, and walking them costs minutes.

### Barrier 3 — Semantic (the one that gets forgotten)
If the judge holds n8n skills **and** the builders hold n8n skills, the benchmark risks
measuring the gap between two skill sets rather than between two products.

Rule: the judge's skills must be **strictly orthogonal** to anything a builder could hold.
Concretely, the judge is given knowledge of *how to interrogate a finished workflow* and is
given **no** knowledge of *how to build one*. It never sees a reference workflow, a node
cookbook, a preferred architecture, or an example of a good answer. A judge that knows what
a good workflow looks like will score the builder that resembles it.

---

## 3. The judge's capability kit

Implemented in `skills/judging/`, outside every sandbox, and recorded by content hash in
the run manifest so a result can be replayed against the exact kit that produced it.

| File | Role |
|---|---|
| `skills/judging/SKILL.md` | the loop, and the fixed finder and attacker prompts |
| `skills/judging/references/N8N_EXECUTION_SEMANTICS.md` | how the engine runs a graph. Facts only |
| `skills/judging/references/CONFIRMATION_CATALOGUE.md` | the seven families and their predicates |
| `benchmark/harness/predicates.mjs` | the primitives a predicate is written against |

1. **n8n engine semantics** — connection kinds (`main`, `ai_languageModel`, `ai_tool`,
   `ai_memory`, `ai_outputParser`), what `settings.executionOrder` means in `v0` and `v1`,
   how expressions resolve, when a node runs. Facts about the engine, never opinions about
   design.
2. **The confirmation catalogue** (section 5) — the predicates the judge is allowed to
   claim, and how each is evaluated.
3. **The archived artefacts** — both workflow JSON files, passed through
   `blindWorkflow()` from `benchmark/harness/scoring.mjs`, plus the requirement brief
   verbatim as the builders received it.
4. **A read-only n8n instance handle** for schema questions (`validate_node_config`). No
   write scope, no execution scope, no listing scope.

It is **not** given: the composite weights, the correctness scores, the token or time
telemetry, the branch names, or which branch is which.

---

## 4. The loop: find -> attack -> confirm

Three roles, three separate contexts. A role never fills two of them for the same finding.

```
   [FINDERS]  n independent sub-agents, same inputs, no shared context
       |      each returns candidate findings with a JSON-pointer citation
       v
   [ATTACKERS]  one per finding, in a fresh context
       |        brief: REFUTE this finding. Refutation is the success condition.
       |        survivors carry a proposed predicate
       v
   [HARNESS]  evaluates each predicate against the archived JSON
       |       deterministic, no LLM, re-runnable by anyone with the artefact
       v
   confirmed findings -> score        refuted / unprovable -> report only
```

**Finders** see only the blinded workflows and the brief. They are asked what will break,
what runs in the wrong order, what is wired to nothing, what the brief asked for and the
graph does not do. Every candidate must cite a JSON pointer that resolves; a finding
without a citation is discarded before it reaches an attacker.

**Attackers** are rewarded for refutation, not for agreement. Each gets one finding and the
same artefacts, and is told the finding is probably wrong. This is what killed the fluent
non-findings in the design panels: a claim that survives an agent trying to break it is a
different object from a claim an agent produced.

**The harness** decides. It runs the predicate. Nothing an agent asserts enters a score.

---

## 5. The confirmation catalogue — what "confirmable" means

> A finding is confirmable **if and only if** it can be written as a predicate over the
> archived workflow JSON, plus the documented semantics of the pinned n8n version, and the
> judge supplies the code that evaluates it.

The judge supplies the predicate. The harness runs it, archives it next to the finding, and
anyone can re-run it against the artefact alone. Seven admissible families, four of them
backed by a shared primitive in `benchmark/harness/predicates.mjs`, two by the server RPC
already wired into `validator.mjs`, and one written per finding:

| # | Family | Confirms | Example from `run_10` |
|---|---|---|---|
| 1 | **Reachability / dominance** in the `connections` graph | ordering and dependency claims | Calendar fetch is a strict descendant of the triage agent, so it cannot start until an unrelated LLM call finishes |
| 2 | **Engine semantics** on a declared field | claims about how the graph will execute | `settings.executionOrder = "v1"` is sequential, so a fan-out has no wall-clock effect |
| 3 | **Server schema** via `validate_node_config` | parameter, subnode and version claims | already implemented in `validator.mjs` |
| 4 | **Expression resolution** | broken references | every node reference inside a parameter must name an existing node **and** an ancestor of the node holding the expression |
| 5 | **Weak connectivity** | islands with zero orphans | a component that contains no trigger can never run, even though every node in it has an edge |
| 6 | **Declared-versus-asked** counting | quiet under-delivery | a retrieval limit, a schedule interval, or a filter that contradicts the brief, read from parameters |
| 7 | **Credential-slot presence** | guaranteed runtime failure | a node whose type requires credentials with no slot declared |

Anything outside these seven is **not confirmable** and cannot touch a score. Adding a
family is a change to this document and to the harness, reviewed like any other change.

---

## 6. The partition rule

Every surviving finding lands in exactly one of two places, and the boundary is mechanical:

- **Confirmed** — the predicate returned true. Enters the **Latent Defects** axis.
- **Reasoned** — survived attack, cites real evidence, but no predicate exists. Published
  verbatim in the run report, with the attacker's counter-argument beside it. **Never
  scored.**

This is what keeps the benchmark reproducible while letting the judge be stochastic. Two
passes of the judge will surface different candidates. Only the confirmable subset moves a
number, and that subset is a function of the archived artefact, not of the pass.

### The Latent Defects axis

- **Penalty-only.** It never awards points. A workflow with no confirmed defect is at 100.
- **Weight 0 at introduction.** It is measured, published and receipted while it accumulates
  a track record. It moves no ranking.
- **Promotion to weight 10 requires three consecutive runs** in which every confirmed
  finding is reproducible from the artefact by someone who did not run the judge.
- **Deduplicated by predicate**, not by prose: two findings that evaluate the same predicate
  on the same nodes are one defect.

Applied to `run_10` by the primitives in `benchmark/harness/predicates.mjs`:

| Branch | Confirmed |
|---|---|
| n8n-as-code | **1** — family 1: `Fetch Todays Events` waits on `Email Triage Agent` |
| native MCP | **0** — both fetches are true siblings of the trigger; no broken reference, no unreachable node, no invalid node |

Both branches scored 100/100 correctness. The axis separates them; correctness could not.
An earlier draft of this document claimed two findings for native MCP, carried over from a
design panel. It does not survive the predicates, so it is withdrawn — a document whose
thesis is that nothing counts unless it is mechanically confirmable cannot carry an
unconfirmed number.

---

## 7. Budget, and publishing it

The design panels that produced this document cost **~1.8 M tokens** for a single design
question. The two `run_10` builders cost **272 k** combined. An unbudgeted panel therefore
costs several times what it measures.

Rules:
- The judge is capped at **3x the combined builder token spend** for the run. The
  orchestrator enforces the cap and truncates the finder pool to stay under it.
- A focused panel is 3 to 5 finders and one attacker per surviving finding. Not more.
- `benchmark_results.json` records `judging.tokens` and `judging.durationMs`, and the
  results page prints the judging cost beside the build cost. A benchmark that hides the
  cost of its own measurement is not a benchmark.

---

## 8. The visual channel — penalty-only, by evidence

Rendering the workflow in n8n and judging the canvas is admissible **only as a penalty**,
and only for findings that map to families 1 or 5 above.

The reason is `run_10`. Its n8n-as-code canvas is a flawless straight line **precisely
because** the Calendar fetch was chained downstream of the Email Triage Agent. A
reward-flavoured visual axis would have ranked that run backwards: the defect is what made
the picture clean.

A screenshot may therefore be used to *notice* a crossing, an island, or a chain that should
be a fan-out. The finding still has to pass section 5 to count. Visual tidiness is never
itself a score.

---

## 9. What this protocol does not do

It detects what **does not hold**. It does not certify what is **good**.

The reward side — *is this workflow ambitious, intelligent, complete* — produces a reasoned
report and carries **weight 0 with no promotion path defined**. Every family in section 5 is
a predicate that can return true about a defect. There is no predicate for ambition.

That is still true, and it is why the question moved to a different instrument instead of
being forced into this one. `../../judging/references/QUALITY_RUBRIC.md` grades quality
absolutely against the prompt at weight 35, with no predicates and no pretence of being
deterministic: an explicit rubric, one workflow per judge, a resolving citation per
dimension, the median of three isolated judges, and a blind pairwise check that has to
reproduce the ranking or the run says it did not.

That is not a permanent verdict. It becomes scorable the day someone demonstrates a
predicate for it, on the same terms as every other family: written down, run by the harness,
re-runnable by a third party holding only the artefact.

---

## 10. Output contract

Written to `benchmark/results/history/<runId>/judging/`:

```
findings.json      every candidate, its citation, its attacker verdict, its predicate result
predicates/        one runnable .mjs per confirmed finding, re-runnable against the artefact
report.md          confirmed findings, then reasoned findings with counter-arguments
manifest.json      kit content hashes, model IDs, token and duration cost, eligibility record
```

`benchmark_results.json` gains:

```json
"judging": {
  "eligible": true,
  "tier": "full",
  "latentDefects": { "a": 1, "b": 2, "weight": 0 },
  "tokens": 0,
  "durationMs": 0
}
```

Weight 0 is written into the artefact, not assumed. A reader of a stored result must be able
to see that the axis did not move the ranking.
