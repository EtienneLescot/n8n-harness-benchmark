// run_17 adjudication predicates — the harness runs these; agent verdicts gate entry only.
import fs from 'node:fs';

const J = 'results/history/run_17/judging';
const wf1 = JSON.parse(fs.readFileSync(`${J}/blinded_wf1.json`, 'utf8'));
const wf2 = JSON.parse(fs.readFileSync(`${J}/blinded_wf2.json`, 'utf8'));
const node = (w, name) => w.nodes.find(n => n.name === name);

// C (wf1, family 4/6): Gmail simple:false while the digest consumes the simplified contract.
const gmail = node(wf1, 'Fetch Last 24h Emails');
const digest = node(wf1, 'Digest Emails').parameters.jsCode;
const pC = gmail.parameters.simple === false
  && /j\.From\s*\|\|\s*j\.from/.test(digest)
  && digest.includes('j.labels');
console.log('C (gmail shape, wf1) =', pC, '| simple:', gmail.parameters.simple,
  '| reads j.From||j.from:', /j\.From\s*\|\|\s*j\.from/.test(digest), '| reads j.labels:', digest.includes('j.labels'));

// E (wf1, family 2): v1 traversal makes the calendar fetch start only after the email agent returns.
const pos = Object.fromEntries(wf1.nodes.map(n => [n.name, n.position]));
const trig = wf1.connections['Daily 08:00 Trigger'];
// main-ancestors of a node: walk INCOMING edges (who can feed it), not outgoing
const incoming = {};
for (const [src, groups] of Object.entries(wf1.connections)) {
  for (const arr of groups.main ?? []) for (const e of arr ?? []) (incoming[e.node] ??= new Set()).add(src);
}
const calAncestors = new Set();
(function walk(name) { if (calAncestors.has(name)) return; calAncestors.add(name);
  for (const src of incoming[name] ?? []) walk(src);
})('Fetch Next 3 Days Events');
calAncestors.delete('Fetch Next 3 Days Events');
const pE = wf1.settings?.executionOrder === 'v1'
  && trig.main[0].some(e => e.node === 'Fetch Last 24h Emails')
  && trig.main[0].some(e => e.node === 'Fetch Next 3 Days Events')
  && pos['Email Analyst Agent'][1] < pos['Calendar Analyst Agent'][1]
  && calAncestors.size === 1 && calAncestors.has('Daily 08:00 Trigger');
console.log('E (v1 ordering, wf1) =', pE, '| v1:', wf1.settings?.executionOrder,
  '| email-topmost:', pos['Email Analyst Agent'][1] < pos['Calendar Analyst Agent'][1],
  '| calendar ancestors:', [...calAncestors].join(','));

// B (wf2, family 2): claim needs a merge that requires BOTH inputs. Predicate encodes that premise.
const m2 = node(wf2, 'Merge Analyses');
const requiresBoth = m2.parameters?.mode === 'chooseBranch' || Number(m2.typeVersion) < 3;
const pB = requiresBoth; // no alwaysOutputData anywhere — verified separately — but the merge fires on 1 input
console.log('B (empty-source, wf2) =', pB, '| merge mode:', m2.parameters?.mode,
  '| typeVersion:', m2.typeVersion, '| v3 requiredInputs=1 unless chooseBranch → fires on one input');
