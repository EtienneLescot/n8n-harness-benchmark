/**
 * Toolchain readiness and usage checks — the two gates that stand between an installed
 * toolchain and a run whose cost axes mean anything.
 *
 * A builder handed a toolchain it cannot discover does not fail loudly. It writes the
 * workflow JSON by hand and POSTs it to the REST API with curl, produces a perfectly valid
 * workflow, and costs far fewer tokens than a builder that actually looked things up. The
 * run then reports that the tool under test is expensive, when what it measured is the
 * price of consulting nothing.
 *
 * That happened three times before anyone noticed:
 *   run_11 branch B — no MCP tool in the worker's list, straight to REST.
 *   run_12 branch A — installer skipped `n8nac update-ai`, so no AGENTS.md, straight to REST.
 *   run_12 branch B — .mcp.json written for an MCP client that does not exist, straight to REST.
 *
 *   node benchmark/harness/toolchain-check.mjs --ready    before dispatching builders
 *   node benchmark/harness/toolchain-check.mjs --used     after they return, before scoring
 *   node benchmark/harness/toolchain-check.mjs --self-check
 *
 * ZERO LLM inference: a filesystem check and a substring scan of the builder logs.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert';

/**
 * What each branch needs in its sandbox before its builder is dispatched, and what its
 * builder log must show afterwards.
 *
 * The `ready` markers are not decoration. They are the only thing in the workspace that
 * tells a builder the toolchain exists and how to reach it. Branch A gets `AGENTS.md`, which
 * `n8nac update-ai` writes — the fourth of four commands in the README quick start, and the
 * one that is easiest to skip because the first three already report success. Branch B gets
 * the harness's MCP helper, because n8n's own documentation for the native MCP server covers
 * only how to configure an existing MCP client and gives no HTTP or JSON-RPC example at all.
 */
export const BRANCHES = {
    n8nac: {
        label: 'n8n-as-code',
        ready: [
            { path: 'AGENTS.md', why: 'the agent-facing guide written by `npx n8nac update-ai`' },
            { path: 'node_modules/n8nac', why: 'the CLI itself' },
        ],
        // Matches both documented forms: the bare or dist-tagged binary (`npx --yes n8nac@next push`)
        // and the local entry point that `update-ai` has written since 2.7.0-rc.1
        // (`node node_modules/n8nac/dist/index.js push`). Widened after inspecting run_15's logs,
        // where five builders drove the CLI thirty-odd times and the gate read zero.
        usedPattern: /(?:n8nac(?:@[\w.-]+)?|n8nac[\/\\]dist[\/\\]index\.js)\s+(env|skills|push|pull|list|verify|workflow|workspace|promote|setup|update-ai)\b/,
        usedLabel: 'n8nac CLI invocation',
    },
    native_mcp: {
        label: 'n8n Native MCP',
        ready: [
            { path: '.mcp.json', why: 'the client configuration n8n documents' },
            { path: ['mcp_call.mjs', 'mcp_call.ps1'], why: 'a usable MCP caller, seeded from benchmark/config/native-mcp-helper (the Node one runs anywhere, the PowerShell one is the Windows original)' },
        ],
        // `tools/call` is the JSON-RPC envelope, but the seeded helper writes it for the caller,
        // so a log can show real MCP work without carrying the literal. An MCP tool name is
        // equally conclusive: none of these are reachable over plain REST.
        usedPattern: /tools\/call|mcp_(?:call|code|validate_nodes)\.ps1|create_workflow_from_code|validate_workflow|get_node_essentials|validate_node_config|search_nodes/,
        usedLabel: 'tools/call against the MCP endpoint',
    },
};

/** The bare-REST signature. Present alone, it means the toolchain under test was bypassed. */
const REST_PATTERN = /api\/v1\/workflows/;

const branchOf = (dirName) => (dirName.includes('native_mcp') ? 'native_mcp'
    : dirName.includes('n8nac') ? 'n8nac' : null);

function sandboxesOf(runId, root = 'benchmark/sandboxes') {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith(`${runId}_`))
        .map((e) => ({ dir: path.join(root, e.name), branch: branchOf(e.name) }))
        .filter((s) => s.branch);
}

