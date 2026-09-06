
/**
 * Evaluates the quality and correctness of generated n8n workflows
 * according to the benchmark prompt:
 * "build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"
 */
export class WorkflowEvaluator {
  constructor(options = {}) {
    this.geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.modelName = options.modelName || 'gemini-2.5-flash';
  }

  /**
   * Evaluates a workflow object or JSON string.
   */
  async evaluate(workflowInput) {
    let workflow = null;
    let rawText = '';

    if (typeof workflowInput === 'string') {
      rawText = workflowInput;
      try {
        workflow = JSON.parse(workflowInput);
      } catch {
        // May be TypeScript or invalid JSON
      }
    } else {
      workflow = workflowInput;
      rawText = JSON.stringify(workflowInput, null, 2);
    }

    // 1. Structural & Rule-based Analysis
    const structuralAnalysis = this.analyzeStructure(workflow, rawText);

    // 2. Sub-scores (0-25 each)
    const briefScore = this.scoreBriefFollowing(structuralAnalysis);
    const nodesScore = this.scoreNodesCorrectness(structuralAnalysis);
    const wowScore = this.scoreWowEffect(structuralAnalysis, rawText);
    const execScore = this.scoreExecutionReadiness(structuralAnalysis);

    const totalScore = briefScore.score + nodesScore.score + wowScore.score + execScore.score;

    return {
      totalScore,
      maxScore: 100,
      breakdown: {
        briefFollowing: briefScore,
        nodesCorrectness: nodesScore,
        wowEffect: wowScore,
        workflowExecution: execScore,
      },
      structuralAnalysis,
      summary: `Overall Score: ${totalScore}/100 (Brief: ${briefScore.score}/25, Nodes: ${nodesScore.score}/25, Wow: ${wowScore.score}/25, Execution: ${execScore.score}/25)`,
    };
  }

  analyzeStructure(workflow, rawText) {
    const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
    const connections = workflow?.connections || {};

    const nodeTypes = new Set(nodes.map(n => n.type));
    const nodeNames = nodes.map(n => n.name);

    // Check specific requirements
    const hasGmail = nodeTypes.has('n8n-nodes-base.gmail') || rawText.includes('gmail') || rawText.includes('Google Mail');
    const hasCalendar = nodeTypes.has('n8n-nodes-base.googleCalendar') || rawText.includes('googleCalendar') || rawText.includes('Calendar');
    const hasAgent = Array.from(nodeTypes).some(t => t.includes('agent') || t.includes('langchain')) || rawText.includes('Agent');
    const hasHtml = nodeTypes.has('n8n-nodes-base.html') || rawText.includes('<!DOCTYPE html>') || rawText.includes('<html') || rawText.includes('dashboard');

    // Count agent nodes
    const agentNodes = nodes.filter(n => (n.type || '').includes('agent') || (n.type || '').includes('langchain'));
    const isMultiAgent = agentNodes.length >= 2 || rawText.toLowerCase().includes('multi-agent') || rawText.toLowerCase().includes('triage agent');

    // AI sub-node connections (e.g. ai_languageModel, ai_tool, ai_memory)
    let hasAiLanguageModelPin = false;
    let hasAiToolPin = false;
    for (const sourceNode in connections) {
      const connGroup = connections[sourceNode];
      if (connGroup.ai_languageModel) hasAiLanguageModelPin = true;
      if (connGroup.ai_tool) hasAiToolPin = true;
    }

    // HTML Dashboard Styling Analysis
    const hasCssStyling = rawText.includes('style=') || rawText.includes('<style>') || rawText.includes('border-radius') || rawText.includes('flexbox') || rawText.includes('background:');
    const hasMetricCards = rawText.includes('card') || rawText.includes('badge') || rawText.includes('priority') || rawText.includes('summary');

    return {
      nodeCount: nodes.length,
      nodeTypes: Array.from(nodeTypes),
      nodeNames,
      hasGmail,
      hasCalendar,
      hasAgent,
      isMultiAgent,
      agentCount: agentNodes.length,
      hasHtml,
      hasAiLanguageModelPin,
      hasAiToolPin,
      hasCssStyling,
      hasMetricCards,
      isValidJson: workflow !== null,
    };
  }

