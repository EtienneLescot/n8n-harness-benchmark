/**
 * The single definition of what a score means in this benchmark.
 *
 * Before this module the repo carried four incompatible definitions of "workflow quality"
 * (validator.mjs 60/40, SKILL.md 40/30/30, benchmark.config.json 4x25, evaluator.mjs 4x25)
 * and two composite weightings. Runs 6-9 were scored by whichever one the caller happened
 * to reach. Everything that produces a number now reads it from here.
 *
 * ZERO LLM inference: every check below is a structural read of the deployed workflow.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../config/benchmark.config.json',
);

export const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * Correctness = does it do the job (requirements), is it correct (server schema audit),
 * is it wired (graph).
 *
 * Named correctness, not quality, because it answers "does this work and does it do what
 * was asked" and nothing else. Whether a workflow is ambitious, elegant or well-composed is
 * a separate judgement that does not belong on the same axis and is not implemented here.
 *
 * Requirement coverage carries the largest share because its absence is what broke
 * run_8: a 4-node workflow with no triage and no agent scored 100/100 against a 15-node
 * one, because the old formula normalised every component by the workflow's own node
 * count. Under a self-normalising metric, doing less is free. It is not free here.
 *
 * Live execution stays out of the score: the benchmark cannot provision third-party
 * OAuth, so requiring a successful run would measure credential availability. It is
 * reported as telemetry. That exclusion is about SCORING ONLY — it is not a licence to
 * omit nodes that need credentials, which is how run_9's builders lost their agents.
 */
export const CORRECTNESS_WEIGHTS = {
    requirementCoverage: 0.40,
    nodeSchemaValidity: 0.40,
    graphIntegrity: 0.20,
};

/**
 * Composite weights across the three scored axes. Setup is not one of them — it is
 * telemetry, see SETUP_WEIGHTS below.
 *
 * Correctness and token efficiency are equal at 35 and build time takes 30: what a
 * workflow costs to produce is paid on every workflow, so the two cost axes together
 * outweigh correctness, while neither alone does.
 */
const STATED = { correctness: 35, tokenEfficiency: 35, buildTime: 30 };
const STATED_TOTAL = Object.values(STATED).reduce((a, b) => a + b, 0);
export const COMPOSITE_WEIGHTS = Object.fromEntries(
    Object.entries(STATED).map(([k, v]) => [k, parseFloat((v / STATED_TOTAL).toFixed(4))]),
);

/**
 * Setup is TELEMETRY, not a scored axis.
 *
 * Installation is paid once and amortises to nothing, while build time and tokens are paid
 * on every workflow. Scoring it let a one-off cost decide a ranking: in run_10 the setup
 * axis moved 6.07 points on a final gap of 5.54, so a cost paid once outweighed the gap it
 * was being added to. It is still measured and reported, on friction rather than seconds —
 * most of the wall clock was bandwidth and registry latency, not a product property.
 *
 * What IS a product property is what the installer ran into: dead ends (a command that
 * answered wrongly, a documented path that did not exist) are reproducible, attributable
 * to code, and fixable. Command count matters too, but less: a branch can be terse and
 * still misleading.
 *
 * Acquisition seconds are excluded outright, on BOTH branches, because both carry a
 * benchmark artefact and only one of them was ever being discounted: n8n-as-code installs
 * from local tarballs because the build under test is unpublished, and native MCP has its
 * workers hand-roll an HTTP client because the benchmark's runtime has no wired MCP client.
 * A real user of either does neither. Seconds stay in the report as telemetry.
 */
export const SETUP_WEIGHTS = { friction: 0.70, commands: 0.30 };

/**
 * How steeply a cost overage is punished. Score = 100 * e^(-DECAY * overage), so at
 * DECAY = 1.5 a branch costing 30% more scores 63.3 and one costing 50% more scores 47.2.
 */
export const DECAY = 1.5;

/**
 * Relative cost score: the cheaper branch gets 100, the other decays with how much more
 * it spent. Scale-invariant — multiply both branches by any factor and nothing moves —
 * because it reads only the ratio between them. Absolute token counts and seconds vary
 * enormously by orchestrator, so only the gap between A and B is comparable across runs.
 *
 * This replaced the plain minimax ratio (100 * min/X), which understated every overage:
 * spending 30% more scored 76.6, a 23% deficit for a 30% cost. That compression is
 * inherent to a reciprocal and it grew with the gap — doubling the cost lost only half
 * the score. Exponential decay is steeper where it matters and, unlike a straight line,
 * needs no floor: it approaches zero without reaching it, so a 2x branch and a 10x branch
 * still rank in the right order instead of both flattening to nothing.
 */
