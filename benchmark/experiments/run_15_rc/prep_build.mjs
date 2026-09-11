/**
 * Copy a configured branch template into a pristine build sandbox and write the builder
 * prompt for it, verbatim, before dispatch.
 *
 * Each build starts from a fresh copy. A builder that found the previous build's
 * workflows/dev files would be reading an answer it did not write.
 *
 *   node benchmark/experiments/run_15_rc/prep_build.mjs <template> <label>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const NL = String.fromCharCode(10);
const BSLASH = String.fromCharCode(92);
const root = 'G:/repos/n8n-harness-benchmark';
const exp = path.join(root, 'benchmark/experiments/run_15_rc');
const builds = path.join(exp, 'builds');

/** The request, verbatim and unchanged across every run this benchmark has published. */
const REQUEST = 'Create on my n8n instance a multi-agent workflow that daily checks my Google emails and calendar, sorts the information, and presents an HTML daily briefing dashboard.';
const SCRATCH = ['builder_log.json', 'installer_log.json', 'workflows', 'node_modules/.cache'];

const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        const a = path.join(from, e.name);
        const b = path.join(to, e.name);
        if (e.isDirectory()) copyDir(a, b);
        else if (e.isFile()) fs.copyFileSync(a, b);
    }
};

const [, , template, label] = process.argv;
if (!template || !label) {
    console.error('usage: prep_build.mjs <template> <label>');
    process.exit(2);
}
const src = path.join(exp, template);
if (!fs.existsSync(src)) {
    console.error('no template ' + template + '. available: ' + fs.readdirSync(exp).join(', '));
    process.exit(2);
}

const dir = path.join(builds, label);
fs.rmSync(dir, { recursive: true, force: true });
copyDir(src, dir);
for (const junk of SCRATCH) fs.rmSync(path.join(dir, junk), { recursive: true, force: true });

const token = 'bench-' + crypto.randomBytes(4).toString('hex');
const winDir = dir.split('/').join(BSLASH);
const prompt = [
    'Benchmark task, requested by the owner of this machine.',
    '',
    'Your workspace for this task is ' + winDir + '. It exists; change into it first and stay there. Its toolchain is already installed and its .env holds the credentials you need.',
    '',
    'Operating rules:',
    '- Work only inside that directory. Do not read or run commands in parent or sibling directories.',
    '- Do not list, search for, or inspect existing workflows on the n8n instance.',
    '- Build your own workflow and use only the identifier returned when it is created.',
    '- Name the workflow exactly: ' + token,
    '- Leave it inactive.',
    '- Never invent a credential value or create a credential. Nodes that need credentials are expected; add them with the credential slot left empty.',
    '- Write builder_log.json at the workspace root: startedAt and completedAt in UTC ISO, workflowId, workflowName, nodeCount, every command and tool call in order, and any friction you hit. No secrets. Do not grade your own work.',
    '',
    'Task:',
    REQUEST,
    '',
].join(NL);

fs.mkdirSync(path.join(exp, 'prompts'), { recursive: true });
fs.writeFileSync(path.join(exp, 'prompts', label + '.txt'), prompt, 'utf8');

const ledgerPath = path.join(exp, 'builds.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
ledger.builds = ledger.builds.filter((b) => b.label !== label);
ledger.builds.push({ label, template, token, sandbox: winDir, preparedAt: new Date().toISOString() });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + NL, 'utf8');

console.log(prompt);
