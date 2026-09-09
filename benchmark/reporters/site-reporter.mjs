#!/usr/bin/env node
/**
 * Generates docs/index.html from every run in results/history/.
 *
 * The page used to be hand-written HTML holding one run's numbers, which meant it lied
 * twice: it formatted a single run as though it were an aggregate, and it drew a *score*
 * bar for axes whose underlying quantity is a *cost*. A full token-efficiency bar next to
 * the label "tokens" reads as "many tokens" to anyone who has not memorised the scoring
 * formula.
 *
 * So this generator enforces two rules the page cannot break:
 *
 *   1. A score bar appears exactly once, on the composite. Everywhere else the bar length
 *      is the measured quantity itself, with its direction stated.
 *   2. Aggregation is the mean of per-run minimax scores, never the minimax of mean
 *      measurements. Minimax is a ratio between the two branches *within* one run; runs
 *      come from different harnesses and models, so their absolute seconds and token
 *      counts are not commensurable, while their within-run ratios are.
 *
 * Adding a run is dropping its benchmark_results.json into results/history/<run>/ and
 * running this. Nothing here is written by hand.
 *
 *   node benchmark/reporters/site-reporter.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPOSITE_WEIGHTS, CORRECTNESS_WEIGHTS } from '../harness/scoring.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const historyDir = path.join(repoRoot, 'results/history');
const outFile = path.join(repoRoot, 'docs/index.html');

const BRANCHES = [
    { key: 'n8nac', label: 'n8n-as-code', cls: 'a' },
    { key: 'nativeMcp', label: 'Native MCP', cls: 'b' },
];

/** Axes drawn as a measured quantity. `lowerIsBetter` decides the caption, never the maths. */
const MEASURES = [
    {
        id: 'tokens',
        label: 'Builder tokens',
        weight: COMPOSITE_WEIGHTS.tokenEfficiency,
        pick: (b) => b.rawMetrics?.tokens,
        format: (v) => v.toLocaleString('en-US').replace(/,/g, ' '),
        lowerIsBetter: true,
    },
    {
        id: 'build',
        label: 'Build time',
        weight: COMPOSITE_WEIGHTS.buildTime,
        pick: (b) => b.rawMetrics?.buildSeconds,
        format: (v) => `${v.toFixed(0)} s`,
        lowerIsBetter: true,
    },
];

const TELEMETRY = [
    { label: 'Install friction events', pick: (b) => b.rawMetrics?.installFrictions, lowerIsBetter: true },
    { label: 'Install commands', pick: (b) => b.rawMetrics?.installCommands, lowerIsBetter: true },
    { label: 'Build friction events', pick: (b) => b.rawMetrics?.buildFrictions, lowerIsBetter: true },
    { label: 'Acquisition', pick: (b) => b.rawMetrics?.acquisitionSeconds, lowerIsBetter: true, unit: 's' },
];

function loadRuns() {
    if (!fs.existsSync(historyDir)) return [];
    return fs.readdirSync(historyDir)
        .map((dir) => path.join(historyDir, dir, 'benchmark_results.json'))
        .filter((file) => fs.existsSync(file))
        .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
        .sort((a, b) => String(a.metadata?.run).localeCompare(String(b.metadata?.run), undefined, { numeric: true }));
}

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
const round = (n, d = 2) => parseFloat(Number(n).toFixed(d));

/** Mean of per-run scores — see the header note on why this is not the score of the means. */
function aggregate(runs) {
    const out = {};
    for (const { key } of BRANCHES) {
        const scores = runs.map((r) => r[key]?.scores || {});
        out[key] = {
            composite: round(mean(scores.map((s) => s.composite ?? 0))),
            correctness: round(mean(scores.map((s) => s.correctness ?? 0))),
            tokenEfficiency: round(mean(scores.map((s) => s.tokenEfficiency ?? 0))),
            buildTime: round(mean(scores.map((s) => s.buildTime ?? 0))),
            setupEaseTelemetry: round(mean(scores.map((s) => s.setupEaseTelemetry ?? 0))),
        };
    }
    return out;
}

/**
 * The scored radar axes.
 *
 * A radar is the honest shape for this data: every axis is already normalised 0-100 and
 * every one points the same way, so "further from the centre is better" holds everywhere,
 * without the reader having to remember that fewer tokens is good. The bar version could
 * not do that — it drew a long bar for a large cost and a long bar for a high score.
 *
 * Only scored axes are drawn. Setup ease was removed rather than annotated: an axis on
 * the chart that does not count reads as though it does, whatever the caption says.
 */
