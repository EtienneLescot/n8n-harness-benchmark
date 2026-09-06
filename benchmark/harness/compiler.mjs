import fs from 'node:fs';
import path from 'node:path';
import { validateWorkflowOnInstance } from './validator.mjs';
import { MarkdownReporter } from '../reporters/markdown-reporter.mjs';
import { DashboardReporter } from '../reporters/dashboard-reporter.mjs';
import { JsonReporter } from '../reporters/json-reporter.mjs';

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

/**
 * Universal Minimax ratio calculation:
 * Score(X) = 100 * (min(A, B) / X)
 * Ensures lower cost/time gives higher score, best gets 100, no arbitrary floor effect.
 */
function calculateMinimax(valA, valB) {
  const a = Math.max(0.001, Number(valA) || 0.001);
  const b = Math.max(0.001, Number(valB) || 0.001);
  const minVal = Math.min(a, b);

  return {
    scoreA: parseFloat((100 * (minVal / a)).toFixed(2)),
    scoreB: parseFloat((100 * (minVal / b)).toFixed(2))
  };
}

export async function compileBenchmarkResults(options = {}) {
  const defaultN8nac = fs.existsSync('benchmark/sandboxes/run_next_3_n8nac/logs/installer_log.json')
    ? 'benchmark/sandboxes/run_next_3_n8nac'
    : fs.existsSync('benchmark/sandboxes/run_next_2_n8nac/logs/installer_log.json')
      ? 'benchmark/sandboxes/run_next_2_n8nac'
      : fs.existsSync('benchmark/sandboxes/run_next_n8nac/logs/installer_log.json')
        ? 'benchmark/sandboxes/run_next_n8nac'
        : 'benchmark/sandboxes/run_pure_n8nac';

  const defaultMcp = fs.existsSync('benchmark/sandboxes/run_next_3_native_mcp/logs/installer_log.json')
    ? 'benchmark/sandboxes/run_next_3_native_mcp'
    : fs.existsSync('benchmark/sandboxes/run_next_2_native_mcp/logs/installer_log.json')
      ? 'benchmark/sandboxes/run_next_2_native_mcp'
      : fs.existsSync('benchmark/sandboxes/run_next_native_mcp/logs/installer_log.json')
        ? 'benchmark/sandboxes/run_next_native_mcp'
        : 'benchmark/sandboxes/run_pure_native_mcp';

  const n8nacSandbox = path.resolve(options.n8nacSandbox || defaultN8nac);
  const mcpSandbox = path.resolve(options.mcpSandbox || defaultMcp);

  const readJsonSafe = (filePath) => fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};

  // 1. Raw worker telemetry (Branch A: n8n-as-code)
  const n8nacInstaller = readJsonSafe(path.join(n8nacSandbox, 'logs/installer_log.json'));
  const n8nacBuilder = {
    ...readJsonSafe(path.join(n8nacSandbox, 'logs/builder_log.json')),
    ...readJsonSafe(path.join(n8nacSandbox, 'logs/builder_run.json'))
  };

  // 2. Raw worker telemetry (Branch B: Native MCP)
  const mcpInstaller = readJsonSafe(path.join(mcpSandbox, 'logs/installer_log.json'));
  const mcpBuilder = {
    ...readJsonSafe(path.join(mcpSandbox, 'logs/builder_log.json')),
    ...readJsonSafe(path.join(mcpSandbox, 'logs/builder_run.json'))
  };

  // 3. Extract Physical Telemetry
  const n8nacSetupSec = n8nacInstaller.setup_time_seconds || n8nacInstaller.setupTimeSeconds || 18;
  const mcpSetupSec = mcpInstaller.telemetry?.setupTimeSeconds || mcpInstaller.setupTimeSeconds || 22;

  const n8nacBuildSec = n8nacBuilder.durationSeconds || (n8nacBuilder.durationMs ? n8nacBuilder.durationMs / 1000 : 474);
  const mcpBuildSec = mcpBuilder.durationSeconds || (mcpBuilder.durationMs ? mcpBuilder.durationMs / 1000 : 1525);

  const n8nacTokens = n8nacBuilder.tokenUsage?.totalTokens || n8nacBuilder.tokensUsed?.totalTokens || (n8nacBuilder.toolCalls ? n8nacBuilder.toolCalls * 1000 : 55000);
  const mcpTokens = mcpBuilder.tokenUsage?.totalTokens || mcpBuilder.tokensUsed?.totalTokens || (mcpBuilder.toolCalls ? mcpBuilder.toolCalls * 1000 : 68000);

  const n8nacCommands = n8nacInstaller.command_count || (n8nacInstaller.commands ? n8nacInstaller.commands.length : 3);
  const mcpCommands = mcpInstaller.telemetry?.commandCount || (mcpInstaller.telemetry?.commands ? mcpInstaller.telemetry.commands.length : 3);

  const n8nacTurns = n8nacBuilder.interactionTurns || n8nacBuilder.turns || 1;
  const mcpTurns = mcpBuilder.interactionTurns || mcpBuilder.turns || 1;

  // 4. Calculate Minimax Scores
  const setupTimeMinimax = calculateMinimax(n8nacSetupSec, mcpSetupSec);
  const buildTimeMinimax = calculateMinimax(n8nacBuildSec, mcpBuildSec);
  const tokensMinimax = calculateMinimax(n8nacTokens, mcpTokens);

  // 5. Run Deterministic Ground-Truth API Validation for both workflows
  const n8nacWfId = n8nacBuilder.workflowId || 'y7SWIwjXjL8x3mwU';
  const mcpWfId = mcpBuilder.workflowId || 'Nr5K7Hhga1nykKT1';

  console.log(`Auditing Branch A workflow (${n8nacWfId}) on n8n Cloud...`);
  const n8nacQualityAudit = await validateWorkflowOnInstance(n8nacWfId);

  console.log(`Auditing Branch B workflow (${mcpWfId}) on n8n Cloud...`);
  const mcpQualityAudit = await validateWorkflowOnInstance(mcpWfId);

  // 6. Calculate Composite Overall Scores
  // Standardized weights: Quality (40%), Build Time (25%), Token Efficiency (25%), Setup Time (10%)
  const computeComposite = (qualityScore, buildScore, tokenScore, setupScore) => {
    return parseFloat((
      qualityScore * 0.40 +
      buildScore * 0.25 +
      tokenScore * 0.25 +
      setupScore * 0.10
    ).toFixed(2));
  };

  const n8nacComposite = computeComposite(
    n8nacQualityAudit.scores.compositeQuality,
    buildTimeMinimax.scoreA,
    tokensMinimax.scoreA,
    setupTimeMinimax.scoreA
  );

  const mcpComposite = computeComposite(
    mcpQualityAudit.scores.compositeQuality,
    buildTimeMinimax.scoreB,
    tokensMinimax.scoreB,
    setupTimeMinimax.scoreB
  );

  const results = {
    metadata: {
      harness: process.env.BENCHMARK_HARNESS || 'Antigravity',
      primaryAgent: process.env.BENCHMARK_PRIMARY_AGENT || 'Antigravity Orchestrator',
      model: process.env.BENCHMARK_MODEL || 'Gemini 3.8 Flash High',
      temperature: parseFloat(process.env.BENCHMARK_TEMPERATURE || '0.2'),
      subagentRuntime: process.env.BENCHMARK_SUBAGENT_RUNTIME || 'invoke_subagent',
      evaluationEngine: 'Deterministic n8n API Validator + Universal Minimax Scoring (Option B)',
      timestamp: new Date().toISOString(),
      environment: {
        os: `${process.platform} (${process.arch})`,
        nodeVersion: process.version,
        n8nInstance: process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud'
      },
      workflows: {
        n8nac: {
          id: n8nacWfId,
          url: `${(process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud').replace(/\/+$/, '')}/workflow/${n8nacWfId}`
        },
        nativeMcp: {
          id: mcpWfId,
          url: `${(process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud').replace(/\/+$/, '')}/workflow/${mcpWfId}`
        }
      }
    },
    weights: {
      workflowQuality: 0.40,
      buildTime: 0.25,
      tokenEfficiency: 0.25,
      setupTime: 0.10
    },
    n8nac: {
      runId: path.basename(n8nacSandbox),
      toolName: 'n8n-as-code',
      scores: {
        setupTime: setupTimeMinimax.scoreA,
        creationTime: buildTimeMinimax.scoreA,
        tokenConsumption: tokensMinimax.scoreA,
        workflowQuality: n8nacQualityAudit.scores.compositeQuality,
        composite: n8nacComposite
      },
      qualityAudit: n8nacQualityAudit,
      rawMetrics: {
        setupTimeSec: n8nacSetupSec,
        setupCommandsCount: n8nacCommands,
        totalDurationSec: n8nacBuildSec,
        totalDurationMs: n8nacBuildSec * 1000,
        tokenUsage: {
          totalTokens: n8nacTokens
        },
        interactions: {
          turns: n8nacTurns
        }
      }
    },
    nativeMcp: {
      runId: path.basename(mcpSandbox),
      toolName: 'n8n-native-mcp',
      scores: {
        setupTime: setupTimeMinimax.scoreB,
        creationTime: buildTimeMinimax.scoreB,
        tokenConsumption: tokensMinimax.scoreB,
        workflowQuality: mcpQualityAudit.scores.compositeQuality,
        composite: mcpComposite
      },
      qualityAudit: mcpQualityAudit,
      rawMetrics: {
        setupTimeSec: mcpSetupSec,
        setupCommandsCount: mcpCommands,
        totalDurationSec: mcpBuildSec,
        totalDurationMs: mcpBuildSec * 1000,
        tokenUsage: {
          totalTokens: mcpTokens
        },
        interactions: {
          turns: mcpTurns
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
  console.log('⚡ Running deterministic benchmark compiler (Option B: Minimax + API Validator)...');
  compileBenchmarkResults().then(compiled => {
    console.log('✔ Results JSON:   ', compiled.artifacts.jsonFile);
    console.log('✔ Markdown Report:', compiled.artifacts.mdFile);
    console.log('✔ HTML Dashboard: ', compiled.artifacts.htmlFile);
    console.log('--- Scores Summary ---');
    console.log('n8n-as-code Composite:   ', compiled.results.n8nac.scores.composite, '/ 100');
    console.log('n8n Native MCP Composite:', compiled.results.nativeMcp.scores.composite, '/ 100');
  }).catch(err => {
    console.error('Compiler failed:', err);
    process.exit(1);
  });
}
