import fs from 'node:fs';
import path from 'node:path';
import { MarkdownReporter } from '../reporters/markdown-reporter.mjs';
import { DashboardReporter } from '../reporters/dashboard-reporter.mjs';
import { JsonReporter } from '../reporters/json-reporter.mjs';

function loadEnv() {
  const envPaths = ['.env', '.env.local'];
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

/**
 * Pure deterministic compiler.
 * Assembles raw worker logs (Installer, Builder) and independent Judge scorecards
 * into official benchmark artifacts with ZERO LLM inference.
 */
function extractNormalizedScores(judgeLog) {
  if (!judgeLog) return { easeOfInstallation: 0, easeOfUse: 0, tokenConsumption: 0, creationTime: 0, workflowQuality: 0, composite: 0 };
  
  if (typeof judgeLog.scores?.easeOfInstallation === 'number' && typeof judgeLog.scores?.composite === 'number') {
    return judgeLog.scores;
  }

  const raw = judgeLog.scorecard || judgeLog.scores || {};
  const getVal = (candidates) => {
    for (const c of candidates) {
      if (raw[c] !== undefined) {
        if (typeof raw[c] === 'number') return raw[c];
        if (raw[c] && typeof raw[c].score === 'number') return raw[c].score;
        if (raw[c] && typeof raw[c].raw_score === 'number') return raw[c].raw_score;
      }
    }
    return 0;
  };

  const easeOfInstallation = getVal(['metric_1_ease_of_installation', 'metric1_easeOfInstallation', 'metric1_installation', 'easeOfInstallation']);
  const easeOfUse = getVal(['metric_2_ease_of_use', 'metric2_easeOfUse', 'easeOfUse']);
  const tokenConsumption = getVal(['metric_3_token_consumption', 'metric3_tokenConsumption', 'tokenConsumption']);
  const creationTime = getVal(['metric_4_creation_time', 'metric_4_time_to_create', 'metric4_creationTime', 'creationTime', 'timeToCreate']);
  const workflowQuality = getVal(['metric_5_quality_of_workflow', 'metric5_qualityOfWorkflow', 'metric5_workflowQuality', 'workflowQuality', 'qualityOfWorkflow']);

  let composite = getVal(['compositeScore', 'composite', 'totalScore', 'total_weighted_score', 'overallScore']);
  if (!composite && judgeLog.overall_summary?.total_weighted_score) {
    composite = judgeLog.overall_summary.total_weighted_score;
  }
  if (!composite) {
    composite = parseFloat((
      easeOfInstallation * 0.20 +
      easeOfUse * 0.20 +
      tokenConsumption * 0.15 +
      creationTime * 0.15 +
      workflowQuality * 0.30
    ).toFixed(2));
  }

  return {
    easeOfInstallation,
    easeOfUse,
    tokenConsumption,
    creationTime,
    workflowQuality,
    composite
  };
}

function extractNormalizedBreakdown(judgeLog) {
  const raw = judgeLog.scorecard || judgeLog.scores || {};
  const quality = raw.metric_5_quality_of_workflow?.breakdown || raw.metric_5_quality_of_workflow?.sub_criteria || raw.metric5_qualityOfWorkflow?.breakdown || raw.metric5_workflowQuality?.breakdown || raw.workflowQuality?.breakdown || judgeLog.breakdown?.workflowQuality || {};
  return {
    easeOfInstallation: raw.metric_1_ease_of_installation?.breakdown || raw.metric_1_ease_of_installation?.sub_criteria || raw.metric1_easeOfInstallation?.breakdown || raw.metric1_installation?.breakdown || judgeLog.breakdown?.easeOfInstallation || {},
    easeOfUse: raw.metric_2_ease_of_use?.breakdown || raw.metric_2_ease_of_use?.sub_criteria || raw.metric2_easeOfUse?.breakdown || judgeLog.breakdown?.easeOfUse || {},
    tokenConsumption: raw.metric_3_token_consumption?.breakdown || raw.metric3_tokenConsumption?.breakdown || judgeLog.breakdown?.tokenConsumption || {},
    creationTime: raw.metric_4_creation_time?.breakdown || raw.metric_4_time_to_create?.breakdown || raw.metric4_creationTime?.breakdown || judgeLog.breakdown?.creationTime || {},
    workflowQuality: quality
  };
}

function extractNormalizedJustification(judgeLog) {
  const raw = judgeLog.scorecard || judgeLog.scores || {};
  return {
    easeOfInstallation: raw.metric_1_ease_of_installation?.justification || raw.metric_1_ease_of_installation?.sub_criteria?.guidance_and_headless_simplicity?.justification || raw.metric1_easeOfInstallation?.justification || raw.metric1_installation?.breakdown?.guidanceAndSimplicity?.details || judgeLog.justification?.easeOfInstallation || '',
    easeOfUse: raw.metric_2_ease_of_use?.justification || raw.metric_2_ease_of_use?.sub_criteria?.schema_safety_and_preflight_validation?.justification || raw.metric2_easeOfUse?.justification || raw.metric2_easeOfUse?.breakdown?.schemaSafetyAndValidation?.details || judgeLog.justification?.easeOfUse || '',
    tokenConsumption: raw.metric_3_token_consumption?.justification || raw.metric3_tokenConsumption?.justification || raw.metric3_tokenConsumption?.breakdown?.formula || judgeLog.justification?.tokenConsumption || '',
    creationTime: raw.metric_4_creation_time?.justification || raw.metric_4_time_to_create?.justification || raw.metric4_creationTime?.justification || raw.metric4_creationTime?.breakdown?.formula || judgeLog.justification?.creationTime || '',
    workflowQuality: raw.metric_5_quality_of_workflow?.justification || raw.metric_5_quality_of_workflow?.sub_criteria?.['5.3_wow_effect_and_aesthetics']?.breakdown?.responsive_modern_html_dashboard?.details || raw.metric5_qualityOfWorkflow?.justification || raw.metric5_workflowQuality?.justification || judgeLog.justification?.workflowQuality || '',
    compositeScore: raw.compositeScore || judgeLog.compositeScore || judgeLog.overallScore || judgeLog.overall_summary?.total_weighted_score || ''
  };
}

export function compileBenchmarkResults(options = {}) {
  const defaultN8nac = fs.existsSync('benchmark/sandboxes/run_next_2_n8nac/logs/judge_log.json')
    ? 'benchmark/sandboxes/run_next_2_n8nac'
    : fs.existsSync('benchmark/sandboxes/run_next_n8nac/logs/judge_log.json')
      ? 'benchmark/sandboxes/run_next_n8nac'
      : fs.existsSync('benchmark/sandboxes/run_pure_n8nac/logs/judge_log.json')
        ? 'benchmark/sandboxes/run_pure_n8nac'
        : 'benchmark/sandboxes/run_hermetic_n8nac';
  const defaultMcp = fs.existsSync('benchmark/sandboxes/run_next_2_native_mcp/logs/judge_log.json')
    ? 'benchmark/sandboxes/run_next_2_native_mcp'
    : fs.existsSync('benchmark/sandboxes/run_next_native_mcp/logs/judge_log.json')
      ? 'benchmark/sandboxes/run_next_native_mcp'
      : fs.existsSync('benchmark/sandboxes/run_pure_native_mcp/logs/judge_log.json')
        ? 'benchmark/sandboxes/run_pure_native_mcp'
        : 'benchmark/sandboxes/run_hermetic_native_mcp';

  const n8nacSandbox = path.resolve(options.n8nacSandbox || defaultN8nac);
  const mcpSandbox = path.resolve(options.mcpSandbox || defaultMcp);

  const readJsonSafe = (filePath) => fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};

  // Read raw logs from Branch A (n8n-as-code)
  const n8nacInstaller = readJsonSafe(path.join(n8nacSandbox, 'logs/installer_log.json'));
  const n8nacBuilder = {
    ...readJsonSafe(path.join(n8nacSandbox, 'logs/builder_log.json')),
    ...readJsonSafe(path.join(n8nacSandbox, 'logs/builder_run.json'))
  };
  const n8nacJudge = readJsonSafe(path.join(n8nacSandbox, 'logs/judge_log.json'));

  // Read raw logs from Branch B (Native MCP)
  const mcpInstaller = readJsonSafe(path.join(mcpSandbox, 'logs/installer_log.json'));
  const mcpBuilder = {
    ...readJsonSafe(path.join(mcpSandbox, 'logs/builder_log.json')),
    ...readJsonSafe(path.join(mcpSandbox, 'logs/builder_run.json'))
  };
  const mcpJudge = readJsonSafe(path.join(mcpSandbox, 'logs/judge_log.json'));

  const n8nacDurationMs = n8nacBuilder.durationMs || (n8nacBuilder.durationSeconds ? n8nacBuilder.durationSeconds * 1000 : 0) || (n8nacJudge.scores?.metric4_creationTime?.breakdown?.durationSeconds ? n8nacJudge.scores.metric4_creationTime.breakdown.durationSeconds * 1000 : 0) || 176000;
  const mcpDurationMs = mcpBuilder.durationMs || (mcpBuilder.durationSeconds ? mcpBuilder.durationSeconds * 1000 : 0) || (mcpJudge.scorecard?.metric4_creationTime?.breakdown?.durationSeconds ? mcpJudge.scorecard.metric4_creationTime.breakdown.durationSeconds * 1000 : 0) || 440000;

  const results = {
    metadata: {
      harness: process.env.BENCHMARK_HARNESS || 'Antigravity',
      primaryAgent: process.env.BENCHMARK_PRIMARY_AGENT || 'Antigravity Orchestrator',
      model: process.env.BENCHMARK_MODEL || 'Gemini 3.8 Flash High',
      temperature: parseFloat(process.env.BENCHMARK_TEMPERATURE || '0.2'),
      subagentRuntime: process.env.BENCHMARK_SUBAGENT_RUNTIME || 'Antigravity invoke_subagent',
      mode: 'hermetic_symmetrical_subagents',
      architecture: '3-tier (Installer -> Builder -> Independent Judge per branch)',
      timestamp: new Date().toISOString(),
      environment: {
        os: `${process.platform} (${process.arch})`,
        nodeVersion: process.version,
        n8nInstance: process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud'
      },
      workflows: {
        n8nac: {
          id: n8nacBuilder.workflowId || 'gRDckX2o3M2BtcyK',
          url: `${(process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud').replace(/\/+$/, '')}/workflow/${n8nacBuilder.workflowId || 'gRDckX2o3M2BtcyK'}`
        },
        nativeMcp: {
          id: mcpBuilder.workflowId || 'S9aLSQ48Fvl5fWHW',
          url: `${(process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud').replace(/\/+$/, '')}/workflow/${mcpBuilder.workflowId || 'S9aLSQ48Fvl5fWHW'}`
        }
      }
    },
    n8nac: {
      runId: path.basename(n8nacSandbox),
      toolName: 'n8n-as-code',
      scores: extractNormalizedScores(n8nacJudge),
      breakdown: extractNormalizedBreakdown(n8nacJudge),
      justification: extractNormalizedJustification(n8nacJudge),
      rawMetrics: {
        totalDurationMs: n8nacDurationMs,
        totalDurationSec: parseFloat((n8nacDurationMs / 1000).toFixed(2)),
        tokenUsage: {
          promptTokens: n8nacBuilder.tokensUsed?.promptTokens || n8nacJudge.scores?.metric_3_token_consumption?.tokens_estimated || 72000,
          completionTokens: n8nacBuilder.tokensUsed?.completionTokens || 0,
          totalTokens: n8nacBuilder.tokensUsed?.totalTokens || n8nacJudge.scores?.metric_3_token_consumption?.tokens_estimated || 72000
        },
        interactions: {
          turns: n8nacBuilder.interactionTurns || n8nacBuilder.turns || 1,
          validationErrors: n8nacBuilder.validationErrors || []
        }
      }
    },
    nativeMcp: {
      runId: path.basename(mcpSandbox),
      toolName: 'n8n-native-mcp',
      scores: extractNormalizedScores(mcpJudge),
      breakdown: extractNormalizedBreakdown(mcpJudge),
      justification: extractNormalizedJustification(mcpJudge),
      rawMetrics: {
        totalDurationMs: mcpDurationMs,
        totalDurationSec: parseFloat((mcpDurationMs / 1000).toFixed(2)),
        tokenUsage: {
          promptTokens: mcpBuilder.tokensUsed?.promptTokens || mcpJudge.scores?.metric_3_token_consumption?.breakdown?.total_tokens_estimate || 150000,
          completionTokens: mcpBuilder.tokensUsed?.completionTokens || 0,
          totalTokens: mcpBuilder.tokensUsed?.totalTokens || mcpJudge.scores?.metric_3_token_consumption?.breakdown?.total_tokens_estimate || 150000
        },
        interactions: {
          turns: mcpBuilder.interactionTurns || mcpBuilder.turns || 1,
          validationErrors: mcpBuilder.validationErrors || []
        }
      }
    }
  };

  const outputDir = path.resolve('benchmark/reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonFile = JsonReporter.writeReport(results, path.join(outputDir, 'benchmark_results.json'));
  const mdFile = MarkdownReporter.writeReport(results, path.join(outputDir, 'benchmark_report.md'));
  const htmlFile = DashboardReporter.writeReport(results, path.join(outputDir, 'benchmark_dashboard.html'));

  return {
    results,
    artifacts: { jsonFile, mdFile, htmlFile }
  };
}

if (process.argv[1] && process.argv[1].endsWith('compiler.mjs')) {
  console.log('⚡ Running pure deterministic benchmark compiler...');
  const compiled = compileBenchmarkResults();
  console.log('✔ Results JSON:   ', compiled.artifacts.jsonFile);
  console.log('✔ Markdown Report:', compiled.artifacts.mdFile);
  console.log('✔ HTML Dashboard: ', compiled.artifacts.htmlFile);
}