const AXES = [
    {
        lines: ['Correctness'],
        sub: ['requirement coverage,', 'node validity,', 'graph integrity'],
        pick: (b) => b.scores?.correctness,
    },
    { lines: ['Token', 'efficiency'], pick: (b) => b.scores?.tokenEfficiency },
    { lines: ['Workflow', 'build speed'], pick: (b) => b.scores?.buildTime },
];

const R = 130;              // outer radius
const CX = 250, CY = 216;   // centre of a 500x420 viewBox, low enough that a stacked
const NEWLINE = String.fromCharCode(10);

/** Axis i sits at -90deg + i*60deg, so the first axis points straight up. */
/** Polar placement with no 0-100 clamp, so labels can sit outside the outer ring. */
function polarPoint(i, radius) {
    const angle = (-90 + i * (360 / AXES.length)) * (Math.PI / 180);
    return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function axisPoint(i, value) {
    const angle = (-90 + i * (360 / AXES.length)) * (Math.PI / 180);
    const r = (Math.max(0, Math.min(100, value)) / 100) * R;
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

const polygonPoints = (values) =>
    values.map((v, i) => axisPoint(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");

function radarSvg(runs) {
    const series = BRANCHES.map(({ key, label, cls }) => ({
        label,
        cls,
        values: AXES.map((a) => mean(runs.map((r) => a.pick(r[key]) ?? 0))),
    }));

    const joiner = NEWLINE + "      ";

    // Rings at 25/50/75/100 give a scale without numbering every axis.
    const rings = [25, 50, 75, 100]
        .map((pct) => `<polygon class="ring" points="${polygonPoints(AXES.map(() => pct))}"/>`)
        .join(joiner);

    const spokes = AXES
        .map((_, i) => {
            const [x, y] = axisPoint(i, 100);
            return `<line class="spoke" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
        })
        .join(joiner);

    const labels = AXES
        .map((a, i) => {
            const [x, y] = axisPoint(i, 100);
            // Push the label outward along its own spoke, then anchor by which side it lands on.
            const [lx, ly] = polarPoint(i, R + 30);
            const anchor = lx > CX + 8 ? "start" : lx < CX - 8 ? "end" : "middle";
            // A label above the chart grows downward from its first line, so lift the whole
            // block by its sub-lines or the last one lands on the vertex it labels.
            const subLift = (a.sub || []).length * 12;
            const dy = ly < CY - 40 ? -8 - subLift : ly > CY + 40 ? 14 : 4;
            const tspans = a.lines
                .map((line, k) => `<tspan x="${lx.toFixed(1)}" dy="${k === 0 ? 0 : 12}">${esc(line)}</tspan>`)
                .join("");
            const note = (a.sub || [])
                .map((line) => `<tspan class="axis-note" x="${lx.toFixed(1)}" dy="12">${esc(line)}</tspan>`)
                .join("");
            return `<text class="axis-label" text-anchor="${anchor}" x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}">${tspans}${note}</text>`;
        })
        .join(joiner);

    const shapes = series
        .map((s) => `<polygon class="shape ${s.cls}" points="${polygonPoints(s.values)}"/>`)
        .join(joiner);

    const dots = series
        .map((s) => s.values
            .map((v, i) => {
                const [x, y] = axisPoint(i, v);
                return `<circle class="dot ${s.cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`;
            })
            .join(""))
        .join(joiner);

    const svg = [
        `<svg viewBox="0 0 500 420" role="img" aria-label="Comparison across the three scored axes; further from the centre is better on every axis">`,
        rings, spokes, shapes, dots, labels,
        `</svg>`,
    ].join(joiner);

    return { svg, series };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A score bar: 0-100, longer is better. Used for the composite and nothing else. */
function scoreBar(label, cls, value) {
    return `<div class="bar"><span class="who">${esc(label)}</span>`
        + `<div class="track"><div class="fill ${cls}" style="width:${Math.max(0, Math.min(100, value))}%"></div></div>`
        + `<span class="val">${value.toFixed(1)}</span></div>`;
}

/** A measure bar: length is the quantity itself, scaled against the larger of the two. */
function measureBar(label, cls, value, formatted, max) {
    const width = max > 0 ? (value / max) * 100 : 0;
    return `<div class="bar"><span class="who">${esc(label)}</span>`
        + `<div class="track"><div class="fill ${cls}" style="width:${width.toFixed(1)}%"></div></div>`
        + `<span class="val">${esc(formatted)}</span></div>`;
}

function render(runs) {
    const n = runs.length;
    const agg = aggregate(runs);
    const latest = runs[n - 1];

    const compositeRows = BRANCHES
        .map(({ key, label, cls }) => scoreBar(label, cls, agg[key].composite))
        .join('\n          ');

    const measureBlocks = MEASURES.map((m) => {
        const values = BRANCHES.map(({ key }) => mean(runs.map((r) => m.pick(r[key]) ?? 0)));
        const max = Math.max(...values);
        const bars = BRANCHES
            .map(({ label, cls }, i) => measureBar(label, cls, values[i], m.format(values[i]), max))
            .join('\n          ');
        return `      <div class="row">
        <div class="axis">${esc(m.label)}<small>${Math.round(m.weight * 100)} % of the composite · ${m.lowerIsBetter ? 'less is better' : 'more is better'}</small></div>
        <div class="bars">
          ${bars}
        </div>
      </div>`;
    }).join('\n');

    const correctnessValues = BRANCHES.map(({ key }) => agg[key].correctness);
    const correctnessBars = BRANCHES
        .map(({ label, cls }, i) => scoreBar(label, cls, correctnessValues[i]))
        .join('\n          ');

    const telemetryRows = TELEMETRY.map((t) => {
        const cells = BRANCHES.map(({ key }) => {
            const v = mean(runs.map((r) => t.pick(r[key]) ?? 0));
            return `<td class="num ${key === 'n8nac' ? 'a-col' : 'b-col'}">${round(v, 2)}${t.unit ? ' ' + t.unit : ''}</td>`;
        }).join('');
        return `        <tr><td>${esc(t.label)}</td>${cells}</tr>`;
    }).join('\n');

    const runRows = runs.map((r) => {
        const m = r.metadata || {};
        const cells = BRANCHES.map(({ key }) =>
            `<td class="num ${key === 'n8nac' ? 'a-col' : 'b-col'}">${round(r[key]?.scores?.composite ?? 0, 1)}</td>`).join('');
        return `        <tr><td><code>${esc(m.run || '?')}</code></td><td>${esc(m.harness || '?')}</td><td>${esc(m.model || '?')}</td>${cells}</tr>`;
    }).join('\n');

    const radar = radarSvg(runs);
    const legend = radar.series
        .map((entry) => `<span class="key"><i class="swatch ${entry.cls}"></i>${esc(entry.label)}</span>`)
        .join("");

    const plural = n === 1 ? 'run' : 'runs';

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>n8n-as-code vs n8n Native MCP — Benchmark</title>
<meta name="description" content="A deterministic, zero-LLM-judge benchmark comparing n8n-as-code with n8n's native MCP server on the same workflow brief.">
<style>
  :root {
    --bg:#fbfaf8; --surface:#fff; --line:#e6e2dc; --ink:#1c1a17; --muted:#6b6560; --faint:#96908a;
    --accent:#b8562f; --accent-soft:#f4e6df; --rival:#5a6b7a;
    --shadow:0 1px 2px rgba(28,26,23,.05),0 8px 24px -12px rgba(28,26,23,.12);
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme:dark){
    :root{--bg:#141310;--surface:#1c1a17;--line:#2e2a25;--ink:#f0ece6;--muted:#a49d95;--faint:#7d766e;
      --accent:#e08256;--accent-soft:#33231b;--rival:#93a6b8;
      --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.5);}
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:940px;margin:0 auto;padding:0 24px}
  a{color:var(--accent);text-underline-offset:2px}
  header{padding:72px 0 44px;border-bottom:1px solid var(--line)}
  .eyebrow{font:600 11px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:18px}
  h1{font-size:clamp(30px,5vw,46px);line-height:1.1;margin:0 0 16px;letter-spacing:-.02em}
  h1 .vs{color:var(--faint);font-weight:400}
  .lede{font-size:18px;color:var(--muted);max-width:62ch;margin:0}
  section{padding:52px 0;border-bottom:1px solid var(--line)}
  h2{font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
     margin:0 0 8px;font-family:var(--mono)}
  .sub{color:var(--muted);font-size:14.5px;margin:0 0 22px;max-width:66ch}
  h3{font-size:19px;margin:34px 0 10px;letter-spacing:-.01em}
  p{max-width:68ch}
  .board{display:grid;gap:14px}
  .row{display:grid;grid-template-columns:210px 1fr;gap:20px;align-items:center;background:var(--surface);
       border:1px solid var(--line);border-radius:10px;padding:16px 18px;box-shadow:var(--shadow)}
  .row.total{border-color:var(--accent)}
  .axis{font-weight:600;font-size:15px}
  .axis small{display:block;font-weight:400;color:var(--faint);font-size:12px;font-family:var(--mono);letter-spacing:.02em;margin-top:3px}
  .bars{display:grid;gap:8px;min-width:0}
  .bar{display:grid;grid-template-columns:96px 1fr 76px;gap:12px;align-items:center}
  .bar .who{color:var(--muted);font-size:12.5px;white-space:nowrap}
  .track{height:10px;border-radius:5px;background:var(--line);overflow:hidden}
  .fill{height:100%;border-radius:5px}
  .fill.a{background:var(--accent)} .fill.b{background:var(--rival)}
  .val{font-family:var(--mono);font-size:12.5px;text-align:right;color:var(--ink);font-variant-numeric:tabular-nums}
  .radar{display:grid;grid-template-columns:minmax(0,1fr) 232px;gap:28px;align-items:center;
    background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 20px 20px;box-shadow:var(--shadow)}
  .radar svg{width:100%;height:auto;display:block;overflow:visible}
  .ring{fill:none;stroke:var(--line);stroke-width:1}
  .spoke{stroke:var(--line);stroke-width:1}
  .shape{fill-opacity:.16;stroke-width:2.5;stroke-linejoin:round}
  .shape.a{fill:var(--accent);stroke:var(--accent)}
  .shape.b{fill:var(--rival);stroke:var(--rival)}
  .dot.a{fill:var(--accent)} .dot.b{fill:var(--rival)}
  .axis-label{font:600 11.5px var(--mono);fill:var(--muted)}
  .axis-note{font:400 10px var(--mono);fill:var(--faint)}
  .legend{display:flex;flex-wrap:wrap;gap:14px;margin:0 0 14px}
  .key{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--muted)}
  .swatch{width:11px;height:11px;border-radius:3px;display:inline-block}
  .swatch.a{background:var(--accent)} .swatch.b{background:var(--rival)}
  .side{display:grid;gap:12px}
  .side .cell{border:1px solid var(--line);border-radius:9px;padding:12px 14px}
  .side .cell.total{border-color:var(--accent)}
  .side .k{font:600 10.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
  .side .v{font:600 25px/1.15 var(--mono);font-variant-numeric:tabular-nums;margin-top:5px}
  .side .v.a{color:var(--accent)} .side .v.b{color:var(--rival)}
  @media (max-width:760px){.radar{grid-template-columns:1fr}}
  .scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
  table{border-collapse:collapse;width:100%;font-size:14px;min-width:460px}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line)}
  th{font:600 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
  td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right}
  tr:last-child td{border-bottom:0}
  .a-col{color:var(--accent);font-weight:600} .b-col{color:var(--rival);font-weight:600}
  ul.notes{list-style:none;padding:0;margin:0}
  ul.notes li{padding:12px 0 12px 26px;border-bottom:1px solid var(--line);position:relative;font-size:14.5px;max-width:74ch}
  ul.notes li:last-child{border-bottom:0}
  ul.notes li::before{content:"\\2192";position:absolute;left:0;color:var(--faint);font-family:var(--mono)}
  code{font-family:var(--mono);font-size:.89em;background:var(--accent-soft);padding:.12em .38em;border-radius:4px}
  .note{border-left:2px solid var(--accent);padding:2px 0 2px 18px;color:var(--muted);font-size:14.5px;max-width:70ch}
  footer{padding:40px 0 64px;color:var(--faint);font-size:13px}
  footer a{color:var(--muted)}
  @media (max-width:620px){.row{grid-template-columns:1fr;gap:12px}.bar{grid-template-columns:82px 1fr 68px}}
</style>
</head>
<body>

<header>
  <div class="wrap">
    <div class="eyebrow">Deterministic benchmark · zero LLM judges</div>
    <h1>n8n-as-code <span class="vs">vs</span> n8n Native MCP</h1>
    <p class="lede">
      Two AI agents get the same one-sentence brief, the same model, and the same n8n Cloud
      instance. One drives the <strong>n8n-as-code</strong> CLI, the other drives n8n's own
      <strong>native MCP server</strong>. Every figure below is computed from the deployed
      workflow by the n8n server's own validation RPC — no model grades anything.
    </p>
  </div>
</header>


<section>
  <div class="wrap">
    <h2>Where each one gains and loses</h2>
    <p class="sub">The three scored axes, each normalised 0-100. Further from the centre is better on
      every one of them, tokens and seconds included: the axis is efficiency, not cost.
      Mean across ${n} submitted ${plural}.</p>
    <div class="legend">${legend}</div>
    <div class="radar">
      ${radar.svg}
      <div class="side">
        <div class="cell total"><div class="k">Overall score</div>
          <div class="v a">${agg.n8nac.composite.toFixed(1)}</div>
          <div class="v b">${agg.nativeMcp.composite.toFixed(1)}</div></div>      </div>
    </div>
    <h3>Correctness, in detail</h3>
    <div class="scroll">
      <table>
        <tr><th>Component</th><th>Share</th><th>Source</th></tr>
        <tr><td>Requirement coverage</td><td class="num">${Math.round(CORRECTNESS_WEIGHTS.requirementCoverage * 100)} %</td><td>Required capabilities checked on node types and wiring, never on node names</td></tr>
        <tr><td>Node schema validity</td><td class="num">${Math.round(CORRECTNESS_WEIGHTS.nodeSchemaValidity * 100)} %</td><td>n8n server RPC <code>validate_node_config</code>, per node</td></tr>
        <tr><td>Graph integrity</td><td class="num">${Math.round(CORRECTNESS_WEIGHTS.graphIntegrity * 100)} %</td><td>Adjacency traversal, orphan detection, AI sub-connections</td></tr>
      </table>
    </div>

    </p>
  </div>
</section>

<section>
  <div class="wrap">
    <h2>Runs</h2>
    <p class="sub">Each submitted run, with its own composite. The mean above is the mean of
      these, not a score recomputed from pooled measurements: the minimax ratio is defined
      between the two branches <em>within</em> a run, and runs from different harnesses and
      models have no common absolute scale.</p>
    <div class="scroll">
      <table>
        <tr><th>Run</th><th>Harness</th><th>Model</th><th class="num">n8n-as-code</th><th class="num">Native MCP</th></tr>
${runRows}
      </table>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2>How contamination is prevented</h2>
    <ul class="notes">
      <li><strong>Sequenced, not parallel.</strong> One branch builds alone, is audited, and its workflow is deleted from the instance before the other is dispatched.</li>
      <li><strong>Opaque names.</strong> Each branch gets an unguessable token, never a shared predictable format that would let the two workflows recognise each other.</li>
      <li><strong>Fixed, archived prompt.</strong> The builder prompt is the confinement block plus the verbatim brief; the orchestrator adds nothing, and the exact text is written to disk before dispatch.</li>
      <li><strong>No rubric in the sandbox.</strong> An agent that can read how it is graded optimises for the grader.</li>
    </ul>
  </div>
</section>

<section>
  <div class="wrap">
    <h2>Limits</h2>
    <ul class="notes">
      <li>${n === 1
        ? '<strong>One run.</strong> Every figure on this page comes from a single pair of builds, so none of the gaps are separated from run-to-run variance.'
        : `<strong>${n} runs.</strong> Gaps smaller than the spread between runs are not resolved.`}</li>
      <li>Correctness is a tie whenever both branches deploy a valid workflow that covers the brief, in which case the ranking is decided by the cost axes alone.</li>
      <li><strong>Ambition is not measured.</strong> Correctness asks whether a workflow works and covers the brief. Whether it is elegant or inventive is a separate judgement, not implemented.</li>
      <li>Runs from different harnesses and models are not numerically comparable to each other; only the two branches within a run are.</li>
    </ul>
  </div>
</section>

<footer>
  <div class="wrap">
    Latest run: <code>${esc(latest?.metadata?.run || '?')}</code> ·
    <a href="https://github.com/EtienneLescot/n8n-harness-benchmark/tree/main/results/history">full reports, server audits and deployed workflows</a> ·
    <a href="https://github.com/EtienneLescot/n8n-harness-benchmark">repository</a> ·
    <a href="https://github.com/EtienneLescot/n8n-as-code">n8n-as-code</a>
  </div>
</footer>

</body>
</html>
`;
}

const runs = loadRuns();
if (runs.length === 0) {
    console.error('No runs found under results/history/*/benchmark_results.json');
    process.exit(1);
}
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, render(runs), 'utf8');
console.log(`docs/index.html generated from ${runs.length} run(s): ${runs.map((r) => r.metadata?.run).join(', ')}`);