export function relativeScore(value, otherValue) {
    const a = Math.max(0.001, Number(value) || 0.001);
    const b = Math.max(0.001, Number(otherValue) || 0.001);
    const overage = a / Math.min(a, b) - 1;
    return parseFloat((100 * Math.exp(-DECAY * overage)).toFixed(2));
}

const round = (n) => parseFloat(Number(n).toFixed(2));

/** A LangChain agent node — the real node type, never a Code node someone named "... Agent". */
function isAgentNode(type) {
    const t = String(type || '').toLowerCase();
    return t.includes('langchain') && (t.includes('agent') || t.includes('chainllm'));
}

function isTriggerNode(type) {
    const t = String(type || '').toLowerCase();
    return t.includes('scheduletrigger') || t.includes('crontrigger') || t.includes('interval');
}

/** Any node that transforms data between retrieval and output: the "sorts the information" step. */
function isProcessingNode(node) {
    const t = String(node.type || '').toLowerCase();
    if (isAgentNode(t)) return true;
    return ['.code', '.function', '.functionitem', '.filter', '.sort', '.itemlists', '.switch', '.if', '.summarize', '.aggregate']
        .some((suffix) => t.endsWith(suffix));
}

/**
 * Keys by which an n8n node declares that what it emits is HTML, rather than containing
 * HTML literally: `emailType`, `contentType`, `responseContentType`, `mimeType`, `format`,
 * `respondWith`. Checked as a key/value pair, never as a substring of the whole parameter
 * blob — "html" appears inside plenty of unrelated strings.
 */
const HTML_FORMAT_KEYS = new Set([
    'emailtype', 'contenttype', 'responsecontenttype', 'mimetype', 'format', 'respondwith', 'outputformat',
]);

function declaresHtmlOutput(value) {
    if (value === null || typeof value !== 'object') return false;
    for (const [key, entry] of Object.entries(value)) {
        if (HTML_FORMAT_KEYS.has(key.toLowerCase())
            && typeof entry === 'string'
            && entry.toLowerCase().includes('html')) return true;
        if (declaresHtmlOutput(entry)) return true;
    }
    return false;
}

/**
 * The workflow presents HTML.
 *
 * Three ways, because a workflow can satisfy this without any HTML being visible in its
 * static parameters: run_10's branch A had an agent instructed to emit a dashboard and a
 * Gmail node set to `emailType: html`, so the document only exists at execution time. A
 * detector that looked for a literal `<html` scored that as a miss.
 */
function emitsHtml(node) {
    const type = String(node.type || '').toLowerCase();
    if (type.endsWith('.html')) return true;
    // A Code or Set node that writes a document is an HTML output too.
    const params = JSON.stringify(node.parameters || {}).toLowerCase();
    if (params.includes('<!doctype html') || params.includes('<html')) return true;
    return declaresHtmlOutput(node.parameters);
}

/**
 * Requirement coverage against `config.requirements.expectedCapabilities`.
 *
 * Each capability is worth an equal share and is decided on node TYPES and wiring, never
 * on names or free text: run_9's two builders both wired plain `code` nodes named
 * "Email Sorter Agent", and a name-based check would have called that a multi-agent
 * architecture. `expectedNodeTypes` in the config asks for a real langchain agent.
 */
