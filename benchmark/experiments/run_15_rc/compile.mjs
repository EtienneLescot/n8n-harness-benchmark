/**
 * Compile run_15 from the archived facts: measurements from builds.json, quality from the
 * judge grades, correctness from the validator. Writes result.json.
 *
 *   node benchmark/experiments/run_15_rc/compile.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { COMPOSITE_WEIGHTS, relativeScore, compositeScore } from '../../harness/scoring.mjs';

const NL = String.fromCharCode(10);
const exp = 'G:/repos/n8n-harness-benchmark/benchmark/experiments/run_15_rc';
const DIMS = ['idea', 'structure', 'connections', 'answer'];

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const round = (x) => parseFloat(Number(x).toFixed(2));

const builds = JSON.parse(fs.readFileSync(path.join(exp, 'builds.json'), 'utf8')).builds;
const key = JSON.parse(fs.readFileSync(path.join(exp, 'judging', 'key.json'), 'utf8'));
const correctness = JSON.parse(fs.readFileSync(path.join(exp, 'judging', 'correctness.json'), 'utf8'));

const gradeDir = path.join(exp, 'judging', 'grades');
const grades = {};
for (const f of fs.readdirSync(gradeDir)) {
    const j = JSON.parse(fs.readFileSync(path.join(gradeDir, f), 'utf8'));
    (grades[j.workflowId] = grades[j.workflowId] || []).push(j);
}

const arm = (branch) => {
    const mine = builds.filter((b) => b.label.includes(branch));
    const perBuild = mine.map((b) => {
        const id = key.find((k) => k.label === b.label).id;
        const panel = grades[id];
        const totals = panel.map((p) => p.total);
        const dims = Object.fromEntries(DIMS.map((d) => [d, median(panel.map((p) => p.dimensions[d].score))]));
        return {
            label: b.label, judgeId: id, nodes: b.nodes, tokens: b.tokens, durationMs: b.durationMs,
            delivers: b.delivers, correctness: correctness[b.label],
            quality: median(totals), judgeTotals: totals, spread: Math.max(...totals) - Math.min(...totals),
            dimensions: dims,
        };
    });
    // Median across the three judges of a build, then mean across builds. Pooling the whole
    // panel is published beside it so the shape of the distribution stays visible.
    return {
        perBuild,
        quality: round(mean(perBuild.map((b) => b.quality))),
        qualityPooledMedian: median(perBuild.flatMap((b) => b.judgeTotals)),
        dimensions: Object.fromEntries(DIMS.map((d) => [d, round(mean(perBuild.map((b) => b.dimensions[d])))])),
        correctness: round(mean(perBuild.map((b) => b.correctness))),
        tokens: median(perBuild.map((b) => b.tokens)),
        durationMs: median(perBuild.map((b) => b.durationMs)),
        delivered: [perBuild.filter((b) => b.delivers).length, perBuild.length],
    };
};

const a = arm('n8nac');
const b = arm('native_mcp');

const tA = relativeScore(a.tokens, b.tokens), tB = relativeScore(b.tokens, a.tokens);
const dA = relativeScore(a.durationMs, b.durationMs), dB = relativeScore(b.durationMs, a.durationMs);
const cA = compositeScore({ quality: a.quality, correctness: a.correctness, tokenEfficiency: tA, buildTime: dA });
const cB = compositeScore({ quality: b.quality, correctness: b.correctness, tokenEfficiency: tB, buildTime: dB });

const out = {
    runId: 'run15',
    underTest: 'n8nac@2.7.0-rc.1',
    weights: COMPOSITE_WEIGHTS,
    n8nac: { ...a, scores: { quality: a.quality, correctness: a.correctness, tokenEfficiency: tA, buildTime: dA, composite: cA.score } },
    nativeMcp: { ...b, scores: { quality: b.quality, correctness: b.correctness, tokenEfficiency: tB, buildTime: dB, composite: cB.score } },
};
fs.writeFileSync(path.join(exp, 'result.json'), JSON.stringify(out, null, 2) + NL, 'utf8');

const line = (n, x) => `  ${n.padEnd(14)} qualite ${String(x.quality).padStart(6)} (groupee ${x.qualityPooledMedian})  correctness ${String(x.correctness).padStart(6)}  tokens ${String(x.tokens).padStart(7)}  duree ${Math.round(x.durationMs / 1000)}s  livre ${x.delivered[0]}/${x.delivered[1]}`;
console.log(line('n8n-as-code', a));
console.log(line('Native MCP', b));
console.log();
console.log('  n8n-as-code  qualite', a.quality, '| correctness', a.correctness, '| tokens', tA, '| duree', dA, '=> COMPOSITE', cA.score);
console.log('  Native MCP   qualite', b.quality, '| correctness', b.correctness, '| tokens', tB, '| duree', dB, '=> COMPOSITE', cB.score);
console.log();
console.log('  gagnant:', cA.score > cB.score ? 'n8n-as-code' : 'Native MCP', '| ecart', Math.abs(cA.score - cB.score).toFixed(2));
