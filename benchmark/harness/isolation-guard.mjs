/**
 * Spatial isolation guard — Barrier 2 of `JUDGING_PROTOCOL.md`, enforced instead of promised.
 *
 * A worker that can read how it is graded optimises for the grader. The protocol therefore
 * forbids any scoring or judging document from reaching a builder sandbox. That rule was a
 * sentence in a markdown file, which is exactly the kind of rule `run_9` broke without
 * anyone noticing until the results had to be forensically re-examined.
 *
 * Run this before dispatching builders. It exits non-zero and names every violation.
 *
 *   node benchmark/harness/isolation-guard.mjs
 *   node benchmark/harness/isolation-guard.mjs --self-check
 *
 * ZERO LLM inference, zero network: a filesystem walk and a substring scan.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert';

/**
 * Path shapes that must never appear inside a sandbox. This array is the single definition
 * — `JUDGING_PROTOCOL.md` points here rather than restating the list, because a rule that
 * exists in two places is the failure this repository already had with its scoring weights.
 */
export const FORBIDDEN_PATHS = [
    { label: 'judge capability kit', test: (p) => /(^|\/)skills\/judging(\/|$)/i.test(p) },
    { label: 'scoring or protocol document', test: (p) => /JUDGING_PROTOCOL|EVALUATION_RUBRIC|ISOLATION_AND_IMPARTIALITY/i.test(base(p)) },
    { label: 'benchmark configuration', test: (p) => /^benchmark\.config/i.test(base(p)) },
    { label: 'scoring module', test: (p) => /^scoring\.mjs$/i.test(base(p)) },
    { label: 'compiled benchmark result', test: (p) => /^benchmark_(results|report|dashboard)/i.test(base(p)) },
];

/**
 * Strings that identify a scoring document whatever it has been renamed to. The path check
 * alone is defeated by `cp EVALUATION_RUBRIC.md notes.md`, and the point of the guard is to
 * catch an orchestrator that copied a file, not to win an argument with one that hid it.
 */
export const FORBIDDEN_CONTENT = [
    // Every file in skills/judging/ carries this marker, so the kit stays catchable after a
    // rename. `--self-check` reads the real kit and fails if a file is added without it.
    'JUDGE-KIT:',
    'expectedCapabilities',
    'CORRECTNESS_WEIGHTS',
    'COMPOSITE_WEIGHTS',
    'requirementCoverage',
    'nodeSchemaValidity',
    'graphIntegrity',
    'compositeCorrectness',
    'Latent Defects',
];

// ponytail: node_modules and .git are pruned entirely. A scoring document planted inside a
// dependency tree is not the accident this guards against, and walking them costs minutes.
const PRUNE = new Set(['node_modules', '.git', '.cache', '.turbo']);

const TEXT_EXT = new Set(['', '.md', '.txt', '.json', '.mjs', '.cjs', '.js', '.ts', '.yml',
    '.yaml', '.ps1', '.sh', '.env', '.toml', '.html', '.xml', '.csv']);

const MAX_CONTENT_BYTES = 512 * 1024;

const base = (p) => p.split('/').pop();
const rel = (root, full) => path.relative(root, full).split(path.sep).join('/');

/**
 * Audit one sandbox directory. Returns a violation list; empty means clean.
 *
 * Three channels, because each defeats the previous one:
 *  - `path`     a scoring file copied in under its own name
 *  - `content`  the same file renamed
 *  - `symlink`  a link that reaches the repository the sandbox is nested inside
 */
export function auditSandbox(sandboxRoot) {
    const violations = [];
    let scanned = 0;
    let realRoot;
    try {
        realRoot = fs.realpathSync(sandboxRoot);
    } catch {
        return { violations: [{ kind: 'missing', file: sandboxRoot, detail: 'sandbox does not exist' }], scanned: 0 };
    }

    const walk = (dir) => {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (err) {
            violations.push({ kind: 'unreadable', file: rel(sandboxRoot, dir), detail: err.message });
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            const relPath = rel(sandboxRoot, full);

            if (entry.isSymbolicLink()) {
                let target;
                try {
                    target = fs.realpathSync(full);
                } catch {
                    continue; // a broken link reaches nothing
                }
                // A link out of the sandbox re-exposes the repository the sandbox is nested
                // inside, which is where every scoring document lives.
                if (target !== realRoot && !target.startsWith(realRoot + path.sep)) {
                    violations.push({ kind: 'symlink', file: relPath, detail: `escapes the sandbox to ${target}` });
                }
                continue;
            }

            for (const rule of FORBIDDEN_PATHS) {
                if (rule.test(relPath)) {
                    violations.push({ kind: 'path', file: relPath, detail: rule.label });
                    break;
                }
            }

            if (entry.isDirectory()) {
                if (!PRUNE.has(entry.name)) walk(full);
                continue;
            }
            if (!entry.isFile()) continue;

            scanned += 1;
            if (!TEXT_EXT.has(path.extname(entry.name).toLowerCase())) continue;
            let stat;
            try {
                stat = fs.statSync(full);
            } catch {
                continue;
            }
            if (stat.size > MAX_CONTENT_BYTES) continue;
            let text;
            try {
                text = fs.readFileSync(full, 'utf8');
            } catch {
                continue;
            }
            const hits = FORBIDDEN_CONTENT.filter((marker) => text.includes(marker));
            if (hits.length > 0) {
                violations.push({ kind: 'content', file: relPath, detail: `leaked judging vocabulary: ${hits.join(', ')}` });
            }
        }
    };

    walk(realRoot);
    return { violations, scanned };
}

