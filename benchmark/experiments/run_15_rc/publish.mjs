/**
 * Publish run_15 into results/history in the shape the site reporter reads.
 *
 *   node benchmark/experiments/run_15_rc/publish.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const NL = String.fromCharCode(10);
const root = 'G:/repos/n8n-harness-benchmark';
const exp = path.join(root, 'benchmark/experiments/run_15_rc');
const r = JSON.parse(fs.readFileSync(path.join(exp, 'result.json'), 'utf8'));
const m = JSON.parse(fs.readFileSync(path.join(exp, 'manifest.json'), 'utf8'));

const armOut = (x) => ({
    scores: {
        composite: x.scores.composite,
        quality: x.scores.quality,
        correctness: x.scores.correctness,
        tokenEfficiency: x.scores.tokenEfficiency,
        buildTime: x.scores.buildTime,
    },
    measured: { tokens: x.tokens, durationMs: x.durationMs, deliveredOf: x.delivered },
    qualityDimensions: x.dimensions,
    qualityPooledMedian: x.qualityPooledMedian,
    builds: x.perBuild,
});

const out = {
    metadata: {
        run: 'run_15',
        label: '2.7.0-rc.1 · 5 builds each · both branches remeasured',
        date: '2026-09-11',
        harness: 'Claude-Code',
        model: 'claude-opus-5 orchestrator, sonnet workers',
        underTest: r.underTest,
        buildsPerBranch: 5,
        judgesPerBuild: 3,
        note: 'Both branches were measured in this session, so every raw number and every relative score comes from the same conditions. The previous published run reused the Native MCP builds from an earlier one, which made its table hard to read.',
    },
    weights: r.weights,
    n8nac: armOut(r.n8nac),
    nativeMcp: armOut(r.nativeMcp),
    notes: [
        'All ten builds delivered. The previous run had three of ten produce a briefing that nothing sent anywhere.',
        'n8n-as-code wins the composite while losing quality by six points. It is 17% cheaper in tokens and 19% faster, which takes both relative axes; the weights do the rest.',
        'The quality gap has one cause and the judges found it independently every time: three of five n8n-as-code builds chain the calendar agent behind the email agent although the two reads share no data. Those builds scored 13 to 17 on connections; all five Native MCP builds fan out and rejoin at a Merge, and scored 23 or 24. The other three dimensions are level between the branches.',
        'It is not inherent to the tool. The two n8n-as-code builds that did fan out scored 91 and 89, level with Native MCP.',
        'Judge agreement was tight: the widest spread across three judges of one workflow was 4 points, against a 15-point threshold for publishing disagreement. Mean-of-medians and pooled median give the same ranking.',
        'Correctness is saturated again: 100 everywhere except one invalid node in a single build. The axis no longer separates the tools.',
        'The n8n-as-code agent context now names the local install directly, `node node_modules/n8nac/dist/index.js`, which is what 2.7.0-rc.1 shipped. This is the first run where that form reached a builder through the full chain: release, npm publish, and an installer reading only the documentation.',
        'The toolchain usage gate had to be widened for this run. It searched for the literal `n8nac <subcommand>`, which the new command form no longer produces, so five builders drove the CLI about thirty times and the gate read zero. The builder logs were inspected before the gate was touched, and two self-check cases now pin both forms.',
        'On the Native MCP branch the n8n server attached the account existing model credential by itself on all five builds, although the submitted code declared empty slots. The benchmark forbids builders from assigning credentials; here the platform did it for one branch and not the other.',
        'Publishing the prerelease made `npx n8nac@next` unusable for about ten minutes: the dist tag moved before the dependency was resolvable.',
    ],
};

const dir = path.join(root, 'results/history/run_15');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'benchmark_results.json'), JSON.stringify(out, null, 2) + NL, 'utf8');
console.log('run_15 publie: n8n-as-code', out.n8nac.scores.composite, '| Native MCP', out.nativeMcp.scores.composite);
