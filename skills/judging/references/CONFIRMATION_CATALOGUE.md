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

A reference that names a node which does not exist (`unknown_node`) or one that has not run
yet (`not_upstream`). Both resolve to nothing at execution time.

```js
brokenReferences(graphOf(workflow));
// [{ node: 'Compose', reference: 'Fetch B', reason: 'not_upstream' }]
```

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

## 7. Credential-slot presence

A node whose type requires credentials with no slot declared will fail at run time. The
server reports this through family 3 — ask `validate_node_config`, do not maintain a list of
which node types need credentials.

Note the boundary: an **empty** credential slot is expected and correct. The benchmark cannot
provision third-party OAuth, so builders leave slots empty by design. The defect is a
**missing** slot, not an unfilled one. Confusing the two is how `run_9` lost its agents.

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
