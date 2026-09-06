#!/usr/bin/env node

import { runInteractiveMode } from './runners/interactive-runner.mjs';
import { runAutoMode } from './runners/auto-runner.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'auto',
    dryRun: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1].toLowerCase();
    } else if (arg === '--interactive') {
      options.mode = 'interactive';
    } else if (arg === '--auto') {
      options.mode = 'auto';
    }
  }

  return options;
}

function printHelp() {
  console.log(`
n8n-as-code vs. n8n Native MCP Benchmark Harness

Usage:
  node benchmark/cli.mjs [options]
  npm run benchmark -- [options]

Options:
  --mode=auto           Run in Auto Mode (default) where the agent picks credentials from .env
  --mode=interactive    Run in Interactive Mode where the human takes the user role
  --dry-run             Perform a fast verification dry-run
  --help, -h            Show this help message

Examples:
  npm run benchmark:auto
  npm run benchmark:interactive
  node benchmark/cli.mjs --mode=auto
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    if (options.mode === 'interactive') {
      await runInteractiveMode(options);
    } else {
      await runAutoMode(options);
    }
  } catch (error) {
    console.error('Benchmark execution error:', error);
    process.exit(1);
  }
}

main();
