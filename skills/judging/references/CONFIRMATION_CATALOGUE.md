# Reference: The Confirmation Catalogue

> A finding is confirmable **if and only if** it can be written as a predicate over the
> archived workflow JSON, plus the documented semantics of the pinned n8n version, and the
> judge supplies the code that evaluates it.

Seven families. Anything outside them cannot touch a score, however well argued. Adding a
family is a change to this file **and** to the harness, reviewed like any other change.

---

## 1. Reachability and dominance — `runsAfter(graph, later, earlier)`

Ordering and dependency claims. True when `later` is a strict `main`-path descendant of
`earlier`, so the engine cannot start it until `earlier` returns.

```js
import { graphOf, runsAfter } from '../../../benchmark/harness/predicates.mjs';
runsAfter(graphOf(workflow), 'Fetch Todays Events', 'Email Triage Agent');  // true
```

`run_10`'s confirmed defect. The calendar fetch waits on an LLM call it shares no data with.
Correctness scored that workflow 100/100.

**Where this family goes wrong:** the predicate proves the ordering, not that the ordering is
unjustified. State the ordering as the finding and let the attacker argue necessity. A
finding phrased as *"this should have been parallel"* is not confirmable — the engine runs
one node at a time either way.

## 2. Engine semantics on a declared field — `executionOrder(workflow)`

Claims about how the graph will execute, resting on a field the workflow declares.

```js
executionOrder(workflow);  // 'v1' | 'v0' | 'absent'
```

`absent` is a real answer, not a missing one. A predicate may not substitute the default it
believes the instance applied.

## 3. Server schema — `validate_node_config`

Parameters, required fields, subnodes, versions. Already implemented in
`benchmark/harness/validator.mjs`; a finding in this family cites its output rather than
re-deriving it.

## 4. Expression resolution — `brokenReferences(graph)`

Two reasons, and **only one of them is scoreable**. Read the `confirmable` flag.

```js
brokenReferences(graphOf(workflow));
// [{ node: 'Compose', reference: 'Ghost',   reason: 'unknown_node', confirmable: true  }]
// [{ node: 'Compose', reference: 'Fetch B', reason: 'not_upstream', confirmable: false }]
```

`unknown_node` — the expression names a node that is not in the workflow. No engine version
can resolve that, so it is confirmable from the artefact alone.

`not_upstream` — the node exists but is not a main-path ancestor. **Not confirmable.** In
`run_11` an attacker argued that n8n resolves `$('Node')` against any node already executed
in the run, not only along a connection chain. The engine history says both sides are right
at different versions: 1.105.4 made a not-directly-connected reference fail
(`n8n-io/n8n#18197`), and that issue was closed by PR #18382. The behaviour therefore depends
on the instance version, the benchmark's n8n Cloud instance does not publish its version, and
a predicate may not substitute a behaviour it believes the instance has.

It is still reported. A workflow whose data path depends on which patch release it lands on
is worth saying out loud. It just goes in the reasoned section, never the score.

## 5. Weak connectivity — `unreachableFromTrigger(graph)`

Nodes no trigger can reach, even though each has edges and so passes the orphan check.
Sub-nodes count as reached through the parent they serve.

```js
unreachableFromTrigger(graphOf(workflow));  // ['Island', 'Island Sink']
```

## 6. Declared versus asked

Quiet under-delivery read from parameters against the brief: a retrieval limit, a schedule
interval, a filter that contradicts what was requested.

There is no shared primitive — the predicate is written per finding and must read a specific
parameter path. It still has to be code, and it still has to be archived and re-runnable.

**Where this family goes wrong:** a brief that does not state a number cannot be contradicted
by one. *"The limit should have been higher"* is a preference. *"The brief said daily and
`rule.interval[0].field` is `weeks`"* is a predicate.

The same rule kills a whole class of plausible findings, and `run_12` produced two of them.
Both alpha finders reported that its HTML dashboard is built in a terminal node with no
outgoing edge and so reaches nobody. Refuted: the brief says *presents* and names no delivery
mechanism, so the claim imports a requirement that was never stated. And a finder reported
`active: false` as a failure to run daily. Refuted: the harness told every builder to leave
the workflow inactive, and the brief never mentions activation at all.

Before writing a family 6 finding, quote the words in the brief that the parameter
contradicts. If you cannot quote them, you do not have one.

## 7. Credential-slot presence

A node whose type requires credentials with no slot declared will fail at run time. The
server reports this through family 3 — ask `validate_node_config`, do not maintain a list of
which node types need credentials.

Note the boundary: an unassigned credential is expected and correct. The benchmark cannot
provision third-party OAuth, so builders leave credentials unassigned by design.

> **An absent `credentials` key is not a defect.** n8n writes that object onto a node only
> once a credential is actually assigned, so absence *is* how n8n spells "unfilled". In
> `run_11` two independent finders both reported the six credential-requiring nodes of one
> workflow as a Family 7 defect on exactly this reasoning, and an attacker refuted it on
> three planks: `validate_node_config` reported zero invalid nodes, the independently built
> comparator workflow omitted the key identically, and the validator never sends a
> `credentials` field to the server in the first place. An earlier version of this section
> invited that error by contrasting a "missing" slot with an "unfilled" one. There is no
> such contrast.

What remains in this family is only what the server reports: ask `validate_node_config`, and
cite its output. Do not maintain a list of which node types need credentials, and do not
infer a defect from the shape of the node JSON.

> **You cannot see credentials anyway.** `blindWorkflow()` strips every node's `credentials`
> block, because a credential id is provenance. So the blinded artefact carries no evidence
> for this family in either direction, and the absence of the key there says nothing at all.
> The verdict comes from the run's `quality_<branch>.json`, which the orchestrator hands you.
> In `run_12` all four finders noted they had no way to evaluate this family; that file
> existed and had simply not been passed along.

---

## Implementation status

| Family | Primitive | Where |
|---|---|---|
| 1 | `runsAfter` | `predicates.mjs` |
| 2 | `executionOrder` | `predicates.mjs` |
| 3 | `validate_node_config` | `validator.mjs` |
| 4 | `brokenReferences` | `predicates.mjs` |
| 5 | `unreachableFromTrigger` | `predicates.mjs` |
| 6 | none — written per finding | the finding's own `.mjs` |
| 7 | `validate_node_config` | `validator.mjs` |

`node benchmark/harness/predicates.mjs --self-check` asserts every primitive against a
fixture carrying exactly one instance of each defect, plus a clean control. Run it before
trusting a predicate result: a primitive that always fires and one that never fires are
equally useless.

## Applied to run_10

| Branch | Confirmed |
|---|---|
| n8n-as-code | **1** — family 1: `Fetch Todays Events` waits on `Email Triage Agent` |
| native MCP | **0** — both fetches are true siblings of the trigger; no broken reference, no unreachable node, no invalid node |

Both branches scored 100/100 correctness. The axis separates them; correctness could not.

<!-- JUDGE-KIT: this file must never appear inside a builder sandbox. The marker is what lets `npm run guard` catch it after a rename. -->
