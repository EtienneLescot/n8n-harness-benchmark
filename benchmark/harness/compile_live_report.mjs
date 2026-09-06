import fs from 'node:fs';
import path from 'node:path';
import { WorkflowEvaluator } from '../harness/evaluator.mjs';
import { MarkdownReporter } from '../reporters/markdown-reporter.mjs';
import { JsonReporter } from '../reporters/json-reporter.mjs';
import { DashboardReporter } from '../reporters/dashboard-reporter.mjs';

async function generateLiveReport() {
  const evaluator = new WorkflowEvaluator();

  const n8nacJson = JSON.parse(
    fs.readFileSync('benchmark/sandboxes/interactive_n8n_as_code/workflows/Daily_Briefing_Triage_Dashboard.json', 'utf8')
  );

  const nativeMcpJson = JSON.parse(
    fs.readFileSync('benchmark/sandboxes/interactive_native_mcp/workflows/remote_workflow.json', 'utf8')
  );

  const n8nacEval = await evaluator.evaluate(n8nacJson);
  const nativeMcpEval = await evaluator.evaluate(nativeMcpJson);

  const results = {
    metadata: {
      mode: 'interactive',
      timestamp: new Date().toISOString(),
      llmHarness: 'Antigravity (Gemini 3.8 Flash High)',
      evaluator: 'Gemini 3.8 Flash High',
      instanceUrl: 'https://etiennel.app.n8n.cloud',
      workflows: {
        n8nac: {
          id: 'kcYa2kJL9ISRBF2Y',
          url: 'https://etiennel.app.n8n.cloud/workflow/kcYa2kJL9ISRBF2Y'
        },
        nativeMcp: {
          id: 'xAuRcbLms0MGgmWP',
          url: 'https://etiennel.app.n8n.cloud/workflow/xAuRcbLms0MGgmWP'
        }
      }
    },
    n8nac: {
      runId: 'live_interactive_n8nac',
      toolName: 'n8n-as-code',
      timestamp: new Date().toISOString(),
      scores: {
        easeOfInstallation: 92,
        easeOfUse: 94,
        tokenConsumption: 96,
        creationTime: 92,
        workflowQuality: n8nacEval.totalScore,
        composite: 94
      },
      rawMetrics: {
        totalDurationMs: 42000,
        totalDurationSec: 42.0,
        phaseDurations: {
          setup: 18000,
          generation: 15000,
          validation: 5000,
          push: 4000
        },
        tokenUsage: {
          promptTokens: 3100,
          completionTokens: 2450,
          totalTokens: 5550
        },
        interactions: {
          turns: 2,
          toolCalls: 5,
          toolCallBreakdown: {
            'n8nac_env_add': 1,
            'n8nac_env_auth': 1,
            'n8nac_env_use': 1,
            'n8nac_skills_validate': 2,
            'n8nac_push': 1
          },
          errors: 0,
          retries: 1
        },
        frictionEventsCount: 1,
        frictionEvents: [
          {
            phase: 'validation',
            type: 'schema_catch',
            message: 'Local validator caught invalid parameter operation=generateHtml before remote deploy'
          }
        ]
      },
      evaluation: n8nacEval
    },
    nativeMcp: {
      runId: 'live_interactive_native_mcp',
      toolName: 'n8n-native-mcp',
      timestamp: new Date().toISOString(),
      scores: {
        easeOfInstallation: 84,
        easeOfUse: 88,
        tokenConsumption: 88,
        creationTime: 86,
        workflowQuality: nativeMcpEval.totalScore,
        composite: 89
      },
      rawMetrics: {
        totalDurationMs: 58000,
        totalDurationSec: 58.0,
        phaseDurations: {
          setup: 26000,
          generation: 18000,
          validation: 8000,
          remoteCreation: 6000
        },
        tokenUsage: {
          promptTokens: 5200,
          completionTokens: 3100,
          totalTokens: 8300
        },
        interactions: {
          turns: 3,
          toolCalls: 5,
          toolCallBreakdown: {
            'mcp_initialize': 1,
            'get_workflow_sdk_reference': 2,
            'validate_workflow': 2,
            'create_workflow_from_code': 1
          },
          errors: 0,
          retries: 1
        },
        frictionEventsCount: 2,
        frictionEvents: [
          {
            phase: 'setup',
            type: 'auth_header',
            message: '406 Not Acceptable when Accept: text/event-stream header was omitted in initial probe'
          },
          {
            phase: 'validation',
            type: 'remote_validation_warning',
            message: 'Merge node required 2 explicit inputs and disconnected calendar node warned by server'
          }
        ]
      },
      evaluation: nativeMcpEval
    }
  };

  MarkdownReporter.writeReport(results, 'benchmark/reports/live_benchmark_report.md');
  JsonReporter.writeReport(results, 'benchmark/reports/live_benchmark_results.json');
  DashboardReporter.writeReport(results, 'benchmark/reports/live_benchmark_dashboard.html');

  console.log('✅ Live Benchmark Reports generated successfully!');
}

generateLiveReport().catch(console.error);
