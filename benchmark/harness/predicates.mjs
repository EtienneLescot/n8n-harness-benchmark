/**
 * Structural predicates over a deployed n8n workflow — the "prove" half of
 * `skills/judging/SKILL.md`.
 *
 * The judging protocol splits judging in two: sub-agents NOTICE, and a deterministic
 * predicate PROVES. This module is what a predicate is written against. It exists so that a
 * stochastic agent never has to reimplement graph traversal to support a claim — that is
 * exactly where a confident wrong answer comes from.
 *
 * Everything here is a read of the workflow JSON. Zero LLM inference, zero network, no
 * knowledge of how to BUILD a workflow: Barrier 3 of the protocol requires the judge's
 * capabilities to be strictly orthogonal to a builder's.
 *
 *   node benchmark/harness/predicates.mjs <workflow.json>   report the structural facts
 *   node benchmark/harness/predicates.mjs --self-check      assert the primitives are right
 */

import fs from 'node:fs';
import assert from 'node:assert';

/** Sub-node connection kinds: these attach a helper to its parent, they are not the data path. */
export const SUBNODE_TYPES = ['ai_languageModel', 'ai_tool', 'ai_memory', 'ai_outputParser',
    'ai_embedding', 'ai_vectorStore', 'ai_document', 'ai_textSplitter', 'ai_retriever'];

const isSticky = (type) => String(type || '').toLowerCase().includes('stickynote');

/** A trigger starts an execution: it has no main input and the engine calls it first. */
export function isTrigger(node) {
    const t = String(node?.type || '').toLowerCase();
    if (t.includes('respond')) return false;
    return t.includes('trigger') || t.endsWith('.webhook');
}

/**
 * Index a workflow into adjacency maps.
 *
 * `main` is the data path and therefore the execution order. Sub-node edges are kept
 * separate: a language model connected to an agent does not run "before" it in any sense a
 * dependency claim can rest on, it runs as part of it.
 *
 * Sticky notes are dropped. They carry no edges, so leaving them in makes every annotation
 * look like a disconnected island — the same denominator mistake that inflated node
 * validity before `validator.mjs` was fixed.
 */
export function graphOf(workflow) {
    const nodes = new Map();
    for (const node of workflow?.nodes || []) {
        if (isSticky(node.type)) continue;
        nodes.set(node.name, node);
    }
    const main = new Map();
    const mainReverse = new Map();
    const sub = new Map();       // sub-node -> Set(parent it serves)
    const subReverse = new Map();

    const link = (map, from, to) => {
        if (!map.has(from)) map.set(from, new Set());
        map.get(from).add(to);
    };

    for (const [src, byType] of Object.entries(workflow?.connections || {})) {
        if (!nodes.has(src)) continue;
        for (const [type, outputs] of Object.entries(byType || {})) {
            for (const group of outputs || []) {
                for (const target of group || []) {
                    const dst = target?.node;
                    if (!dst || !nodes.has(dst)) continue;
                    if (type === 'main') {
                        link(main, src, dst);
                        link(mainReverse, dst, src);
                    } else {
                        link(sub, src, dst);
                        link(subReverse, dst, src);
                    }
                }
            }
        }
    }
    return { nodes, main, mainReverse, sub, subReverse, workflow };
}

