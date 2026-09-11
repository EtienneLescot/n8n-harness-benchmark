import fs from 'node:fs';
import * as m from 'file:///G:/repos/n8n-harness-benchmark/benchmark/harness/scoring.mjs';

const NL = String.fromCharCode(10);
const base = 'G:/repos/n8n-harness-benchmark/benchmark/experiments/exp_01_skill_variants/';

// Three isolated judges per build. No judge saw more than one workflow.
const grades = {
    std_nac_1: [92, 86, 88], std_nac_2: [88, 88, 92], std_nac_3: [74, 72, 72],
    std_nac_4: [65, 74, 77], std_nac_5: [93, 94, 95],
    std_mcp_1: [87, 89, 85], std_mcp_2: [89, 92, 93], std_mcp_3: [91, 90, 92],
    std_mcp_4: [68, 65, 73], std_mcp_5: [88, 91, 87],
};

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const spread = (xs) => Math.max(...xs) - Math.min(...xs);

const builds = JSON.parse(fs.readFileSync(base + 'builds.json', 'utf8')).builds;
const byLabel = Object.fromEntries(builds.map((b) => [b.label, b]));

const tools = {
    n8nac: { label: 'n8n-as-code', labels: ['std_nac_1', 'std_nac_2', 'std_nac_3', 'std_nac_4', 'std_nac_5'] },
    native_mcp: { label: 'n8n Native MCP', labels: ['std_mcp_1', 'std_mcp_2', 'std_mcp_3', 'std_mcp_4', 'std_mcp_5'] },
};

for (const t of Object.values(tools)) {
    t.builds = t.labels.map((l) => ({
        label: l,
        grades: grades[l],
        quality: median(grades[l]),
        spread: spread(grades[l]),
        delivers: byLabel[l].delivers,
        nodes: byLabel[l].nodes,
        agents: byLabel[l].agents,
        terminal: byLabel[l].terminalTypes.join('+'),
        tokens: byLabel[l].tokens,
        durationMs: byLabel[l].durationMs,
    }));
    t.quality = median(t.builds.map((b) => b.quality));
    t.qualityRange = [Math.min(...t.builds.map((b) => b.quality)), Math.max(...t.builds.map((b) => b.quality))];
    t.allGrades = t.builds.flatMap((b) => b.grades);
    t.tokens = median(t.builds.map((b) => b.tokens));
    t.tokensRange = [Math.min(...t.builds.map((b) => b.tokens)), Math.max(...t.builds.map((b) => b.tokens))];
    t.duration = median(t.builds.map((b) => b.durationMs));
    t.durationRange = [Math.min(...t.builds.map((b) => b.durationMs)), Math.max(...t.builds.map((b) => b.durationMs))];
    t.delivered = t.builds.filter((b) => b.delivers).length;
    t.correctness = 100;
}

const A = tools.n8nac, B = tools.native_mcp;
A.tokenEfficiency = m.relativeScore(A.tokens, B.tokens);
B.tokenEfficiency = m.relativeScore(B.tokens, A.tokens);
A.buildTime = m.relativeScore(A.duration, B.duration);
B.buildTime = m.relativeScore(B.duration, A.duration);
for (const t of [A, B]) {
    t.composite = m.compositeScore({
        quality: t.quality, correctness: t.correctness,
        tokenEfficiency: t.tokenEfficiency, buildTime: t.buildTime,
    }).score;
}

const out = {
    generatedAt: new Date().toISOString(),
    underTest: 'n8nac@2.6.0-rc.6 against n8n Native MCP, same instance, same prompt, same model',
    method: '5 builds per tool, 3 isolated judges per build, median of grades then median of build medians. No judge saw more than one workflow.',
    weights: m.COMPOSITE_WEIGHTS,
    tools: { n8nac: A, native_mcp: B },
    note: 'Correctness returned 100/100 on all ten artefacts, so it contributes the same 30 points to both composites and discriminates nothing at this level of maturity.',
};
fs.writeFileSync(base + 'aggregate.json', JSON.stringify(out, null, 2) + NL, 'utf8');

const row = (t) => `  ${t.label.padEnd(16)} qualite ${String(t.quality).padStart(3)} [${t.qualityRange.join('-')}]`
    + ` | livre ${t.delivered}/5 | tokens ${String(t.tokens).padStart(6)} -> ${String(t.tokenEfficiency).padStart(6)}`
    + ` | duree ${String(Math.round(t.duration / 1000) + 's').padStart(5)} -> ${String(t.buildTime).padStart(6)}`
    + ` | COMPOSITE ${t.composite}`;
console.log(row(A));
console.log(row(B));
console.log();
console.log('  medianes par build  n8n-as-code:', A.builds.map((b) => b.quality).join(' '), ' native MCP:', B.builds.map((b) => b.quality).join(' '));
console.log('  ecart composite:', Math.abs(A.composite - B.composite).toFixed(2), 'en faveur de', A.composite > B.composite ? A.label : B.label);
