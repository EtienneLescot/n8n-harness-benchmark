#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { N8nClient } from './harness/n8n-client.mjs';
import { NativeMcpClient } from './harness/native-mcp-client.mjs';
import { WorkflowEvaluator } from './harness/evaluator.mjs';
import { MarkdownReporter } from './reporters/markdown-reporter.mjs';
import { DashboardReporter } from './reporters/dashboard-reporter.mjs';
import { JsonReporter } from './reporters/json-reporter.mjs';

// Lightweight zero-dependency .env loader
function loadEnv() {
  const envPaths = ['.env', '.env.local', 'benchmark/.env'];
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

function printHelp() {
  console.log(`
⚡ n8n-harness-benchmark CLI
Standardized benchmark comparing n8n-as-code with n8n Native MCP

Usage:
  node benchmark/cli.mjs <command> [options]
  npm run <command>

Commands:
  verify              Verify .env credentials and connectivity to n8n instance & MCP server
  evaluate <file>     Evaluate a workflow JSON file against the standardized 5-dimension rubric
  report              Regenerate HTML dashboard and Markdown reports from benchmark_results.json
  help, -h, --help    Show this help message

Execution Note:
  The benchmark itself is orchestrated by Google Antigravity using hermetic subagents to prevent
  context contamination. To run the full benchmark, invoke the skill:
  skills/benchmark-n8n-workflow-creation/SKILL.md
`);
}

async function handleVerify() {
  console.log('\n🔍 Verifying Credentials & Connectivity...\n');

  const host = process.env.N8N_HOST || 'http://localhost:5678';
  const apiKey = process.env.N8N_API_KEY ? '******' : '(missing)';
  const mcpUrl = process.env.N8N_NATIVE_MCP_URL || `${host}/mcp-server/http`;
  const mcpToken = process.env.N8N_NATIVE_MCP_TOKEN ? '******' : '(missing)';

  console.log(`  • N8N_HOST:             ${host}`);
  console.log(`  • N8N_API_KEY:          ${apiKey}`);
  console.log(`  • N8N_NATIVE_MCP_URL:   ${mcpUrl}`);
  console.log(`  • N8N_NATIVE_MCP_TOKEN: ${mcpToken}`);
  console.log('');

  // 1. Check REST API
  const n8nClient = new N8nClient();
  const restHealth = await n8nClient.checkHealth();
  if (restHealth.ok) {
    console.log(`  ✔ n8n REST API: Connected successfully (${host})`);
  } else {
    console.log(`  ✖ n8n REST API: Connection failed: ${restHealth.error || restHealth.status}`);
  }

  // 2. Check Native MCP
  const mcpClient = new NativeMcpClient();
  const mcpHealth = await mcpClient.checkConnection();
  if (mcpHealth.ok) {
    console.log(`  ✔ n8n Native MCP: Connected successfully (${mcpHealth.toolCount} tools discovered)`);
  } else {
    console.log(`  ✖ n8n Native MCP: Connection failed: ${mcpHealth.error}`);
  }

  console.log('');
  if (restHealth.ok && mcpHealth.ok) {
    console.log('🎉 All systems ready for benchmark execution!\n');
  } else {
    console.log('⚠️ Some connections failed. Please check your .env file or instance settings.\n');
  }
}

async function handleEvaluate(filePath) {
  if (!filePath) {
    console.error('Error: Please provide a workflow file path. Example: node benchmark/cli.mjs evaluate workflow.json');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n📊 Evaluating Workflow: ${filePath}...\n`);
  const content = fs.readFileSync(filePath, 'utf8');
  const evaluator = new WorkflowEvaluator();
  const result = await evaluator.evaluate(content);

  console.log('═══════════════════════════════════════════════════════');
  console.log(`🏆 OVERALL QUALITY SCORE: ${result.totalScore} / 100`);
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  1. Brief Following:      ${result.breakdown.briefFollowing.score} / 25`);
  console.log(`  2. Nodes & Wiring:       ${result.breakdown.nodesCorrectness.score} / 25`);
  console.log(`  3. Wow Effect & Style:   ${result.breakdown.wowEffect.score} / 25`);
  console.log(`  4. Execution Readiness:  ${result.breakdown.workflowExecution.score} / 25`);
  console.log('═══════════════════════════════════════════════════════\n');
}

import { compileBenchmarkResults } from './harness/compiler.mjs';

async function handleReport() {
  console.log('\n📄 Deterministically Compiling Benchmark Reports from Raw Judge Scorecards...\n');
  const compiled = compileBenchmarkResults();

  console.log(`  ✔ Markdown Report:   ${compiled.artifacts.mdFile}`);
  console.log(`  ✔ HTML Dashboard:    ${compiled.artifacts.htmlFile}`);
  console.log(`  ✔ Results JSON:      ${compiled.artifacts.jsonFile}`);
  console.log('\n🎉 Reports compiled deterministically with zero LLM inference!\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'verify':
      await handleVerify();
      break;
    case 'evaluate':
      await handleEvaluate(args[1]);
      break;
    case 'report':
      await handleReport();
      break;
    case 'help':
    case '-h':
    case '--help':
    default:
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