function reach(adjacency, start) {
    const seen = new Set();
    const queue = [start];
    while (queue.length) {
        const current = queue.pop();
        for (const next of adjacency.get(current) || []) {
            if (seen.has(next)) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    return seen;
}

/** Every node the engine must finish before `name` can start. Main edges only. */
export const ancestorsOf = (graph, name) => reach(graph.mainReverse, name);

/** Every node that cannot start until `name` has finished. Main edges only. */
export const descendantsOf = (graph, name) => reach(graph.main, name);

/**
 * FAMILY 1 — ordering. True when `later` is a strict main-path descendant of `earlier`, so
 * the engine cannot start `later` until `earlier` has returned.
 *
 * This is the predicate behind run_10's confirmed defect: a Google Calendar fetch chained
 * downstream of an email triage agent waits on an LLM call it has no data dependency on.
 * Correctness scored that workflow 100/100 — every node valid, every node connected, every
 * requirement covered.
 */
export function runsAfter(graph, later, earlier) {
    return descendantsOf(graph, earlier).has(later);
}

/**
 * FAMILY 2 — engine semantics. Reports the declared setting without inventing a default:
 * a workflow that does not declare one is reported as `absent`, because guessing which
 * default the instance applied is exactly the kind of assumption a predicate may not make.
 *
 * Under `v1` the engine runs nodes one at a time. A fan-out therefore buys no wall clock:
 * it changes which node waits for which, never how many run at once.
 */
export function executionOrder(workflow) {
    return workflow?.settings?.executionOrder ?? 'absent';
}

/**
 * FAMILY 5 — weak connectivity. Nodes that no trigger can reach, even though each has edges
 * and so passes the orphan check in `validator.mjs`.
 *
 * A sub-node counts as reached when the node it serves is reached: a language model has no
 * main edge at all and still runs. Without that rule every agent's model reads as dead.
 */
export function unreachableFromTrigger(graph) {
    const reached = new Set();
    for (const [name, node] of graph.nodes) {
        if (!isTrigger(node)) continue;
        reached.add(name);
        for (const n of descendantsOf(graph, name)) reached.add(n);
    }
    // Fixed point: attach sub-nodes to any parent already known to run.
    let grew = true;
    while (grew) {
        grew = false;
        for (const [subNode, parents] of graph.sub) {
            if (reached.has(subNode)) continue;
            if ([...parents].some((p) => reached.has(p))) {
                reached.add(subNode);
                grew = true;
            }
        }
    }
    return [...graph.nodes.keys()].filter((n) => !reached.has(n));
}

const REFERENCE_PATTERNS = [
    /\$\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\$node\s*\[\s*['"]([^'"]+)['"]\s*\]/g,
    /\$items\s*\(\s*['"]([^'"]+)['"]\s*/g,
];

/** Every string value in a parameter tree, raw. Never the JSON encoding of it: `JSON.stringify`
 * escapes the quotes that `$node["Name"]` is built from, so a scan over serialised
 * parameters silently sees no `$node` reference at all. */
function stringValues(value, out = []) {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) for (const v of value) stringValues(v, out);
    else if (value && typeof value === 'object') for (const v of Object.values(value)) stringValues(v, out);
    return out;
}

/**
 * FAMILY 4 — expression resolution. Every node an expression names must exist, and must be
 * upstream of the node holding the expression, or the reference resolves to nothing at run
 * time.
 *
 * A node with no main edges is a sub-node: its data comes from whatever it serves, so its
 * visible scope is the union of its parents' scopes.
 */
export function brokenReferences(graph) {
    const findings = [];
    for (const [name, node] of graph.nodes) {
        const referenced = new Set();
        for (const text of stringValues(node.parameters ?? {})) {
            for (const pattern of REFERENCE_PATTERNS) {
                for (const match of text.matchAll(pattern)) referenced.add(match[1]);
            }
        }
        if (referenced.size === 0) continue;

        let scope = ancestorsOf(graph, name);
        if (scope.size === 0 && graph.sub.has(name)) {
            scope = new Set();
            for (const parent of graph.sub.get(name)) {
                scope.add(parent);
                for (const a of ancestorsOf(graph, parent)) scope.add(a);
            }
        }
        for (const target of referenced) {
            if (!graph.nodes.has(target)) {
                findings.push({ node: name, reference: target, reason: 'unknown_node' });
            } else if (target !== name && !scope.has(target)) {
                findings.push({ node: name, reference: target, reason: 'not_upstream' });
            }
        }
    }
    return findings;
}

/**
 * The full structural report for one workflow. This is what a judge cites and what a third
 * party re-runs against the archived artefact alone.
 */
export function structuralFacts(workflow) {
    const graph = graphOf(workflow);
    const triggers = [...graph.nodes.values()].filter(isTrigger).map((n) => n.name);
    // A serialisation is a node that waits on an ancestor it shares no data path purpose
    // with; the predicate reports the ordering, a judge argues whether it is justified.
    const chains = [];
    for (const [name] of graph.nodes) {
        const ancestors = ancestorsOf(graph, name);
        if (ancestors.size > 0) chains.push({ node: name, waitsOn: [...ancestors] });
    }
    return {
        executionOrder: executionOrder(workflow),
        functionalNodeCount: graph.nodes.size,
        triggers,
        maxMainDepth: chains.reduce((m, c) => Math.max(m, c.waitsOn.length), 0),
        unreachableFromTrigger: unreachableFromTrigger(graph),
        brokenReferences: brokenReferences(graph),
        waitsOn: Object.fromEntries(chains.map((c) => [c.node, c.waitsOn])),
    };
}

/**
 * The one runnable check. Every primitive is asserted on a fixture built to contain exactly
 * one instance of each defect, plus a clean control — a predicate that always fires and one
 * that never fires are equally useless.
 */
function selfCheck() {
    const conn = (targets) => ({ main: [targets.map((node) => ({ node, type: 'main', index: 0 }))] });
    const workflow = {
        settings: { executionOrder: 'v1' },
        nodes: [
            { name: 'Trigger', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
            { name: 'Fetch A', type: 'n8n-nodes-base.gmail', parameters: {} },
            { name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', parameters: {} },
            { name: 'Fetch B', type: 'n8n-nodes-base.googleCalendar', parameters: {} },
            { name: 'Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', parameters: {} },
            { name: 'Island', type: 'n8n-nodes-base.set', parameters: {} },
            { name: 'Island Sink', type: 'n8n-nodes-base.noOp', parameters: {} },
            { name: 'Bad Ref', type: 'n8n-nodes-base.set', parameters: { value: '={{ $(\'Ghost\').item.json.x }}' } },
            { name: 'Early Ref', type: 'n8n-nodes-base.set', parameters: { value: '={{ $node["Fetch B"].json.y }}' } },
            { name: 'Note', type: 'n8n-nodes-base.stickyNote', parameters: {} },
        ],
        connections: {
            Trigger: conn(['Fetch A', 'Early Ref']),
            'Fetch A': conn(['Agent']),
            Agent: conn(['Fetch B']),
            'Fetch B': conn(['Bad Ref']),
            Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
            Island: conn(['Island Sink']),
        },
    };
    const graph = graphOf(workflow);

    assert.ok(!graph.nodes.has('Note'), 'sticky notes must not enter the graph');
    assert.strictEqual(graph.nodes.size, 9);

    // Family 1
    assert.ok(runsAfter(graph, 'Fetch B', 'Agent'), 'a strict descendant must be reported as waiting');
    assert.ok(!runsAfter(graph, 'Agent', 'Fetch B'), 'the relation is directed, not symmetric');
    assert.ok(!runsAfter(graph, 'Fetch A', 'Early Ref'), 'sibling branches do not wait on each other');
    assert.ok(runsAfter(graph, 'Fetch B', 'Trigger'), 'the relation must be transitive');

    // Family 2
    assert.strictEqual(executionOrder(workflow), 'v1');
    assert.strictEqual(executionOrder({ settings: {} }), 'absent', 'an undeclared setting is never guessed');

    // Family 5
    const dead = unreachableFromTrigger(graph);
    assert.deepStrictEqual(dead.sort(), ['Island', 'Island Sink'],
        'an island with zero orphans must be caught, and the agent model must not be');

    // Family 4
    const refs = brokenReferences(graph);
    assert.strictEqual(refs.length, 2, 'exactly the two planted references');
    assert.ok(refs.some((r) => r.node === 'Bad Ref' && r.reference === 'Ghost' && r.reason === 'unknown_node'));
    assert.ok(refs.some((r) => r.node === 'Early Ref' && r.reference === 'Fetch B' && r.reason === 'not_upstream'),
        'a reference to a node that runs later resolves to nothing');

    // The control: a workflow with none of the defects must report none of them.
    const clean = graphOf({
        settings: { executionOrder: 'v1' },
        nodes: [
            { name: 'T', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
            { name: 'A', type: 'n8n-nodes-base.gmail', parameters: {} },
            { name: 'B', type: 'n8n-nodes-base.set', parameters: { v: '={{ $(\'A\').item.json.x }}' } },
        ],
        connections: { T: conn(['A']), A: conn(['B']) },
    });
    assert.deepStrictEqual(unreachableFromTrigger(clean), []);
    assert.deepStrictEqual(brokenReferences(clean), []);

    console.log('✅ predicates self-check passed');
}

if (process.argv[1] && process.argv[1].endsWith('predicates.mjs')) {
    if (process.argv.includes('--self-check')) {
        selfCheck();
    } else {
        const file = process.argv[2];
        if (!file) {
            console.error('usage: node benchmark/harness/predicates.mjs <workflow.json>');
            process.exit(2);
        }
        console.log(JSON.stringify(structuralFacts(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2));
    }
}