/** Gate 1 — every branch's sandbox carries something that makes its toolchain discoverable. */
export function checkReady(runId, root = 'benchmark/sandboxes') {
    const problems = [];
    const sandboxes = sandboxesOf(runId, root);
    if (sandboxes.length === 0) {
        problems.push({ branch: '-', dir: root, issue: `no sandbox matched "${runId}_*" under ${root}` });
    }
    for (const { dir, branch } of sandboxes) {
        for (const need of BRANCHES[branch].ready) {
            // A marker may be a list of alternatives; any one of them satisfies it.
            const candidates = Array.isArray(need.path) ? need.path : [need.path];
            if (!candidates.some((rel) => fs.existsSync(path.join(dir, rel)))) {
                problems.push({ branch, dir, missing: candidates.join(' or '), why: need.why });
            }
        }
    }
    return { sandboxes: sandboxes.length, problems };
}

/** Gate 2 — every branch's builder actually drove its own toolchain. */
export function checkUsed(runId, root = 'benchmark/sandboxes') {
    const problems = [];
    const summary = [];
    const found = sandboxesOf(runId, root);
    if (found.length === 0) {
        problems.push({ branch: '-', dir: root, issue: `no sandbox matched "${runId}_*" under ${root}` });
    }
    for (const { dir, branch } of found) {
        const logPath = path.join(dir, 'builder_log.json');
        if (!fs.existsSync(logPath)) {
            problems.push({ branch, dir, issue: 'no builder_log.json' });
            continue;
        }
        const text = fs.readFileSync(logPath, 'utf8');
        const spec = BRANCHES[branch];
        const usedToolchain = spec.usedPattern.test(text);
        const usedRest = REST_PATTERN.test(text);
        summary.push({ branch, usedToolchain, usedRest });
        if (!usedToolchain) {
            problems.push({
                branch,
                dir,
                issue: `builder log shows no ${spec.usedLabel}`,
                andRest: usedRest,
            });
        }
    }
    return { summary, problems };
}

function report(title, problems, extra = '') {
    if (problems.length === 0) {
        console.log(`✅ ${title}${extra}`);
        return 0;
    }
    console.error(`❌ ${title} — ${problems.length} problem(s). Do not proceed.\n`);
    for (const p of problems) {
        if (p.missing) {
            console.error(`  [${p.branch}] ${p.dir} is missing ${p.missing}`);
            console.error(`        ${p.why}`);
        } else {
            console.error(`  [${p.branch}] ${p.issue}${p.andRest ? ', and it did reach /api/v1/workflows directly' : ''}`);
        }
    }
    console.error('\nA builder that cannot discover its toolchain writes JSON by hand and POSTs it.');
    console.error('The workflow is valid, the run is cheap, and the cost axes measure nothing.');
    return 1;
}