/** Audit every sandbox directory under `root`. Loose files there are siblings, not sandboxes. */
export function auditAllSandboxes(root = 'benchmark/sandboxes') {
    if (!fs.existsSync(root)) return { sandboxes: [], violations: [], scanned: 0 };
    const dirs = fs.readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => path.join(root, e.name));
    const results = dirs.map((dir) => ({ sandbox: dir, ...auditSandbox(dir) }));
    return {
        sandboxes: dirs,
        scanned: results.reduce((n, r) => n + r.scanned, 0),
        violations: results.flatMap((r) => r.violations.map((v) => ({ ...v, sandbox: r.sandbox }))),
    };
}

/**
 * The one runnable check. Plants one violation of each channel and asserts the guard sees
 * it, then asserts a plausible sandbox is clean — a guard that never fires and a guard that
 * always fires are equally useless.
 */
function selfCheck() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'isolation-guard-'));
    const mk = (name) => {
        const dir = path.join(tmp, name);
        fs.mkdirSync(path.join(dir, 'workflows'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Toolchain\nRun the cli.\n');
        fs.writeFileSync(path.join(dir, 'workflows', 'deployed.json'), '{"nodes":[],"connections":{}}');
        return dir;
    };

    const clean = mk('clean');
    let res = auditSandbox(clean);
    assert.deepStrictEqual(res.violations, [], 'a plausible sandbox must be clean');
    assert.ok(res.scanned >= 2, 'the walk must actually reach files');

    const byName = mk('by_name');
    fs.writeFileSync(path.join(byName, 'EVALUATION_RUBRIC.md'), 'hello');
    assert.strictEqual(auditSandbox(byName).violations.filter((v) => v.kind === 'path').length, 1,
        'a scoring document under its own name must be caught');

    const renamed = mk('renamed');
    fs.writeFileSync(path.join(renamed, 'notes.md'), 'see requirementCoverage and graphIntegrity');
    const renamedViolations = auditSandbox(renamed).violations;
    assert.strictEqual(renamedViolations.length, 1, 'renaming a scoring document must not defeat the guard');
    assert.strictEqual(renamedViolations[0].kind, 'content');

    const kit = mk('kit');
    fs.mkdirSync(path.join(kit, 'skills', 'judging'), { recursive: true });
    fs.writeFileSync(path.join(kit, 'skills', 'judging', 'anything.md'), 'x');
    assert.ok(auditSandbox(kit).violations.some((v) => v.detail === 'judge capability kit'),
        'the judge kit must be caught by directory, whatever the file is called');

    const pruned = mk('pruned');
    fs.mkdirSync(path.join(pruned, 'node_modules', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(pruned, 'node_modules', 'pkg', 'scoring.mjs'), 'COMPOSITE_WEIGHTS');
    assert.deepStrictEqual(auditSandbox(pruned).violations, [],
        'node_modules is pruned by design — assert the documented ceiling, do not discover it later');

    const linked = mk('linked');
    let symlinkSupported = true;
    try {
        fs.symlinkSync(tmp, path.join(linked, 'up'), 'dir');
    } catch {
        symlinkSupported = false; // Windows without developer mode
    }
    if (symlinkSupported) {
        assert.ok(auditSandbox(linked).violations.some((v) => v.kind === 'symlink'),
            'a link out of the sandbox must be caught');
    }

    // The kit is the thing this guard exists to keep out, so assert against the real files
    // rather than a fixture: a judge document added without the marker fails here.
    const kitDir = 'skills/judging';
    if (fs.existsSync(kitDir)) {
        const kitFiles = [];
        const collect = (dir) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) collect(full);
                else if (e.isFile()) kitFiles.push(full);
            }
        };
        collect(kitDir);
        assert.ok(kitFiles.length > 0, 'the judge kit must not be empty');
        const planted = mk('kit_renamed');
        for (const [i, file] of kitFiles.entries()) {
            fs.writeFileSync(path.join(planted, `innocent_${i}.md`), fs.readFileSync(file));
        }
        const caught = auditSandbox(planted).violations.filter((v) => v.kind === 'content');
        assert.strictEqual(caught.length, kitFiles.length,
            `every judge kit file must be caught after a rename — ${kitFiles.length} files, ${caught.length} caught`);
    }

    const all = auditAllSandboxes(tmp);
    const expected = fs.readdirSync(tmp, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
    assert.strictEqual(all.sandboxes.length, expected, 'every sandbox directory must be audited');
    assert.ok(all.violations.every((v) => v.sandbox), 'each violation must name its sandbox');

    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`✅ isolation-guard self-check passed${symlinkSupported ? '' : ' (symlink channel skipped: unsupported here)'}`);
}

if (process.argv[1] && process.argv[1].endsWith('isolation-guard.mjs')) {
    if (process.argv.includes('--self-check')) {
        selfCheck();
    } else {
        const root = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])
            || 'benchmark/sandboxes';
        const { sandboxes, violations, scanned } = auditAllSandboxes(root);
        if (sandboxes.length === 0) {
            console.log(`🛡️  No sandbox directory under ${root} — nothing to audit.`);
            process.exit(0);
        }
        if (violations.length === 0) {
            console.log(`🛡️  Spatial isolation intact: ${sandboxes.length} sandbox(es), ${scanned} files scanned, 0 violations.`);
            process.exit(0);
        }
        console.error(`❌ Spatial isolation violated — ${violations.length} finding(s). Do not dispatch builders.\n`);
        for (const v of violations) {
            console.error(`  [${v.kind}] ${v.sandbox}/${v.file}\n        ${v.detail}`);
        }
        console.error('\nA worker that can read how it is graded optimises for the grader.');
        console.error('See skills/benchmark-n8n-workflow-creation/references/JUDGING_PROTOCOL.md, Barrier 2.');
        process.exit(1);
    }
}
