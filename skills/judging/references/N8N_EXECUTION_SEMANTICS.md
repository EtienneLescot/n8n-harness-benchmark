# Reference: n8n Execution Semantics

Facts about how the engine runs a graph. **No design guidance, no reference workflow, no
example of a good answer** — Barrier 3 of the judging protocol requires the judge's
knowledge to be strictly orthogonal to a builder's. A judge that knows what a good workflow
looks like scores the builder that resembles it.

---

## 1. How connections are shaped

```
connections[sourceNodeName][connectionType][outputIndex] = [ { node, type, index }, ... ]
```

- The key is the **source**. `index` on the target is the **input** index it lands on.
- Reading a connection backwards is the most common way to get an ordering claim wrong.
  `benchmark/harness/predicates.mjs` indexes both directions; use it rather than re-deriving.

### Connection types

| Type | Meaning |
|---|---|
| `main` | the data path, and therefore the execution order |
| `ai_languageModel`, `ai_tool`, `ai_memory`, `ai_outputParser`, `ai_embedding`, `ai_vectorStore`, `ai_document`, `ai_textSplitter`, `ai_retriever` | a helper attached to a parent node |

A sub-node does not run "before" its parent in any sense an ordering claim can rest on. It
runs **as part of** the parent. A language model with no `main` edge anywhere is normal and
is not a disconnected node.

## 2. One node at a time

The engine processes nodes **sequentially**. `settings.executionOrder` selects the traversal
order among branches; it does not introduce concurrency.

**Consequence a judge must apply and not overreach on:** a fan-out changes *which node waits
on which*, never *how many run at once*. A claim that one workflow is faster because it
fans out is not confirmable and belongs in the reasoned section, not the score. A claim that
node X cannot start until node Y returns **is** confirmable, from the graph alone.

`executionOrder` is read, never assumed. A workflow that declares none is reported as
`absent` — guessing which default the instance applied is exactly the assumption a predicate
may not make.

## 3. When a node runs

- A **trigger** starts an execution. It has no `main` input.
- A node with `main` inputs runs once its inputs have data.
- A node reachable from no trigger never runs, **even when every one of its nodes has an
  edge**. This is why the orphan count in `validator.mjs` (zero in-and-out degree) is not a
  connectivity check: an island of five wired nodes has zero orphans and runs never.
- Sticky notes are canvas annotations. They have no edges, no execution, and no place in any
  denominator.

## 4. Expressions and scope

A node is referenced from another node's parameters by name:

```
$('Node Name')        $node["Node Name"]        $items('Node Name')
```

Two things must hold or the reference resolves to nothing at run time:

1. The named node **exists**.
2. The named node is **upstream** of the node holding the expression.

A node with no `main` edges is a sub-node; its visible scope is the union of the scopes of
the nodes it serves.

> Scan the **raw string values** in the parameter tree, never `JSON.stringify` of it. The
> serialisation escapes the quotes that `$node["Name"]` is built from, so a scan over
> stringified parameters sees no `$node` reference at all. `brokenReferences()` in
> `predicates.mjs` was written wrong this way once and its self-check caught it.

## 5. What the server can tell you

`validate_node_config` audits parameters, required fields, subnodes, versions and required
credentials against the live instance schema. It is the ground truth for anything about a
node's own configuration, and it is already wired into `validator.mjs`.

Use it. Do not reason about whether a parameter is valid — ask.

<!-- JUDGE-KIT: this file must never appear inside a builder sandbox. The marker is what lets `npm run guard` catch it after a rename. -->
