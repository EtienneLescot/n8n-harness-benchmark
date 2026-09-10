/**
 * run_11 / branch alpha / finding 1 — Family 4, expression resolution.
 *
 * CLAIM: "Dashboard Composer Agent" interpolates $('Email Sorter Agent') in its prompt, but
 * "Email Sorter Agent" has no outgoing main edge and is therefore not upstream of it. The
 * reference resolves to nothing at run time, so the email half of the briefing never
 * reaches the dashboard.
 *
 * Correctness scored this workflow 100/100: the node has an incoming edge so it is not an
 * orphan, graph integrity is 100, and all six capabilities are covered.
 *
 * Re-run against the archived artefact alone:
 *   node results/history/run_11/judging/predicates/alpha-f1-broken-reference.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { graphOf, ancestorsOf, brokenReferences } from '../../../../../benchmark/harness/predicates.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const artefact = path.join(here, '..', 'workflow_alpha.json');
const workflow = JSON.parse(fs.readFileSync(artefact, 'utf8'));
const graph = graphOf(workflow);

const REFERRER = 'Dashboard Composer Agent';
const REFERENCED = 'Email Sorter Agent';

const hit = brokenReferences(graph).find(
    (r) => r.node === REFERRER && r.reference === REFERENCED && r.reason === 'not_upstream',
);
const result = Boolean(hit);

console.log(JSON.stringify({
    finding: 'alpha-f1-broken-reference',
    family: 4,
    result,
    evidence: {
        referencedNodeExists: graph.nodes.has(REFERENCED),
        referrerAncestors: [...ancestorsOf(graph, REFERRER)],
        referencedHasOutgoingMain: graph.main.has(REFERENCED),
    },
}, null, 2));

process.exit(result ? 0 : 1);
