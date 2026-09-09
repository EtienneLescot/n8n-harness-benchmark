#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { N8nClient } from './harness/n8n-client.mjs';
import { NativeMcpClient } from './harness/native-mcp-client.mjs';
import { WorkflowEvaluator } from './harness/evaluator.mjs';
import { MarkdownReporter } from './reporters/markdown-reporter.mjs';
import { DashboardReporter } from './reporters/dashboard-reporter.mjs';
import { JsonReporter } from './reporters/json-reporter.mjs';
import { validateWorkflowOnInstance } from './harness/validator.mjs';

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
  evaluate <file>     Evaluate a local workflow JSON file against standard rubric
  validate <id>       Validate live workflow on instance using n8n server RPC & execution check
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

  if (result.error) {
    console.error(`❌ ${result.error}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`🏆 PARTIAL CORRECTNESS SCORE: ${result.partialCorrectness} / 100`);
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Requirement coverage:  ${result.scores.requirementCoverage} / 100`);
  for (const check of result.requirementChecks) {
    const mark = check.points === check.maxPoints ? '✔' : check.points > 0 ? '~' : '✘';
    console.log(`     ${mark} ${check.label.padEnd(42)} ${check.points} / ${check.maxPoints}`);
  }
  console.log(`  Graph integrity:       ${result.scores.graphIntegrity} / 100`);
  if (result.metrics.orphanedNodes.length > 0) {
    console.log(`     orphans: ${result.metrics.orphanedNodes.join(', ')}`);
  }
  console.log('═══════════════════════════════════════════════════════');
  console.log(`⚠️  Not measured offline: ${result.missingComponent}\n`);
}

import { compileBenchmarkResults } from './harness/compiler.mjs';

async function handleValidate(workflowId) {
  if (!workflowId) {
    console.error('Error: Please provide a workflow ID. Example: node benchmark/cli.mjs validate y7SWIwjXjL8x3mwU');
    process.exit(1);
  }

  console.log(`\n🔍 Auditing Workflow ${workflowId} on live n8n Cloud instance (Zero LLM)...\n`);
  const result = await validateWorkflowOnInstance(workflowId);

  console.log('═══════════════════════════════════════════════════════');
  console.log(`🏆 DETERMINISTIC CORRECTNESS SCORE: ${result.scores.compositeCorrectness} / 100`);
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  • Workflow Name:         ${result.workflowName}`);
  console.log(`  • Requirement Coverage:  ${result.scores.requirementCoverage}%`);
  for (const check of result.requirementChecks || []) {
    const mark = check.points === check.maxPoints ? '✔' : check.points > 0 ? '~' : '✘';
    console.log(`      ${mark} ${check.label}`);
  }
  console.log(`  • Nodes (telemetry):     ${result.metrics.nodeCount}`);
  console.log(`  • Valid Nodes (RPC):     ${result.metrics.validNodeCount} / ${result.metrics.nodeCount} (${result.scores.nodeSchemaValidity}%)`);
  console.log(`  • Graph Integrity:       ${result.scores.graphIntegrity}% (${result.metrics.orphanedNodeCount} orphans)`);
  console.log(`  • Live Execution:        ${result.liveExecution.executed ? result.liveExecution.status + ' (' + result.liveExecution.executedNodesCount + ' nodes)' : 'None'} (${result.scores.liveExecution} pts)`);
  console.log('═══════════════════════════════════════════════════════\n');
}

async function handleReport() {
  console.log('\n📄 Deterministically Compiling Benchmark Reports (Option B Minimax)...\n');
  const compiled = await compileBenchmarkResults();

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
    case 'validate':
      await handleValidate(args[1]);
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
