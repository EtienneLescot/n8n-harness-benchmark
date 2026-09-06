import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates an executive Markdown benchmark report comparing n8n-as-code and Native MCP.
 */
export class MarkdownReporter {
  static generateReport(results) {
    const { n8nac, nativeMcp, metadata = {} } = results;

    const n8nacScore = n8nac?.scores || {};
    const mcpScore = nativeMcp?.scores || {};

    const winner = (n8nacScore.composite || 0) >= (mcpScore.composite || 0)
      ? 'n8n-as-code'
      : 'n8n Native MCP';

    return `# Benchmark Report: n8n-as-code vs. n8n Native MCP

## ⚙️ Execution Environment & Manifest

| Dimension | Specification |
|---|---|
| **Orchestrating Harness** | **${metadata.harness || 'Antigravity'}** |
| **Primary Agent** | ${metadata.primaryAgent || 'Antigravity Orchestrator'} |
| **Subagent Model** | **${metadata.model || 'Gemini 3.8 Flash High'}** |
| **Temperature** | \`${metadata.temperature ?? 0.2}\` |
| **Subagent Runtime** | \`${metadata.subagentRuntime || 'invoke_subagent'}\` |
| **Evaluation Mode** | Double-Blind Symmetrical (One independent judge per branch) |
| **Host Platform** | ${metadata.environment?.os || process.platform} (${metadata.environment?.arch || process.arch}) / Node ${metadata.environment?.nodeVersion || process.version} |
| **Target n8n Instance** | \`${metadata.environment?.n8nInstance || metadata.instanceUrl || 'Cloud'}\` |
| **Timestamp** | \`${metadata.timestamp || new Date().toISOString()}\` |

**Standardized Prompt:**  
> *"build a multi agent n8n workflow to check daily Google mails and calendar, triage data, and present an html dashboard of the day"*

---

## 🏆 Executive Summary

| Evaluated Metric | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Ease of Installation** | 20% | **${n8nacScore.easeOfInstallation ?? 'N/A'}/100** | **${mcpScore.easeOfInstallation ?? 'N/A'}/100** | ${getAdvantage(n8nacScore.easeOfInstallation, mcpScore.easeOfInstallation)} |
| **2. Ease of Use** | 20% | **${n8nacScore.easeOfUse ?? 'N/A'}/100** | **${mcpScore.easeOfUse ?? 'N/A'}/100** | ${getAdvantage(n8nacScore.easeOfUse, mcpScore.easeOfUse)} |
| **3. Token Consumption** | 15% | **${n8nacScore.tokenConsumption ?? 'N/A'}/100** | **${mcpScore.tokenConsumption ?? 'N/A'}/100** | ${getAdvantage(n8nacScore.tokenConsumption, mcpScore.tokenConsumption)} |
| **4. Creation Time** | 15% | **${n8nacScore.creationTime ?? 'N/A'}/100** | **${mcpScore.creationTime ?? 'N/A'}/100** | ${getAdvantage(n8nacScore.creationTime, mcpScore.creationTime)} |
| **5. Workflow Quality** | 30% | **${n8nacScore.workflowQuality ?? 'N/A'}/100** | **${mcpScore.workflowQuality ?? 'N/A'}/100** | ${getAdvantage(n8nacScore.workflowQuality, mcpScore.workflowQuality)} |
| **Overall Composite Score** | **100%** | **${n8nacScore.composite ?? 'N/A'}/100** | **${mcpScore.composite ?? 'N/A'}/100** | **${winner}** |

---

## 📊 Raw Telemetry & Operational Metrics

| Metric | n8n-as-code | n8n Native MCP | Delta |
|---|:---:|:---:|:---:|
| **Total Duration** | ${n8nac?.rawMetrics?.totalDurationSec ?? 0}s | ${nativeMcp?.rawMetrics?.totalDurationSec ?? 0}s | ${((n8nac?.rawMetrics?.totalDurationSec || 0) - (nativeMcp?.rawMetrics?.totalDurationSec || 0)).toFixed(1)}s |
| **Prompt Tokens** | ${n8nac?.rawMetrics?.tokenUsage?.promptTokens ?? 0} | ${nativeMcp?.rawMetrics?.tokenUsage?.promptTokens ?? 0} | ${(n8nac?.rawMetrics?.tokenUsage?.promptTokens || 0) - (nativeMcp?.rawMetrics?.tokenUsage?.promptTokens || 0)} |
| **Completion Tokens** | ${n8nac?.rawMetrics?.tokenUsage?.completionTokens ?? 0} | ${nativeMcp?.rawMetrics?.tokenUsage?.completionTokens ?? 0} | ${(n8nac?.rawMetrics?.tokenUsage?.completionTokens || 0) - (nativeMcp?.rawMetrics?.tokenUsage?.completionTokens || 0)} |
| **Total Tokens** | **${n8nac?.rawMetrics?.tokenUsage?.totalTokens ?? 0}** | **${nativeMcp?.rawMetrics?.tokenUsage?.totalTokens ?? 0}** | **${(n8nac?.rawMetrics?.tokenUsage?.totalTokens || 0) - (nativeMcp?.rawMetrics?.tokenUsage?.totalTokens || 0)}** |
| **Interaction Turns** | ${n8nac?.rawMetrics?.interactions?.turns ?? 1} | ${nativeMcp?.rawMetrics?.interactions?.turns ?? 1} | ${(n8nac?.rawMetrics?.interactions?.turns || 1) - (nativeMcp?.rawMetrics?.interactions?.turns || 1)} |
| **Tool Calls Executed** | ${n8nac?.rawMetrics?.interactions?.toolCalls ?? 0} | ${nativeMcp?.rawMetrics?.interactions?.toolCalls ?? 0} | ${(n8nac?.rawMetrics?.interactions?.toolCalls || 0) - (nativeMcp?.rawMetrics?.interactions?.toolCalls || 0)} |
| **Friction / Error Events** | ${n8nac?.rawMetrics?.frictionEventsCount ?? 0} | ${nativeMcp?.rawMetrics?.frictionEventsCount ?? 0} | ${(n8nac?.rawMetrics?.frictionEventsCount || 0) - (nativeMcp?.rawMetrics?.frictionEventsCount || 0)} |

---

## 🔍 Detailed Quality Breakdown (Max 25 pts each)

### 1. Initial Brief Following
- **n8n-as-code**: ${n8nac?.evaluation?.breakdown?.briefFollowing?.score ?? 'N/A'}/25
${(n8nac?.evaluation?.breakdown?.briefFollowing?.checks || []).map(c => `  - ${c}`).join('\n')}
- **n8n Native MCP**: ${nativeMcp?.evaluation?.breakdown?.briefFollowing?.score ?? 'N/A'}/25
${(nativeMcp?.evaluation?.breakdown?.briefFollowing?.checks || []).map(c => `  - ${c}`).join('\n')}

### 2. Nodes Correctness & Wiring
- **n8n-as-code**: ${n8nac?.evaluation?.breakdown?.nodesCorrectness?.score ?? 'N/A'}/25
${(n8nac?.evaluation?.breakdown?.nodesCorrectness?.checks || []).map(c => `  - ${c}`).join('\n')}
- **n8n Native MCP**: ${nativeMcp?.evaluation?.breakdown?.nodesCorrectness?.score ?? 'N/A'}/25
${(nativeMcp?.evaluation?.breakdown?.nodesCorrectness?.checks || []).map(c => `  - ${c}`).join('\n')}

### 3. Wow Effect & Aesthetics
- **n8n-as-code**: ${n8nac?.evaluation?.breakdown?.wowEffect?.score ?? 'N/A'}/25
${(n8nac?.evaluation?.breakdown?.wowEffect?.checks || []).map(c => `  - ${c}`).join('\n')}
- **n8n Native MCP**: ${nativeMcp?.evaluation?.breakdown?.wowEffect?.score ?? 'N/A'}/25
${(nativeMcp?.evaluation?.breakdown?.wowEffect?.checks || []).map(c => `  - ${c}`).join('\n')}

### 4. Workflow Execution & Dry-Run
- **n8n-as-code**: ${n8nac?.evaluation?.breakdown?.workflowExecution?.score ?? 'N/A'}/25
${(n8nac?.evaluation?.breakdown?.workflowExecution?.checks || []).map(c => `  - ${c}`).join('\n')}
- **n8n Native MCP**: ${nativeMcp?.evaluation?.breakdown?.workflowExecution?.score ?? 'N/A'}/25
${(nativeMcp?.evaluation?.breakdown?.workflowExecution?.checks || []).map(c => `  - ${c}`).join('\n')}

---

## 💡 Qualitative Analysis & Observations

### n8n-as-code
- **Strengths**: Local offline validation catches parameter schema violations and pin errors *before* pushing to the instance. Allows version control (GitOps) and code diffs.
- **Trade-offs**: Requires initial workspace setup (\`n8nac env add\` / \`n8nac env auth set\`).

### n8n Native MCP
- **Strengths**: Direct remote mutation without local repo footprint. Native integration into n8n server UI.
- **Trade-offs**: Requires instance-level MCP configuration and token management; errors are only discovered upon API rejection rather than local pre-flight linting.

---
*Report generated automatically by Antigravity Benchmark Harness Framework.*
`;
  }

  static writeReport(results, outputPath = './benchmark/reports/benchmark_report.md') {
    const content = this.generateReport(results);
    const resolvedPath = path.resolve(outputPath);
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, content, 'utf8');
    return resolvedPath;
  }
}

function getAdvantage(scoreA, scoreB) {
  if (scoreA === undefined || scoreB === undefined) return 'N/A';
  if (scoreA > scoreB) return `+${scoreA - scoreB} pts n8n-as-code`;
  if (scoreB > scoreA) return `+${scoreB - scoreA} pts Native MCP`;
  return 'Tie';
}
