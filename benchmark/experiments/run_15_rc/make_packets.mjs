/**
 * One judge packet per build: the workflow blinded, plus the structural facts computed from
 * it. A judge gets this and the brief, nothing else — no branch name, no cost, no correctness
 * score, and never a second workflow.
 *
 *   node benchmark/experiments/run_15_rc/make_packets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { blindWorkflow } from '../../harness/scoring.mjs';
import { structuralFacts } from '../../harness/predicates.mjs';
import { fileURLToPath } from 'node:url';

/** This file lives at <repo>/benchmark/experiments/run_15_rc/, so the root is three levels up. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

const NL = String.fromCharCode(10);
const exp = path.join(ROOT, 'benchmark/experiments/run_15_rc');
const outDir = path.join(exp, 'judging', 'packets');
fs.mkdirSync(outDir, { recursive: true });

const builds = JSON.parse(fs.readFileSync(path.join(exp, 'builds.json'), 'utf8')).builds;
// Opaque ids so a packet filename cannot tell a judge which branch it is holding.
const ids = builds.map((b, i) => ({ label: b.label, id: 'wf-' + String(i + 1).padStart(2, '0') }));
fs.writeFileSync(path.join(exp, 'judging', 'key.json'), JSON.stringify(ids, null, 2) + NL, 'utf8');

for (const { label, id } of ids) {
    const wf = JSON.parse(fs.readFileSync(path.join(exp, 'artifacts', label + '.json'), 'utf8'));
    const packet = { workflowId: id, workflow: blindWorkflow(wf), structuralFacts: structuralFacts(wf) };
    fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify(packet, null, 2) + NL, 'utf8');
    console.log(id, '<-', label, '|', packet.structuralFacts.functionalNodeCount, 'noeuds');
}
