import fs from 'node:fs';
import path from 'node:path';
import { scoreRequirementCoverage, compositeCorrectness, CORRECTNESS_WEIGHTS } from './scoring.mjs';

function loadEnv() {
  const envPaths = ['.env', 'benchmark/sandboxes/run_next_2_native_mcp/.env', 'benchmark/sandboxes/run_next_2_n8nac/.env'];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const N8N_HOST = (process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_MCP_TOKEN = process.env.N8N_NATIVE_MCP_TOKEN || N8N_API_KEY;
const N8N_MCP_URL = process.env.N8N_NATIVE_MCP_URL || `${N8N_HOST}/mcp-server/http`;

/**
 * Deterministically audits a workflow on the live n8n cloud instance.
 * ZERO LLM inference.
 */
export async function validateWorkflowOnInstance(workflowId) {
  if (!workflowId) {
    throw new Error('workflowId is required');
  }

  // 1. Fetch workflow definition from live n8n REST API (or fallback to local archive if deleted)
  let wfData = null;
  if (fs.existsSync(workflowId)) {
    try {
      wfData = JSON.parse(fs.readFileSync(workflowId, 'utf8'));
    } catch (e) {
      throw new Error(`Invalid JSON in file ${workflowId}: ${e.message}`);
    }
  } else {
    try {
      const wfRes = await fetch(`${N8N_HOST}/api/v1/workflows/${workflowId}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      if (wfRes.ok) {
        wfData = await wfRes.json();
      }
    } catch {
      // network or fetch error, will check fallback
    }

    if (!wfData) {
      const candidates = [
        'examples/workflow_n8n_as_code_run_next2.json',
        'examples/workflow_native_mcp_run_next2.json',
        'benchmark/sandboxes/run_next_2_n8nac/workflows/deployed_workflow.json',
        'benchmark/sandboxes/run_next_2_native_mcp/workflows/deployed_workflow.json',
        'examples/workflow_n8n_as_code_run_pure.json',
        'examples/workflow_native_mcp_run_pure.json'
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(cand, 'utf8'));
            if (parsed.id === workflowId) {
              wfData = parsed;
              break;
            }
          } catch {}
        }
      }
    }
  }

  if (!wfData) {
    throw new Error(`Workflow ${workflowId} not found on n8n Cloud instance or in local archives.`);
  }

  const nodes = wfData.nodes || [];
  const connections = wfData.connections || {};

  // 2. Analyze Graph Topology & Connectivity
  const incoming = {};
  const outgoing = {};
  for (const [srcName, srcConns] of Object.entries(connections)) {
    const srcNode = nodes.find(n => n.name === srcName);
    if (!outgoing[srcName]) outgoing[srcName] = {};
    for (const [connType, targetsList] of Object.entries(srcConns)) {
      if (!outgoing[srcName][connType]) outgoing[srcName][connType] = [];
      for (const targetGroup of targetsList) {
        for (const target of targetGroup) {
          outgoing[srcName][connType].push(target.node);
          if (!incoming[target.node]) incoming[target.node] = {};
          if (!incoming[target.node][connType]) incoming[target.node][connType] = [];
          if (srcNode) incoming[target.node][connType].push(srcNode);
        }
      }
    }
  }

  // Identify orphaned / completely disconnected nodes (ignoring sticky notes)
  const functionalNodes = nodes.filter(n => !n.type.toLowerCase().includes('stickynote'));
  const orphanedNodes = functionalNodes.filter(n => {
    const isTrigger = (n.type.toLowerCase().includes('trigger') || n.type.toLowerCase().endsWith('.webhook')) && !n.type.toLowerCase().includes('respond');
    const hasIncoming = incoming[n.name] && Object.keys(incoming[n.name]).length > 0;
    const hasOutgoing = outgoing[n.name] && Object.keys(outgoing[n.name]).length > 0;
    if (isTrigger) return !hasOutgoing;
    return !hasIncoming && !hasOutgoing;
  });

  const graphIntegrityScore = functionalNodes.length > 0
    ? parseFloat((((functionalNodes.length - orphanedNodes.length) / functionalNodes.length) * 100).toFixed(2))
    : 100;

  // 3. Validate Node Configurations via server-side validate_node_config
  const isWiredAsTool = (nodeName) => {
    for (const [targetName, connMap] of Object.entries(incoming)) {
      if (connMap['ai_tool'] && connMap['ai_tool'].some(n => n.name === nodeName)) {
        return true;
      }
    }
    return false;
  };

  const nodesToValidate = nodes.map(n => {
    const item = {
      name: n.name,
      type: n.type,
      typeVersion: n.typeVersion || 1,
      parameters: n.parameters || {},
      isToolNode: isWiredAsTool(n.name) || n.type.toLowerCase().includes('tool')
    };

    if (n.type.includes('agent')) {
      const inc = incoming[n.name] || {};
      const subnodes = {};
      if (inc['ai_languageModel'] && inc['ai_languageModel'][0]) {
        subnodes.model = { type: inc['ai_languageModel'][0].type, version: inc['ai_languageModel'][0].typeVersion || 1 };
      }
      if (inc['ai_memory'] && inc['ai_memory'][0]) {
        subnodes.memory = { type: inc['ai_memory'][0].type, version: inc['ai_memory'][0].typeVersion || 1 };
      }
      if (inc['ai_tool'] && inc['ai_tool'].length > 0) {
        subnodes.tools = inc['ai_tool'].map(t => ({ type: t.type, version: t.typeVersion || 1 }));
      }
      if (Object.keys(subnodes).length > 0) {
        item.subnodes = subnodes;
      }
    }
    return item;
  });

  let nodeValidationResults = [];
  let validNodesCount = nodes.length;
  let invalidNodes = [];

  try {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'validate_node_config',
        arguments: { nodes: nodesToValidate }
      }
    };

    const mcpRes = await fetch(N8N_MCP_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + N8N_MCP_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(payload)
    });

    const text = await mcpRes.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        const parsed = JSON.parse(line.slice(6));
        const valRes = parsed.result?.structuredContent || JSON.parse(parsed.result?.content?.[0]?.text || '{}');
        nodeValidationResults = valRes.results || [];
        invalidNodes = nodeValidationResults.filter(r => !r.valid);
        validNodesCount = nodes.length - invalidNodes.length;
      }
    }
  } catch (err) {
    console.warn('validate_node_config RPC call failed, falling back to basic checks:', err.message);
  }

  // Sticky notes are annotations, not nodes the server validates, yet they sat in this
  // denominator: with one invalid node, 8/9 scores 88.89 and 9/10 scores 90.00, so pasting a
  // sticky bought free points without touching the workflow. Score over functional nodes only.
  const validFunctionalCount = functionalNodes.length - invalidNodes
    .filter(i => !String(i.type || '').toLowerCase().includes('stickynote')).length;
  const nodeValidityScore = functionalNodes.length > 0
    ? parseFloat(((validFunctionalCount / functionalNodes.length) * 100).toFixed(2))
    : 100;

  // 4. Query live execution history from GET /api/v1/executions
  let liveExecution = {
    executed: false,
    status: 'none',
    executionId: null,
    executedNodesCount: 0,
    executedNodes: [],
    durationMs: 0
  };

  try {
    const execRes = await fetch(`${N8N_HOST}/api/v1/executions?workflowId=${workflowId}&includeData=true`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    if (execRes.ok) {
      const execData = await execRes.json();
      if (execData.data && execData.data.length > 0) {
        const latest = execData.data[0];
        const runData = latest.data?.resultData?.runData || {};
        const executedNodes = Object.keys(runData);
        const started = new Date(latest.startedAt).getTime();
        const stopped = new Date(latest.stoppedAt).getTime();

        liveExecution = {
          executed: true,
          status: latest.status || 'unknown',
          executionId: latest.id,
          executedNodesCount: executedNodes.length,
          executedNodes,
          durationMs: (stopped && started) ? (stopped - started) : 0
        };
      }
    }
  } catch (err) {
    console.warn('Failed to query executions:', err.message);
  }

  const liveExecutionScore = liveExecution.status === 'success'
    ? 100
    : (liveExecution.executed ? 50 : 0);

  // 5. Requirement coverage — does the workflow do what the brief asked?
  // Node validity and graph integrity are both normalised by the workflow's own node
  // count, so under the old 60/40 formula a workflow that skipped half the brief scored
  // the same as one that did all of it: run_8 gave 100/100 to a 4-node workflow with no
  // triage against a 15-node one. Coverage is the component that is not self-normalising.
  const requirementCoverage = scoreRequirementCoverage(wfData);

  // 6. Composite Correctness Score (Deterministic, weights from scoring.mjs)
  // Live execution stays excluded: the benchmark cannot provision third-party OAuth, so
  // scoring it would measure credential availability. It is reported as telemetry below.
  const compositeCorrectnessScore = compositeCorrectness({
    requirementCoverage: requirementCoverage.score,
    nodeSchemaValidity: nodeValidityScore,
    graphIntegrity: graphIntegrityScore
  });

  return {
    workflowId,
    workflowName: wfData.name,
    // nodeCount is raw telemetry: correctness asks whether the nodes are valid and whether
    // the brief is covered, never how many nodes there are.
    metrics: {
      nodeCount: nodes.length,
      functionalNodeCount: functionalNodes.length,
      connectionCount: Object.keys(connections).length,
      orphanedNodeCount: orphanedNodes.length,
      validNodeCount: validNodesCount,
      invalidNodeCount: invalidNodes.length,
      agentNodeCount: requirementCoverage.agentNodeCount
    },
    scores: {
      requirementCoverage: requirementCoverage.score,
      nodeSchemaValidity: nodeValidityScore,
      graphIntegrity: graphIntegrityScore,
      liveExecution: liveExecutionScore,
      compositeCorrectness: compositeCorrectnessScore
    },
    correctnessWeights: CORRECTNESS_WEIGHTS,
    requirementChecks: requirementCoverage.checks,
    liveExecution,
    invalidNodes: invalidNodes.map(i => ({
      name: i.name,
      type: i.type,
      errors: i.errors || []
    })),
    timestamp: new Date().toISOString()
  };
}

if (process.argv[1] && process.argv[1].endsWith('validator.mjs')) {
  const targetId = process.argv[2] || 'y7SWIwjXjL8x3mwU';
  console.log('🔍 Running deterministic validator for workflow:', targetId);
  validateWorkflowOnInstance(targetId).then(res => {
    console.log(JSON.stringify(res, null, 2));
  }).catch(err => {
    console.error('Validation error:', err);
    process.exit(1);
  });
}
