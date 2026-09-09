/**
 * Offline scoring for a workflow JSON file that has not been deployed.
 *
 * This used to be a second, independent scoring system: its own brief-following checks, an
 * "aesthetics" score computed by searching the raw text for the substring "card", and an
 * unconditional +8 for "node parameters follow n8n schema standards" awarded without
 * looking at any schema. It disagreed with `validator.mjs`, with `EVALUATION_RUBRIC.md`
 * and with `benchmark.config.json`, and a benchmark that advertises "zero subjective
 * judges" cannot keep a subjective one behind a substring match.
 *
 * It is now a thin offline view of the one scorer in `scoring.mjs`. Node schema validity
 * needs the live server RPC, so it is absent here and the quality figure is explicitly
 * partial — use `npm run validate <workflowId>` for the scored number.
 */

import { scoreRequirementCoverage, CORRECTNESS_WEIGHTS } from './scoring.mjs';

/** Orphan detection, same rule as validator.mjs: a trigger needs an outgoing edge, others need any edge. */
function graphIntegrity(workflow) {
    const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
    const connections = workflow?.connections || {};
    const functional = nodes.filter((n) => !String(n.type || '').toLowerCase().includes('stickynote'));
    if (functional.length === 0) return { score: 100, orphanedNodes: [] };

    const outgoing = new Set(Object.keys(connections));
    const incoming = new Set();
    for (const group of Object.values(connections)) {
        for (const targets of Object.values(group || {})) {
            for (const bundle of targets || []) {
                for (const target of bundle || []) incoming.add(target.node);
            }
        }
    }

    const orphaned = functional.filter((n) => {
        const type = String(n.type || '').toLowerCase();
        const isTrigger = (type.includes('trigger') || type.endsWith('.webhook')) && !type.includes('respond');
        if (isTrigger) return !outgoing.has(n.name);
        return !incoming.has(n.name) && !outgoing.has(n.name);
    });

    return {
        score: parseFloat((((functional.length - orphaned.length) / functional.length) * 100).toFixed(2)),
        orphanedNodes: orphaned.map((n) => n.name),
    };
}

export class WorkflowEvaluator {
    /** Accepts a workflow object or a JSON string. */
    async evaluate(workflowInput) {
        let workflow = null;
        if (typeof workflowInput === 'string') {
            try {
                workflow = JSON.parse(workflowInput);
            } catch {
                return {
                    partial: true,
                    error: 'Not parseable as workflow JSON. Offline evaluation needs the exported n8n JSON, not TypeScript source.',
                };
            }
        } else {
            workflow = workflowInput;
        }

        const coverage = scoreRequirementCoverage(workflow);
        const graph = graphIntegrity(workflow);
        const measuredWeight = CORRECTNESS_WEIGHTS.requirementCoverage + CORRECTNESS_WEIGHTS.graphIntegrity;
        const partialCorrectness = parseFloat((
            (coverage.score * CORRECTNESS_WEIGHTS.requirementCoverage
                + graph.score * CORRECTNESS_WEIGHTS.graphIntegrity) / measuredWeight
        ).toFixed(2));

        return {
            partial: true,
            partialCorrectness,
            missingComponent: 'nodeSchemaValidity (needs the live validate_node_config RPC — run `npm run validate <workflowId>`)',
            scores: {
                requirementCoverage: coverage.score,
                graphIntegrity: graph.score,
            },
            metrics: {
                nodeCount: Array.isArray(workflow?.nodes) ? workflow.nodes.length : 0,
                agentNodeCount: coverage.agentNodeCount,
                orphanedNodes: graph.orphanedNodes,
            },
            requirementChecks: coverage.checks,
            correctnessWeights: CORRECTNESS_WEIGHTS,
            summary: `Partial correctness ${partialCorrectness}/100 (coverage ${coverage.score}, graph ${graph.score}; node validity not measured offline)`,
        };
    }
}
