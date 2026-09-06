import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates an executive Markdown benchmark report comparing n8n-as-code and Native MCP.
 */
function getQualitySubScore(branchData, index, keyName) {
  if (!branchData) return 'N/A';
  const q = branchData.breakdown?.workflowQuality || branchData.evaluation?.breakdown || {};
  for (const k of Object.keys(q)) {
    if (k.toLowerCase().includes(keyName.toLowerCase()) || k.includes(`${index}.`)) {
      const val = q[k];
      if (typeof val === 'number') return val;
      if (val && typeof val.total === 'number') return val.total;
      if (val && typeof val.score === 'number') return val.score;
    }
  }
  return 'N/A';
}

export class MarkdownReporter {
  static generateReport(data) {
    const { metadata = {}, n8nac, nativeMcp } = data;
    const delta = (a, b) => (typeof a === 'number' && typeof b === 'number') ? (a - b).toFixed(2) : 'N/A';

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
| **Host Platform** | ${metadata.environment?.os || process.platform} / Node ${metadata.environment?.nodeVersion || process.version} |
| **Target n8n Instance** | \`${metadata.environment?.n8nInstance || 'https://etiennel.app.n8n.cloud'}\` |
| **Timestamp** | \`${metadata.timestamp || new Date().toISOString()}\` |

**Standardized Prompt:**  
> *"Crée sur mon instance n8n un workflow multi-agents qui vérifie quotidiennement mes emails Google et mon calendrier, trie les informations et présente un dashboard HTML de la journée."*

---

## 🏆 Executive Summary

| Evaluated Metric | Weight | n8n-as-code | n8n Native MCP | Advantage |
|---|:---:|:---:|:---:|:---:|
| **1. Ease of Installation** | 20% | **${n8nac?.scores?.easeOfInstallation ?? 0}/100** | **${nativeMcp?.scores?.easeOfInstallation ?? 0}/100** | ${delta(n8nac?.scores?.easeOfInstallation, nativeMcp?.scores?.easeOfInstallation) > 0 ? `+${delta(n8nac?.scores?.easeOfInstallation, nativeMcp?.scores?.easeOfInstallation)} pts n8n-as-code` : `+${Math.abs(delta(n8nac?.scores?.easeOfInstallation, nativeMcp?.scores?.easeOfInstallation))} pts Native MCP`} |
| **2. Ease of Use** | 20% | **${n8nac?.scores?.easeOfUse ?? 0}/100** | **${nativeMcp?.scores?.easeOfUse ?? 0}/100** | ${delta(n8nac?.scores?.easeOfUse, nativeMcp?.scores?.easeOfUse) > 0 ? `+${delta(n8nac?.scores?.easeOfUse, nativeMcp?.scores?.easeOfUse)} pts n8n-as-code` : `+${Math.abs(delta(n8nac?.scores?.easeOfUse, nativeMcp?.scores?.easeOfUse))} pts Native MCP`} |
| **3. Token Consumption** | 15% | **${n8nac?.scores?.tokenConsumption ?? 0}/100** | **${nativeMcp?.scores?.tokenConsumption ?? 0}/100** | ${delta(n8nac?.scores?.tokenConsumption, nativeMcp?.scores?.tokenConsumption) > 0 ? `+${delta(n8nac?.scores?.tokenConsumption, nativeMcp?.scores?.tokenConsumption)} pts n8n-as-code` : `+${Math.abs(delta(n8nac?.scores?.tokenConsumption, nativeMcp?.scores?.tokenConsumption))} pts Native MCP`} |
| **4. Creation Time** | 15% | **${n8nac?.scores?.creationTime ?? 0}/100** | **${nativeMcp?.scores?.creationTime ?? 0}/100** | ${delta(n8nac?.scores?.creationTime, nativeMcp?.scores?.creationTime) > 0 ? `+${delta(n8nac?.scores?.creationTime, nativeMcp?.scores?.creationTime)} pts n8n-as-code` : `+${Math.abs(delta(n8nac?.scores?.creationTime, nativeMcp?.scores?.creationTime))} pts Native MCP`} |
| **5. Workflow Quality** | 30% | **${n8nac?.scores?.workflowQuality ?? 0}/100** | **${nativeMcp?.scores?.workflowQuality ?? 0}/100** | ${delta(n8nac?.scores?.workflowQuality, nativeMcp?.scores?.workflowQuality) > 0 ? `+${delta(n8nac?.scores?.workflowQuality, nativeMcp?.scores?.workflowQuality)} pts n8n-as-code` : `+${Math.abs(delta(n8nac?.scores?.workflowQuality, nativeMcp?.scores?.workflowQuality))} pts Native MCP`} |
| **Overall Composite Score** | **100%** | **${n8nac?.scores?.composite ?? 0}/100** | **${nativeMcp?.scores?.composite ?? 0}/100** | **${(n8nac?.scores?.composite ?? 0) >= (nativeMcp?.scores?.composite ?? 0) ? 'n8n-as-code' : 'n8n Native MCP'}** |

---

## 📊 Raw Telemetry & Operational Metrics

| Metric | n8n-as-code | n8n Native MCP | Delta |
|---|:---:|:---:|:---:|
| **Total Duration** | ${n8nac?.rawMetrics?.totalDurationSec ?? 'N/A'}s | ${nativeMcp?.rawMetrics?.totalDurationSec ?? 'N/A'}s | ${delta(n8nac?.rawMetrics?.totalDurationSec, nativeMcp?.rawMetrics?.totalDurationSec)}s |
| **Prompt Tokens** | ${n8nac?.rawMetrics?.tokenUsage?.promptTokens ?? 'N/A'} | ${nativeMcp?.rawMetrics?.tokenUsage?.promptTokens ?? 'N/A'} | ${delta(n8nac?.rawMetrics?.tokenUsage?.promptTokens, nativeMcp?.rawMetrics?.tokenUsage?.promptTokens)} |
| **Completion Tokens** | ${n8nac?.rawMetrics?.tokenUsage?.completionTokens ?? 'N/A'} | ${nativeMcp?.rawMetrics?.tokenUsage?.completionTokens ?? 'N/A'} | ${delta(n8nac?.rawMetrics?.tokenUsage?.completionTokens, nativeMcp?.rawMetrics?.completionTokens)} |
| **Total Tokens** | **${n8nac?.rawMetrics?.tokenUsage?.totalTokens ?? 'N/A'}** | **${nativeMcp?.rawMetrics?.tokenUsage?.totalTokens ?? 'N/A'}** | **${delta(n8nac?.rawMetrics?.tokenUsage?.totalTokens, nativeMcp?.rawMetrics?.tokenUsage?.totalTokens)}** |
| **Interaction Turns** | ${n8nac?.rawMetrics?.interactions?.turns ?? 'N/A'} | ${nativeMcp?.rawMetrics?.interactions?.turns ?? 'N/A'} | ${delta(n8nac?.rawMetrics?.interactions?.turns, nativeMcp?.rawMetrics?.interactions?.turns)} |

---

## 🔍 Detailed Quality Breakdown (Max 25 pts each)

### 1. Initial Brief Following
- **n8n-as-code**: ${getQualitySubScore(n8nac, 1, 'brief')}/25
- **n8n Native MCP**: ${getQualitySubScore(nativeMcp, 1, 'brief')}/25

### 2. Nodes Correctness & Wiring
- **n8n-as-code**: ${getQualitySubScore(n8nac, 2, 'correctness')}/25
- **n8n Native MCP**: ${getQualitySubScore(nativeMcp, 2, 'correctness')}/25

### 3. Wow Effect & Aesthetics
- **n8n-as-code**: ${getQualitySubScore(n8nac, 3, 'wow')}/25
- **n8n Native MCP**: ${getQualitySubScore(nativeMcp, 3, 'wow')}/25

### 4. Workflow Execution & Dry-Run
- **n8n-as-code**: ${getQualitySubScore(n8nac, 4, 'execution')}/25
- **n8n Native MCP**: ${getQualitySubScore(nativeMcp, 4, 'execution')}/25

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
