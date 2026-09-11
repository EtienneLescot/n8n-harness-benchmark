import fs from 'node:fs';
import path from 'node:path';
import { validateWorkflowOnInstance } from './validator.mjs';
import { compositeScore, scoreSetupEase, relativeScore, COMPOSITE_WEIGHTS, CORRECTNESS_WEIGHTS, SETUP_WEIGHTS } from './scoring.mjs';
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
 * Relative cost score for a pair of branches, from scoring.mjs. The cheaper one gets 100
 * and the other decays with its overage; only the ratio is read, so runs on different
 * orchestrators stay comparable even when their absolute numbers are not.
 */
function calculatePair(valA, valB) {
  return { scoreA: relativeScore(valA, valB), scoreB: relativeScore(valB, valA) };
}

export async function compileBenchmarkResults(options = {}) {
  const sandboxes = fs.existsSync('benchmark/sandboxes') ? fs.readdirSync('benchmark/sandboxes') : [];
  const findSandbox = (suffix) => {
    const matching = sandboxes.filter(s => s.endsWith(suffix) && (
      fs.existsSync(path.join('benchmark/sandboxes', s, 'logs/installer_log.json')) ||
      fs.existsSync(path.join('benchmark/sandboxes', s, 'installer_log.json'))
    )).sort();
    return matching.length > 0 ? path.join('benchmark/sandboxes', matching[matching.length - 1]) : null;
  };

  const defaultN8nac = process.env.N8NAC_SANDBOX
    || findSandbox('_n8nac')
    || (fs.existsSync('benchmark/sandboxes/run_next_3_n8nac/logs/installer_log.json') ? 'benchmark/sandboxes/run_next_3_n8nac' : 'benchmark/sandboxes/run_pure_n8nac');

  const defaultMcp = process.env.MCP_SANDBOX
    || findSandbox('_native_mcp')
    || (fs.existsSync('benchmark/sandboxes/run_next_3_native_mcp/logs/installer_log.json') ? 'benchmark/sandboxes/run_next_3_native_mcp' : 'benchmark/sandboxes/run_pure_native_mcp');

  const n8nacSandbox = path.resolve(options.n8nacSandbox || defaultN8nac);
  const mcpSandbox = path.resolve(options.mcpSandbox || defaultMcp);

  const readJsonSafe = (filePath) => {
    if (!fs.existsSync(filePath)) return {};
    try {
      const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
      return JSON.parse(content);
    } catch {
      return {};
    }
  };

  // 1. Raw worker telemetry (Branch A: n8n-as-code)
  const n8nacInstaller = {
    ...readJsonSafe(path.join(n8nacSandbox, 'installer_log.json')),
    ...readJsonSafe(path.join(n8nacSandbox, 'logs/installer_log.json'))
  };
  const n8nacBuilder = {
    ...readJsonSafe(path.join(n8nacSandbox, 'builder_log.json')),
    ...readJsonSafe(path.join(n8nacSandbox, 'logs/builder_log.json')),
    ...readJsonSafe(path.join(n8nacSandbox, 'logs/builder_run.json'))
  };

  // 2. Raw worker telemetry (Branch B: Native MCP)
  const mcpInstaller = {
    ...readJsonSafe(path.join(mcpSandbox, 'installer_log.json')),
    ...readJsonSafe(path.join(mcpSandbox, 'logs/installer_log.json'))
  };
  const mcpBuilder = {
    ...readJsonSafe(path.join(mcpSandbox, 'builder_log.json')),
    ...readJsonSafe(path.join(mcpSandbox, 'logs/builder_log.json')),
    ...readJsonSafe(path.join(mcpSandbox, 'logs/builder_run.json'))
  };

  // 3. Extract Physical Telemetry
  const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

  const getDurationSec = (log) => {
    if (typeof log?.setup_time_seconds === 'number') return log.setup_time_seconds;
    if (typeof log?.setupTimeSeconds === 'number') return log.setupTimeSeconds;
    if (typeof log?.telemetry?.setupTimeSeconds === 'number') return log.telemetry.setupTimeSeconds;
    if (log?.startedAt && log?.completedAt) {
      const ms = new Date(log.completedAt) - new Date(log.startedAt);
      if (!isNaN(ms) && ms >= 0) return Math.round(ms / 1000);
    }
    return null;
  };

  const n8nacSetupSec = num(getDurationSec(n8nacInstaller));
  const mcpSetupSec = num(getDurationSec(mcpInstaller));

  const n8nacBuildSec = num(n8nacBuilder.durationSeconds ?? (n8nacBuilder.durationMs ? n8nacBuilder.durationMs / 1000 : null));
  const mcpBuildSec = num(mcpBuilder.durationSeconds ?? (mcpBuilder.durationMs ? mcpBuilder.durationMs / 1000 : null));

  // Never derive tokens from tool-call count: that is a guess wearing a measurement's clothes.
  const n8nacTokens = num(n8nacBuilder.tokenUsage?.totalTokens ?? n8nacBuilder.tokensUsed?.totalTokens);
  const mcpTokens = num(mcpBuilder.tokenUsage?.totalTokens ?? mcpBuilder.tokensUsed?.totalTokens);

  const missing = Object.entries({ n8nacBuildSec, mcpBuildSec, n8nacTokens, mcpTokens })
    .filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length > 0) {
    console.warn(`⚠️  Unmeasured telemetry (reported as null, excluded from the composite): ${missing.join(', ')}`);
  }

  const n8nacCommands = n8nacInstaller.command_count || (n8nacInstaller.commands ? n8nacInstaller.commands.length : 3);
  const mcpCommands = mcpInstaller.telemetry?.commandCount || (mcpInstaller.telemetry?.commands ? mcpInstaller.telemetry.commands.length : 3);

  const n8nacTurns = n8nacBuilder.interactionTurns || n8nacBuilder.turns || 1;
  const mcpTurns = mcpBuilder.interactionTurns || mcpBuilder.turns || 1;

  // 4. Score the cost axes. Each is a ratio between the two branches, so an axis
  // missing on either side has no score for either — not a default one.
  const pairScore = (a, b) => (a === null || b === null)
    ? { scoreA: null, scoreB: null }
    : calculatePair(a, b);
  // Setup is scored on friction and command count, not on seconds — see SETUP_WEIGHTS.
  // Acquisition seconds stay in the report as telemetry on both branches.
  const countOf = (log, ...keys) => {
    for (const k of keys) {
      const v = k.split('.').reduce((o, part) => (o ?? {})[part], log);
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'number') return v;
    }
    return 0;
  };
  const setupEase = scoreSetupEase(
    {
      frictionCount: countOf(n8nacInstaller, 'friction_events', 'frictionEvents', 'friction_count'),
      commandCount: countOf(n8nacInstaller, 'command_count', 'commands', 'commandCount'),
    },
    {
      frictionCount: countOf(mcpInstaller, 'friction_events', 'frictionEvents', 'friction_count'),
      commandCount: countOf(mcpInstaller, 'command_count', 'commands', 'commandCount', 'command_list'),
    },
  );
  const setupTimeMinimax = { scoreA: setupEase.a.score, scoreB: setupEase.b.score };
  const buildTimeMinimax = pairScore(n8nacBuildSec, mcpBuildSec);
  const tokensMinimax = pairScore(n8nacTokens, mcpTokens);

  // 5. Run Deterministic Ground-Truth API Validation for both workflows
  // No fallback workflow id: auditing a stale workflow from an earlier run and reporting it
  // as this run's result is worse than failing.
  const n8nacWfId = n8nacBuilder.workflowId;
  const mcpWfId = mcpBuilder.workflowId;
  if (!n8nacWfId || !mcpWfId) {
    throw new Error(`Cannot compile: missing workflowId in a builder log (n8nac=${n8nacWfId ?? 'absent'}, nativeMcp=${mcpWfId ?? 'absent'}).`);
  }

  console.log(`Auditing Branch A workflow (${n8nacWfId}) on n8n Cloud...`);
  const n8nacQualityAudit = await validateWorkflowOnInstance(n8nacWfId);

  console.log(`Auditing Branch B workflow (${mcpWfId}) on n8n Cloud...`);
  const mcpQualityAudit = await validateWorkflowOnInstance(mcpWfId);

  // 5b. Quality Panel Integration (if grades present)
  const median = (xs) => (xs.length > 0 ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
  const possibleGradeDirs = [
    'results/history/run_16/judging/grades',
    path.join(n8nacSandbox, 'judging/grades'),
    path.join(mcpSandbox, 'judging/grades'),
  ];
  let gradeDir = possibleGradeDirs.find(d => fs.existsSync(d));
  let qualityA = null;
  let qualityB = null;

  if (gradeDir) {
    const files = fs.readdirSync(gradeDir);
    const gradesA = files.filter(f => f.startsWith('wf-01_')).map(f => JSON.parse(fs.readFileSync(path.join(gradeDir, f), 'utf8')).total);
    const gradesB = files.filter(f => f.startsWith('wf-02_')).map(f => JSON.parse(fs.readFileSync(path.join(gradeDir, f), 'utf8')).total);
    if (gradesA.length > 0) qualityA = median(gradesA);
    if (gradesB.length > 0) qualityB = median(gradesB);
    console.log(`Audited Quality Panel: n8n-as-code=${qualityA}/100, Native MCP=${qualityB}/100`);
  }

  // 6. Calculate Composite Overall Scores — weights come from scoring.mjs, never restated here.
  // Pass null for an axis this runtime cannot observe (run_8 and run_9 had no per-worker
  // token telemetry): compositeScore renormalises over the measured axes and flags the
  // result partial, instead of scoring an unobserved axis as zero.
  // Setup is telemetry now and takes no argument: a cost paid once must not move a ranking.
  const computeComposite = (qualityScore, correctnessScore, buildScore, tokenScore) =>
    compositeScore({
      quality: qualityScore,
      correctness: correctnessScore,
      buildTime: buildScore,
      tokenEfficiency: tokenScore,
    }).score;

  const n8nacComposite = computeComposite(
    qualityA,
    n8nacQualityAudit.scores.compositeCorrectness,
    buildTimeMinimax.scoreA,
    tokensMinimax.scoreA
  );

  const mcpComposite = computeComposite(
    qualityB,
    mcpQualityAudit.scores.compositeCorrectness,
    buildTimeMinimax.scoreB,
    tokensMinimax.scoreB
  );

  const results = {
    metadata: {
      harness: process.env.BENCHMARK_HARNESS || 'Antigravity',
      primaryAgent: process.env.BENCHMARK_PRIMARY_AGENT || 'Antigravity Orchestrator',
      model: process.env.BENCHMARK_MODEL || 'Gemini 3.8 Flash High',
      temperature: parseFloat(process.env.BENCHMARK_TEMPERATURE || '0.2'),
      subagentRuntime: process.env.BENCHMARK_SUBAGENT_RUNTIME || 'invoke_subagent',
      evaluationEngine: 'Deterministic n8n API validator + scale-invariant relative cost scoring',
      timestamp: new Date().toISOString(),
      environment: {
        os: `${process.platform} (${process.arch})`,
        nodeVersion: process.version,
        n8nInstance: process.env.N8N_HOST || 'https://etiennel.app.n8n.cloud'
      },
      workflows: {
        n8nac: {
          id: n8nacWfId
        },
        nativeMcp: {
          id: mcpWfId
        }
      }
    },
    weights: { ...COMPOSITE_WEIGHTS, correctnessComponents: CORRECTNESS_WEIGHTS, setupTelemetryComponents: SETUP_WEIGHTS },
    setupEase,
    n8nac: {
      runId: path.basename(n8nacSandbox),
      toolName: 'n8n-as-code',
      scores: {
        setupEaseTelemetry: setupTimeMinimax.scoreA,
        setupTime: setupTimeMinimax.scoreA,
        creationTime: buildTimeMinimax.scoreA,
        buildTime: buildTimeMinimax.scoreA,
        tokenConsumption: tokensMinimax.scoreA,
        tokenEfficiency: tokensMinimax.scoreA,
        workflowQuality: qualityA ?? n8nacQualityAudit.scores.compositeCorrectness ?? 100,
        quality: qualityA ?? n8nacQualityAudit.scores.compositeCorrectness ?? 100,
        correctness: n8nacQualityAudit.scores.compositeCorrectness ?? 100,
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
        setupEaseTelemetry: setupTimeMinimax.scoreB,
        setupTime: setupTimeMinimax.scoreB,
        creationTime: buildTimeMinimax.scoreB,
        buildTime: buildTimeMinimax.scoreB,
        tokenConsumption: tokensMinimax.scoreB,
        tokenEfficiency: tokensMinimax.scoreB,
        workflowQuality: qualityB ?? mcpQualityAudit.scores.compositeCorrectness ?? 100,
        quality: qualityB ?? mcpQualityAudit.scores.compositeCorrectness ?? 100,
        correctness: mcpQualityAudit.scores.compositeCorrectness ?? 100,
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
  const resultsDir = path.resolve('results');
  const docsDir = path.resolve('docs');

  [outputDir, resultsDir, docsDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const jsonFile = JsonReporter.writeReport(results, path.join(outputDir, 'benchmark_results.json'));
  const mdFile = MarkdownReporter.writeReport(results, path.join(outputDir, 'benchmark_report.md'));
  const htmlFile = DashboardReporter.writeReport(results, path.join(outputDir, 'benchmark_dashboard.html'));

  // Mirror to results/ and docs/
  JsonReporter.writeReport(results, path.join(resultsDir, 'benchmark_results.json'));
  MarkdownReporter.writeReport(results, path.join(resultsDir, 'benchmark_report.md'));
  JsonReporter.writeReport(results, path.join(docsDir, 'results.json'));

  // Maintain aggregate.json for multi-run matrix and filters
  const aggPath = path.join(resultsDir, 'aggregate.json');
  let agg = { metadata: { totalRuns: 0 }, runs: [] };
  if (fs.existsSync(aggPath)) {
    try { agg = JSON.parse(fs.readFileSync(aggPath, 'utf8')); } catch {}
  }

  const currentRunEntry = {
    id: `run-${String((agg.runs || []).length + 1).padStart(3, '0')}`,
    name: `Run ${(agg.runs || []).length + 1} (${results.n8nac.runId})`,
    timestamp: results.metadata.timestamp,
    codingAgent: results.metadata.harness || 'Antigravity',
    model: results.metadata.model || 'Gemini 3.8 Flash High',
    temperature: results.metadata.temperature ?? 0.2,
    promptId: 'daily-briefing',
    promptTitle: 'Multi-Agent Daily Email & Calendar Briefing',
    promptText: 'Create on my n8n instance a multi-agent workflow that daily checks my Google emails and calendar, sorts the information, and presents an HTML daily briefing dashboard.',
    weights: results.weights,
    n8nac: {
      tool: results.n8nac.toolName,
      workflowId: results.metadata.workflows?.n8nac?.id,
      workflowName: results.n8nac.qualityAudit?.workflowName || 'Workflow A',
      setupSec: results.n8nac.rawMetrics?.setupTimeSec,
      buildSec: results.n8nac.rawMetrics?.totalDurationSec,
      tokens: results.n8nac.rawMetrics?.tokenUsage?.totalTokens,
      commands: results.n8nac.rawMetrics?.setupCommandsCount,
      turns: results.n8nac.rawMetrics?.interactions?.turns,
      scores: results.n8nac.scores,
      audit: {
        nodeCount: results.n8nac.qualityAudit?.metrics?.nodeCount,
        validNodes: results.n8nac.qualityAudit?.metrics?.validNodeCount,
        orphanedNodes: results.n8nac.qualityAudit?.metrics?.orphanedNodeCount,
        schemaValidityPct: results.n8nac.qualityAudit?.scores?.nodeSchemaValidity,
        graphIntegrityPct: results.n8nac.qualityAudit?.scores?.graphIntegrity
      }
    },
    nativeMcp: {
      tool: results.nativeMcp.toolName,
      workflowId: results.metadata.workflows?.nativeMcp?.id,
      workflowName: results.nativeMcp.qualityAudit?.workflowName || 'Workflow B',
      setupSec: results.nativeMcp.rawMetrics?.setupTimeSec,
      buildSec: results.nativeMcp.rawMetrics?.totalDurationSec,
      tokens: results.nativeMcp.rawMetrics?.tokenUsage?.totalTokens,
      commands: results.nativeMcp.rawMetrics?.setupCommandsCount,
      turns: results.nativeMcp.rawMetrics?.interactions?.turns,
      scores: results.nativeMcp.scores,
      audit: {
        nodeCount: results.nativeMcp.qualityAudit?.metrics?.nodeCount,
        validNodes: results.nativeMcp.qualityAudit?.metrics?.validNodeCount,
        orphanedNodes: results.nativeMcp.qualityAudit?.metrics?.orphanedNodeCount,
        schemaValidityPct: results.nativeMcp.qualityAudit?.scores?.nodeSchemaValidity,
        graphIntegrityPct: results.nativeMcp.qualityAudit?.scores?.graphIntegrity
      }
    },
    winner: results.nativeMcp.scores.composite >= results.n8nac.scores.composite ? 'nativeMcp' : 'n8nac',
    winnerName: results.nativeMcp.scores.composite >= results.n8nac.scores.composite ? 'n8n Native MCP' : 'n8n-as-code',
    compositeDelta: parseFloat(Math.abs(results.nativeMcp.scores.composite - results.n8nac.scores.composite).toFixed(2))
  };

  const existingIdx = (agg.runs || []).findIndex(r => r.n8nac?.workflowId === currentRunEntry.n8nac.workflowId && r.nativeMcp?.workflowId === currentRunEntry.nativeMcp.workflowId);
  if (existingIdx >= 0) {
    currentRunEntry.id = agg.runs[existingIdx].id;
    currentRunEntry.name = agg.runs[existingIdx].name;
    agg.runs[existingIdx] = currentRunEntry;
  } else {
    (agg.runs = agg.runs || []).unshift(currentRunEntry);
  }

  agg.metadata = {
    totalRuns: agg.runs.length,
    availableAgents: [...new Set(agg.runs.map(r => r.codingAgent))],
    availableModels: [...new Set(agg.runs.map(r => r.model))],
    availablePrompts: [...new Set(agg.runs.map(r => r.promptTitle))],
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(path.join(resultsDir, 'aggregate.json'), JSON.stringify(agg, null, 2), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'aggregate.json'), JSON.stringify(agg, null, 2), 'utf8');

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