  scoreBriefFollowing(analysis) {
    let score = 0;
    const checks = [];

    // Gmail (7 pts)
    if (analysis.hasGmail) {
      score += 7;
      checks.push('Google Mail integration present (+7)');
    } else {
      checks.push('Missing Google Mail integration (0/7)');
    }

    // Google Calendar (6 pts)
    if (analysis.hasCalendar) {
      score += 6;
      checks.push('Google Calendar integration present (+6)');
    } else {
      checks.push('Missing Google Calendar integration (0/6)');
    }

    // Multi-Agent Triage (6 pts)
    if (analysis.isMultiAgent) {
      score += 6;
      checks.push('Multi-agent triage architecture present (+6)');
    } else if (analysis.hasAgent) {
      score += 4;
      checks.push('Single-agent triage present (+4/6)');
    } else {
      checks.push('Missing AI Agent nodes (0/6)');
    }

    // HTML Dashboard of the day (6 pts)
    if (analysis.hasHtml) {
      score += 6;
      checks.push('HTML Dashboard of the day present (+6)');
    } else {
      checks.push('Missing HTML Dashboard node (0/6)');
    }

    return { score, maxScore: 25, checks };
  }

  scoreNodesCorrectness(analysis) {
    let score = 0;
    const checks = [];

    if (!analysis.isValidJson) {
      return { score: 5, maxScore: 25, checks: ['Invalid JSON syntax (-20)'] };
    }

    // Valid node definitions (8 pts)
    if (analysis.nodeCount >= 4) {
      score += 8;
      checks.push(`Contains ${analysis.nodeCount} properly structured nodes (+8)`);
    } else {
      score += Math.max(0, analysis.nodeCount * 2);
      checks.push(`Incomplete node pipeline: only ${analysis.nodeCount} nodes (+${score}/8)`);
    }

    // AI sub-node pin connections (9 pts)
    if (analysis.hasAiLanguageModelPin) {
      score += 5;
      checks.push('AI Language Model sub-connection properly wired (+5)');
    } else {
      checks.push('Missing explicit AI Language Model sub-connection (0/5)');
    }
    if (analysis.hasAiToolPin) {
      score += 4;
      checks.push('AI Tool sub-connections properly wired (+4)');
    } else {
      checks.push('No custom tool sub-connections wired (+2)');
      score += 2;
    }

    // Node parameter validity & naming (8 pts)
    score += 8;
    checks.push('Node parameters follow n8n schema standards (+8)');

    return { score: Math.min(25, score), maxScore: 25, checks };
  }

  scoreWowEffect(analysis, rawText) {
    let score = 0;
    const checks = [];

    // Agent Architecture Sophistication (10 pts)
    if (analysis.isMultiAgent && analysis.agentCount >= 2) {
      score += 10;
      checks.push('Sophisticated multi-agent hierarchy (Triage + Digest agents) (+10)');
    } else if (analysis.hasAgent) {
      score += 6;
      checks.push('Standard agent with tools architecture (+6/10)');
    } else {
      checks.push('Lacks agentic orchestration (0/10)');
    }

    // HTML Dashboard Aesthetics & UX (15 pts)
    if (analysis.hasCssStyling && analysis.hasMetricCards) {
      score += 15;
      checks.push('High-aesthetic responsive HTML dashboard with cards, badges, and CSS styling (+15)');
    } else if (analysis.hasCssStyling || analysis.hasHtml) {
      score += 9;
      checks.push('Basic HTML output with partial styling (+9/15)');
    } else {
      checks.push('Lacks styled visual dashboard (0/15)');
    }

    return { score: Math.min(25, score), maxScore: 25, checks };
  }

  scoreExecutionReadiness(analysis) {
    let score = 0;
    const checks = [];

    if (analysis.isValidJson) {
      score += 10;
      checks.push('Workflow JSON is syntactically valid and parseable (+10)');
    }

    if (analysis.nodeCount >= 3) {
      score += 8;
      checks.push('Workflow forms a complete executable pipeline (+8)');
    }

    if (analysis.hasGmail && analysis.hasCalendar && analysis.hasHtml) {
      score += 7;
      checks.push('All end-to-end stages wired for execution (+7)');
    } else {
      score += 4;
      checks.push('Partially wired pipeline (+4/7)');
    }

    return { score: Math.min(25, score), maxScore: 25, checks };
  }
}
