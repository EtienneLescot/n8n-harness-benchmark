#!/usr/bin/env node
/**
 * Install probe — a narrow, repeatable harness for the setup phase alone.
 *
 * The full benchmark measures install and build together and takes many minutes per run,
 * which is too slow to iterate on install ergonomics. This probe does one thing: prepare a
 * pristine sandbox, then score the command log an installer agent leaves behind.
 *
 * It deliberately does NOT spawn the agent. The orchestrator does that and times it from
 * the outside, so the stopwatch never lives inside the thing being measured.
 *
 *   node benchmark/install-probe/probe.mjs prepare <iteration-label>
 *   node benchmark/install-probe/probe.mjs score   <iteration-label> [--seconds N] [--tokens N] [--tool-calls N]
 *   node benchmark/install-probe/probe.mjs compare
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sandboxRoot = path.join(repoRoot, 'benchmark/install-probe/sandboxes');
const resultsFile = path.join(repoRoot, 'benchmark/install-probe/results.json');

/**
 * Buckets are matched mechanically so two iterations are comparable without a human
 * re-judging each command. The order matters: the first pattern that matches wins.
 */
const BUCKETS = [
    { name: 'acquisition', test: (c) => /\bnpm (install|i|ci)\b/.test(c) },
    {
        name: 'discovery',
        test: (c) => /--help\b/.test(c)
            || /\bgrep\b[^|]*dist\//.test(c)
            || /\bcat\b[^|]*(n8nac-config|package\.json)/.test(c),
    },
    {
        name: 'configuration',
        test: (c) => /\bn8nac\b|\.toolchain\/n8nac|n8n-as-code\b/.test(c),
    },
    { name: 'reconnaissance', test: () => true },
];

function bucketOf(command) {
    return BUCKETS.find((b) => b.test(command)).name;
}

function readJson(file, fallback) {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function envValues() {
    const out = {};
    for (const line of fs.readFileSync(path.join(repoRoot, '.env'), 'utf8').split(/\r?\n/)) {
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const [k, ...rest] = line.split('=');
        out[k.trim()] = rest.join('=').trim();
    }
    return out;
}

function prepare(label) {
    const dir = path.join(sandboxRoot, label);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'workflows'), { recursive: true });

    const env = envValues();
    if (!env.N8N_HOST || !env.N8N_API_KEY) {
        throw new Error('N8N_HOST and N8N_API_KEY must be set in the repo .env');
    }
    fs.writeFileSync(
        path.join(dir, '.env'),
        `N8N_HOST=${env.N8N_HOST}\nN8N_API_KEY=${env.N8N_API_KEY}\n`,
        'utf8',
    );

    const tarballDir = process.env.N8NAC_TARBALL_DIR;
    if (!tarballDir) throw new Error('Set N8NAC_TARBALL_DIR to the directory holding the packed tarballs');
    const tarballs = fs.readdirSync(tarballDir).filter((f) => f.endsWith('.tgz'));
    if (tarballs.length === 0) throw new Error(`No .tgz found in ${tarballDir}`);
    for (const tarball of tarballs) {
        fs.copyFileSync(path.join(tarballDir, tarball), path.join(dir, tarball));
    }

    console.log(dir);
    console.log(`Seeded: .env, workflows/, ${tarballs.length} tarball(s)`);
}

function score(label, external) {
    const dir = path.join(sandboxRoot, label);
    const log = readJson(path.join(dir, 'installer_log.json'), null);
    if (!log) throw new Error(`No installer_log.json in ${dir}`);

    const commands = log.commands ?? [];
    const counts = Object.fromEntries(BUCKETS.map((b) => [b.name, 0]));
    const classified = commands.map((command) => {
        const bucket = bucketOf(command);
        counts[bucket]++;
        return { bucket, command };
    });

    const entry = {
        label,
        commandCount: commands.length,
        buckets: counts,
        frictionEvents: (log.frictionEvents ?? []).length,
        ...external,
        classified,
    };

    const results = readJson(resultsFile, { iterations: [] });
    results.iterations = results.iterations.filter((i) => i.label !== label);
    results.iterations.push(entry);
    fs.mkdirSync(path.dirname(resultsFile), { recursive: true });
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2), 'utf8');

    console.log(`${label}: ${commands.length} commands`, counts, `friction=${entry.frictionEvents}`);
}

function compare() {
    const { iterations } = readJson(resultsFile, { iterations: [] });
    if (iterations.length === 0) return console.log('No iterations scored yet.');

    const columns = ['label', 'seconds', 'commandCount', 'acquisition', 'configuration', 'discovery', 'reconnaissance', 'frictionEvents', 'tokens'];
    const rows = iterations.map((i) => ({
        label: i.label,
        seconds: i.seconds ?? '',
        commandCount: i.commandCount,
        ...i.buckets,
        frictionEvents: i.frictionEvents,
        tokens: i.tokens ?? '',
    }));
    const width = (c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length));
    const widths = Object.fromEntries(columns.map((c) => [c, width(c)]));
    const line = (cells) => columns.map((c) => String(cells[c] ?? '').padEnd(widths[c])).join('  ');

    console.log(line(Object.fromEntries(columns.map((c) => [c, c]))));
    for (const row of rows) console.log(line(row));
}

const [command, label] = process.argv.slice(2);
const flag = (name) => {
    const i = process.argv.indexOf(name);
    return i === -1 ? undefined : Number(process.argv[i + 1]);
};

if (command === 'prepare') prepare(label);
else if (command === 'score') {
    score(label, {
        seconds: flag('--seconds'),
        tokens: flag('--tokens'),
        toolCalls: flag('--tool-calls'),
    });
} else if (command === 'compare') compare();
else {
    console.error('Usage: probe.mjs prepare <label> | score <label> [--seconds N] [--tokens N] [--tool-calls N] | compare');
    process.exit(1);
}
