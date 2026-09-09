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
 * Quality = does it do the job (requirements), is it correct (server schema audit),
 * is it wired (graph).
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
export const QUALITY_WEIGHTS = {
    requirementCoverage: 0.40,
    nodeSchemaValidity: 0.40,
    graphIntegrity: 0.20,
};

/** Composite weights across the four measured axes. */
export const COMPOSITE_WEIGHTS = {
    quality: 0.40,
    buildTime: 0.25,
    tokenEfficiency: 0.25,
    setupTime: 0.10,
};

/** Universal Minimax: the better contender scores 100, the other degrades proportionally. */
export function minimax(value, otherValue) {
    const a = Math.max(0.001, Number(value) || 0.001);
    const b = Math.max(0.001, Number(otherValue) || 0.001);
    return parseFloat(((Math.min(a, b) / a) * 100).toFixed(2));
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

function emitsHtml(node) {
    const type = String(node.type || '').toLowerCase();
    if (type.endsWith('.html')) return true;
    // A Code or Set node that writes a document is an HTML output too.
    const params = JSON.stringify(node.parameters || {}).toLowerCase();
    return params.includes('<!doctype html') || params.includes('<html');
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

/** Combine the three quality components under QUALITY_WEIGHTS. */
export function compositeQuality({ requirementCoverage, nodeSchemaValidity, graphIntegrity }) {
    return round(
        (Number(requirementCoverage) || 0) * QUALITY_WEIGHTS.requirementCoverage
        + (Number(nodeSchemaValidity) || 0) * QUALITY_WEIGHTS.nodeSchemaValidity
        + (Number(graphIntegrity) || 0) * QUALITY_WEIGHTS.graphIntegrity,
    );
}

/** Combine the four axes under COMPOSITE_WEIGHTS. Pass null for an axis this run cannot measure. */
export function compositeScore({ quality, buildTime, tokenEfficiency, setupTime }) {
    const axes = { quality, buildTime, tokenEfficiency, setupTime };
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
