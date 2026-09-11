import fs from 'node:fs';
import * as m from 'file:///G:/repos/n8n-harness-benchmark/benchmark/harness/scoring.mjs';

const NL = String.fromCharCode(10);
const root = 'G:/repos/n8n-harness-benchmark/';
const base = root + 'benchmark/experiments/exp_02_default_context/';
const DIMS = ['idea', 'structure', 'connections', 'answer'];

const panel = {
    dflt_1: [[22, 21, 23, 22], [23, 23, 24, 24], [24, 23, 24, 23]],
    dflt_2: [[23, 23, 24, 23], [22, 22, 23, 21], [23, 23, 24, 23]],
    dflt_3: [[23, 22, 24, 22], [24, 24, 24, 22], [21, 23, 23, 22]],
    dflt_4: [[22, 22, 23, 21], [22, 21, 23, 19], [22, 22, 23, 23]],
    dflt_5: [[21, 21, 22, 9], [21, 20, 17, 8], [21, 21, 22, 9]],
};

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const round = (x) => parseFloat(Number(x).toFixed(2));

const builds = JSON.parse(fs.readFileSync(base + 'builds.json', 'utf8')).builds.filter((b) => b.tokens);
const byLabel = Object.fromEntries(builds.map((b) => [b.label, b]));
const labels = Object.keys(panel);

const perBuild = labels.map((l) => {
    const dims = Object.fromEntries(DIMS.map((d, i) => [d, median(panel[l].map((j) => j[i]))]));
    return {
        label: l,
        dimensions: dims,
        quality: round(Object.values(dims).reduce((s, x) => s + x, 0)),
        judgeTotals: panel[l].map((j) => j.reduce((s, x) => s + x, 0)),
        delivers: byLabel[l].delivers,
        terminal: byLabel[l].terminalTypes.join('+'),
        nodes: byLabel[l].nodes,
        tokens: byLabel[l].tokens,
        durationMs: byLabel[l].durationMs,
    };
});

const dimensions = Object.fromEntries(DIMS.map((d) => [d, round(mean(perBuild.map((b) => b.dimensions[d])))]));
const quality = round(Object.values(dimensions).reduce((s, x) => s + x, 0));
const tokens = median(perBuild.map((b) => b.tokens));
const durationMs = median(perBuild.map((b) => b.durationMs));

// The comparators, both measured on the same harness, model and instance.
const exp1 = JSON.parse(fs.readFileSync(root + 'results/history/run_13/benchmark_results.json', 'utf8'));
const localCtx = { label: 'n8n-as-code, local-CLI context', quality: exp1.n8nac.scores.quality, dimensions: exp1.n8nac.qualityDimensions, tokens: exp1.n8nac.measured.tokens, durationMs: exp1.n8nac.measured.durationMs, delivered: exp1.n8nac.measured.deliveredOf };
const mcp = { label: 'n8n Native MCP', quality: exp1.nativeMcp.scores.quality, dimensions: exp1.nativeMcp.qualityDimensions, tokens: exp1.nativeMcp.measured.tokens, durationMs: exp1.nativeMcp.measured.durationMs, delivered: exp1.nativeMcp.measured.deliveredOf };
const dflt = { label: 'n8n-as-code, default context', quality, dimensions, tokens, durationMs, delivered: [perBuild.filter((b) => b.delivers).length, perBuild.length] };

// Head to head on the default context, which is what a user actually gets.
const tA = m.relativeScore(dflt.tokens, mcp.tokens), tB = m.relativeScore(mcp.tokens, dflt.tokens);
const dA = m.relativeScore(dflt.durationMs, mcp.durationMs), dB = m.relativeScore(mcp.durationMs, dflt.durationMs);
const cA = m.compositeScore({ quality: dflt.quality, correctness: 100, tokenEfficiency: tA, buildTime: dA }).score;
const cB = m.compositeScore({ quality: mcp.quality, correctness: 100, tokenEfficiency: tB, buildTime: dB }).score;

fs.writeFileSync(base + 'result.json', JSON.stringify({
    question: 'What does the default agent context cost, against the same tool with the CLI invocation pointed at the local install?',
    perBuild,
    arms: { defaultContext: dflt, localCliContext: localCtx, nativeMcp: mcp },
    headToHead: {
        note: 'Default context against Native MCP, both on the same harness, model and instance. This is the pairing a user actually gets.',
        n8nac: { quality: dflt.quality, correctness: 100, tokenEfficiency: tA, buildTime: dA, composite: cA },
        nativeMcp: { quality: mcp.quality, correctness: 100, tokenEfficiency: tB, buildTime: dB, composite: cB },
    },
}, null, 2) + NL, 'utf8');

const line = (a) => `  ${a.label.padEnd(32)} qualite ${String(a.quality).padStart(5)} | livre ${a.delivered[0]}/${a.delivered[1]}`
    + ` | tokens ${String(a.tokens).padStart(6)} | duree ${String(Math.round(a.durationMs / 1000) + 's').padStart(5)}`;
console.log(line(dflt));
console.log(line(localCtx));
console.log(line(mcp));
console.log();
console.log('  dimensions  defaut', JSON.stringify(dflt.dimensions));
console.log('              local ', JSON.stringify(localCtx.dimensions));
console.log();
console.log('  TETE A TETE avec le contexte par defaut');
console.log('    n8n-as-code  tokens', tA, '| duree', dA, '| COMPOSITE', cA);
console.log('    Native MCP   tokens', tB, '| duree', dB, '| COMPOSITE', cB);
console.log('    gagnant:', cA > cB ? 'n8n-as-code' : 'Native MCP', '| ecart', Math.abs(cA - cB).toFixed(2));
