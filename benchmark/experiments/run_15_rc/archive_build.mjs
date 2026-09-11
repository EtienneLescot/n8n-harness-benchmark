/**
 * Fetch a finished workflow, record the facts that matter, then remove it from the shared
 * instance so the next build cannot see it.
 *
 *   node benchmark/experiments/run_15_rc/archive_build.mjs <label> <workflowId> [tokens] [durationMs]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = 'G:/repos/n8n-harness-benchmark';
const exp = path.join(root, 'benchmark/experiments/run_15_rc');
const NL = String.fromCharCode(10);

for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().replace(/^\uFEFF/, '');
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}
const HOST = process.env.N8N_HOST.replace(/\/+$/, '');
const KEY = process.env.N8N_API_KEY;

/** A terminal node that puts the briefing somewhere a person would actually see it. */
const DELIVERS = /gmail|emailsend|slack|telegram|httprequest|respondtowebhook|writebinaryfile|discord|webhook/i;
const IS_SUBNODE = /lmchat|embedding|memory|outputparser|textsplitter|vectorstore|retriever|tool$/i;

const [, , label, workflowId, tokensArg, durationArg] = process.argv;
if (!label || !workflowId) {
    console.error('usage: archive_build.mjs <label> <workflowId> [tokens] [durationMs]');
    process.exit(2);
}

const res = await fetch(HOST + '/api/v1/workflows/' + workflowId, { headers: { 'X-N8N-API-KEY': KEY } });
if (!res.ok) {
    console.error('fetch failed: ' + res.status);
    process.exit(1);
}
const wf = await res.json();
if (!Array.isArray(wf.nodes) || !wf.connections) {
    console.error('archive incomplete, refusing to delete');
    process.exit(1);
}

fs.mkdirSync(path.join(exp, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(exp, 'artifacts', label + '.json'), JSON.stringify(wf, null, 2) + NL, 'utf8');

const sources = new Set(Object.keys(wf.connections));
const functional = wf.nodes.filter((n) => !/sticky/i.test(n.type));
const terminal = functional.filter((n) => !sources.has(n.name) && !IS_SUBNODE.test(n.type));
const facts = {
    label,
    workflowId,
    workflowName: wf.name,
    active: wf.active,
    nodes: functional.length,
    agents: functional.filter((n) => /langchain/i.test(n.type) && /agent/i.test(n.type)).length,
    terminalTypes: terminal.map((n) => n.type.replace(/^.*\./, '')),
    delivers: terminal.some((n) => DELIVERS.test(n.type)),
    tokens: tokensArg ? Number(tokensArg) : null,
    durationMs: durationArg ? Number(durationArg) : null,
    archivedAt: new Date().toISOString(),
};

const ledgerPath = path.join(exp, 'builds.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const entry = ledger.builds.find((b) => b.label === label);
if (entry) Object.assign(entry, facts);
else ledger.builds.push(facts);
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + NL, 'utf8');

const del = await fetch(HOST + '/api/v1/workflows/' + workflowId, { method: 'DELETE', headers: { 'X-N8N-API-KEY': KEY } });
const check = await fetch(HOST + '/api/v1/workflows/' + workflowId, { headers: { 'X-N8N-API-KEY': KEY } });

console.log(label + ': ' + facts.nodes + ' nodes, ' + facts.agents + ' agents, terminal ' + facts.terminalTypes.join('+') + ', '
    + (facts.delivers ? 'DELIVERS' : 'DELIVERS NOTHING')
    + (facts.tokens ? ', ' + facts.tokens + ' tokens, ' + Math.round(facts.durationMs / 1000) + 's' : '')
    + ' | removed from instance: ' + del.status + ', recheck ' + check.status + (check.status === 404 ? ' (clean)' : ' (STILL PRESENT)'));
