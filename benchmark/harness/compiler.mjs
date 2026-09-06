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
export function compileBenchmarkResults(options = {}) {
  const defaultN8nac = fs.existsSync('benchmark/sandboxes/run_pure_n8nac/logs/judge_log.json')
    ? 'benchmark/sandboxes/run_pure_n8nac'
    : 'benchmark/sandboxes/run_hermetic_n8nac';
  const defaultMcp = fs.existsSync('benchmark/sandboxes/run_pure_native_mcp/logs/judge_log.json')
    ? 'benchmark/sandboxes/run_pure_native_mcp'
    : 'benchmark/sandboxes/run_hermetic_native_mcp';

  const n8nacSandbox = path.resolve(options.n8nacSandbox || defaultN8nac);
  const mcpSandbox = path.resolve(options.mcpSandbox || defaultMcp);

  // Read raw logs from Branch A (n8n-as-code)
  const n8nacInstaller = JSON.parse(fs.readFileSync(path.join(n8nacSandbox, 'logs/installer_log.json'), 'utf8'));
  const n8nacBuilder = JSON.parse(fs.readFileSync(path.join(n8nacSandbox, 'logs/builder_log.json'), 'utf8'));
  const n8nacJudge = JSON.parse(fs.readFileSync(path.join(n8nacSandbox, 'logs/judge_log.json'), 'utf8'));

  // Read raw logs from Branch B (Native MCP)
  const mcpInstaller = JSON.parse(fs.readFileSync(path.join(mcpSandbox, 'logs/installer_log.json'), 'utf8'));
  const mcpBuilder = JSON.parse(fs.readFileSync(path.join(mcpSandbox, 'logs/builder_log.json'), 'utf8'));
  const mcpJudge = JSON.parse(fs.readFileSync(path.join(mcpSandbox, 'logs/judge_log.json'), 'utf8'));

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
          id: n8nacBuilder.workflowId,
          url: `${(process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud').replace(/\/+$/, '')}/workflow/${n8nacBuilder.workflowId}`
        },
        nativeMcp: {
          id: mcpBuilder.workflowId,
          url: `${(process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud').replace(/\/+$/, '')}/workflow/${mcpBuilder.workflowId}`
        }
      }
    },
    n8nac: {
      runId: path.basename(n8nacSandbox),
      toolName: 'n8n-as-code',
      scores: n8nacJudge.scores,
      breakdown: n8nacJudge.breakdown,
      justification: n8nacJudge.justification,
      rawMetrics: {
        totalDurationMs: n8nacBuilder.durationMs,
        totalDurationSec: parseFloat((n8nacBuilder.durationMs / 1000).toFixed(2)),
        tokenUsage: n8nacBuilder.tokensUsed,
        interactions: {
          turns: n8nacBuilder.turns,
          validationErrors: n8nacBuilder.validationErrors
        }
      }
    },
    nativeMcp: {
      runId: path.basename(mcpSandbox),
      toolName: 'n8n-native-mcp',
      scores: mcpJudge.scores,
      breakdown: mcpJudge.breakdown,
      justification: mcpJudge.justification,
      rawMetrics: {
        totalDurationMs: mcpBuilder.durationMs,
        totalDurationSec: parseFloat((mcpBuilder.durationMs / 1000).toFixed(2)),
        tokenUsage: mcpBuilder.tokensUsed,
        interactions: {
          turns: mcpBuilder.turns,
          validationErrors: mcpBuilder.validationErrors
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