export function scoreRequirementCoverage(workflow) {
    const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
    const connections = workflow?.connections || {};
    const types = nodes.map((n) => n.type || '');
    const has = (fragment) => types.some((t) => t.toLowerCase().includes(fragment));

    const agentNodes = nodes.filter((n) => isAgentNode(n.type));
    const hasLanguageModelPin = Object.values(connections)
        .some((group) => group && group.ai_languageModel);

    const checks = [
        {
            id: 'daily_trigger',
            label: 'Daily trigger',
            ratio: types.some(isTriggerNode) ? 1 : 0,
        },
        {
            id: 'gmail_retrieval',
            label: 'Gmail message retrieval',
            ratio: has('gmail') ? 1 : 0,
        },
        {
            id: 'calendar_retrieval',
            label: 'Google Calendar event retrieval',
            ratio: has('googlecalendar') ? 1 : 0,
        },
        {
            id: 'triage_step',
            // "sorts the information" is its own requirement, separate from HOW. A
            // workflow that pipes Gmail straight into HTML has not done it; one that
            // sorts in a Code node has, even though it used no agent. Scoring these
            // together made run_8's 4-node no-triage workflow tie with a real one.
            label: 'Information triage / sorting step',
            ratio: nodes.some(isProcessingNode) ? 1 : 0,
        },
        {
            id: 'multi_agent',
            // Partial credit is deliberate: one agent is a real, lesser answer to
            // "multi-agent", and an agent with no model pinned cannot reason at all.
            label: 'Multi-agent architecture',
            ratio: agentNodes.length >= 2 && hasLanguageModelPin ? 1
                : agentNodes.length >= 1 && hasLanguageModelPin ? 0.5
                    : agentNodes.length >= 1 ? 0.25 : 0,
        },
        {
            id: 'html_dashboard',
            label: 'HTML dashboard output',
            ratio: nodes.some(emitsHtml) ? 1 : 0,
        },
    ];

    const share = 100 / checks.length;
    const score = round(checks.reduce((sum, c) => sum + c.ratio * share, 0));

    return {
        score,
        checks: checks.map((c) => ({
            ...c,
            points: round(c.ratio * share),
            maxPoints: round(share),
        })),
        agentNodeCount: agentNodes.length,
        hasLanguageModelPin,
    };
}

/**
 * Score the setup axis for both branches at once, on friction and command count.
 *
 * Both components use the same relative-score curve as every other cost axis, so the easier branch gets
 * 100 and the other degrades proportionally. Zero friction on both sides is a tie at 100
 * rather than a division by zero — the ratio is taken on `count + 1`.
 */
export function scoreSetupEase(a, b) {
    const pair = (x, y) => {
        const [p, q] = [Number(x) + 1, Number(y) + 1];
        return [relativeScore(p, q), relativeScore(q, p)];
    };
    const [frictionA, frictionB] = pair(a.frictionCount, b.frictionCount);
    const [commandsA, commandsB] = pair(a.commandCount, b.commandCount);
    const blend = (f, c) => round(f * SETUP_WEIGHTS.friction + c * SETUP_WEIGHTS.commands);
    return {
        a: { score: blend(frictionA, commandsA), friction: frictionA, commands: commandsA },
        b: { score: blend(frictionB, commandsB), friction: frictionB, commands: commandsB },
        weights: SETUP_WEIGHTS,
    };
}

/** Combine the three correctness components under CORRECTNESS_WEIGHTS. */
export function compositeCorrectness({ requirementCoverage, nodeSchemaValidity, graphIntegrity }) {
    return round(
        (Number(requirementCoverage) || 0) * CORRECTNESS_WEIGHTS.requirementCoverage
        + (Number(nodeSchemaValidity) || 0) * CORRECTNESS_WEIGHTS.nodeSchemaValidity
        + (Number(graphIntegrity) || 0) * CORRECTNESS_WEIGHTS.graphIntegrity,
    );
}

/** Combine the four axes under COMPOSITE_WEIGHTS. Pass null for an axis this run cannot measure. */
export function compositeScore({ correctness, buildTime, tokenEfficiency }) {
    const axes = { correctness, buildTime, tokenEfficiency };
    // Guard the rename: an axis whose name is not in COMPOSITE_WEIGHTS would be silently
    // dropped and the composite would quietly renormalise without it.
    for (const key of Object.keys(axes)) {
        if (!(key in COMPOSITE_WEIGHTS)) throw new Error(`compositeScore: unknown axis "${key}"`);
    }
    const measured = Object.entries(axes).filter(([, v]) => v !== null && v !== undefined);
    // Renormalise over what was measurable rather than scoring an unobserved axis as zero,
    // and say so: run_8 and run_9 had no token telemetry and reported a partial composite.
    const totalWeight = measured.reduce((sum, [k]) => sum + COMPOSITE_WEIGHTS[k], 0);
    if (totalWeight === 0) return { score: null, partial: true, measuredAxes: [], totalWeight: 0 };
    const weighted = measured.reduce((sum, [k, v]) => sum + v * COMPOSITE_WEIGHTS[k], 0);
    return {
        score: round(weighted / totalWeight),
        partial: measured.length < Object.keys(COMPOSITE_WEIGHTS).length,
        measuredAxes: measured.map(([k]) => k),
        totalWeight: round(totalWeight),
    };
}