function selfCheck() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toolchain-check-'));
    const mk = (name, files) => {
        const dir = path.join(tmp, name);
        fs.mkdirSync(dir, { recursive: true });
        for (const [rel, body] of Object.entries(files)) {
            const full = path.join(dir, rel);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, body);
        }
        return dir;
    };

    // Ready gate: a sandbox holding only the install is not ready.
    mk('r1_n8nac', { 'node_modules/n8nac/package.json': '{}' });
    mk('r1_native_mcp', { '.mcp.json': '{}' });
    let res = checkReady('r1', tmp);
    assert.strictEqual(res.sandboxes, 2, 'both branches must be found');
    assert.strictEqual(res.problems.length, 2, 'each branch is missing exactly its discovery surface');
    assert.ok(res.problems.some((p) => p.missing === 'AGENTS.md'));
    assert.ok(res.problems.some((p) => p.missing === 'mcp_call.mjs or mcp_call.ps1'));

    // Either helper satisfies branch B. The PowerShell one was the original and only runs on
    // Windows; the Node one runs wherever the harness does, which is what makes the benchmark
    // reproducible on Linux and macOS.
    mk('r3_n8nac', { 'node_modules/n8nac/package.json': '{}', 'AGENTS.md': '# guide' });
    mk('r3_native_mcp', { '.mcp.json': '{}', 'mcp_call.mjs': 'export {}' });
    assert.deepStrictEqual(checkReady('r3', tmp).problems, [], 'the Node helper alone must satisfy the gate');

    mk('r2_n8nac', { 'node_modules/n8nac/package.json': '{}', 'AGENTS.md': '# guide' });
    mk('r2_native_mcp', { '.mcp.json': '{}', 'mcp_call.ps1': 'param()' });
    assert.deepStrictEqual(checkReady('r2', tmp).problems, [], 'a seeded pair must pass');

    // Used gate: the exact shape of run_12, where both builders bypassed their toolchain.
    mk('u1_n8nac', { 'builder_log.json': '{"c":["curl -X POST $N8N_HOST/api/v1/workflows"]}' });
    mk('u1_native_mcp', { 'builder_log.json': '{"c":["curl -X POST $N8N_HOST/api/v1/workflows"]}' });
    const bypassed = checkUsed('u1', tmp);
    assert.strictEqual(bypassed.problems.length, 2, 'both bypasses must be caught');
    assert.ok(bypassed.problems.every((p) => p.andRest), 'and the REST fallback must be named');

    // And the shape of a good run: run_12 branch A attempt 2, run_10 branch B.
    mk('u2_n8nac', { 'builder_log.json': '{"c":["npx n8nac push workflows/dev/x.workflow.ts --verify"]}' });
    mk('u2_native_mcp', { 'builder_log.json': '{"c":["POST body {\\"method\\":\\"tools/call\\"}"]}' });
    assert.deepStrictEqual(checkUsed('u2', tmp).problems, [], 'a run that drove both toolchains must pass');

    // The dist-tagged form is the one the README documents (`npx --yes n8nac@next`), and
    // an earlier pattern that omitted it read 30 real CLI calls as none.
    mk('u4_n8nac', { 'builder_log.json': '{"c":["npx --yes n8nac@next skills validate x.workflow.ts"]}' });
    assert.deepStrictEqual(checkUsed('u4', tmp).problems, [], 'n8nac@next must count as an invocation');

    // run_15: the local-install command form that update-ai now writes, and a branch B log that
    // names MCP tools through the seeded helper without carrying the raw JSON-RPC envelope.
    mk('u5_n8nac', { 'builder_log.json': '{"c":["node node_modules/n8nac/dist/index.js push workflows/dev/x.workflow.ts --verify"]}' });
    mk('u5_native_mcp', { 'builder_log.json': '{"c":["& ./mcp_call.ps1 create_workflow_from_code"]}' });
    assert.deepStrictEqual(checkUsed('u5', tmp).problems, [], 'the local entry point and the seeded helper must both count');

    // A missing log is a problem, not a pass.
    mk('u3_n8nac', {});
    assert.strictEqual(checkUsed('u3', tmp).problems.length, 1, 'an absent builder log must not read as success');

    // A run id that matches nothing used to come back green, which is a gate that reports
    // success because it found nothing to test.
    assert.strictEqual(checkReady('no_such_run', tmp).problems.length, 1, 'an empty match must fail the readiness gate');
    assert.strictEqual(checkUsed('no_such_run', tmp).problems.length, 1, 'an empty match must fail the usage gate');

    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('✅ toolchain-check self-check passed');
}

if (process.argv[1] && process.argv[1].endsWith('toolchain-check.mjs')) {
    // Any non-flag token is the run id; a second one overrides the sandbox root. The old form
    // only recognised /^run_N$/ and passed undefined for anything else, which is how a gate
    // ends up reporting on "undefined_*" and finding nothing wrong with it.
    const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    const [runId, rootArg] = positional;
    const rootDir = rootArg || 'benchmark/sandboxes';
    if (process.argv.includes('--self-check')) {
        selfCheck();
    } else if (process.argv.includes('--ready')) {
        const { sandboxes, problems } = checkReady(runId, rootDir);
        process.exit(report('Toolchain discoverable in every sandbox', problems, ` — ${sandboxes} sandbox(es).`));
    } else if (process.argv.includes('--used')) {
        const { summary, problems } = checkUsed(runId, rootDir);
        const line = summary.map((s) => `${s.branch}:${s.usedToolchain ? 'used' : 'BYPASSED'}`).join(' ');
        process.exit(report('Every builder drove its own toolchain', problems, ` — ${line}.`));
    } else {
        console.error('usage: node benchmark/harness/toolchain-check.mjs (--ready|--used) run_N | --self-check');
        process.exit(2);
    }
}
