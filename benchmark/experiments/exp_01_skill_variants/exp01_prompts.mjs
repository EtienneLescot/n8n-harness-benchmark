import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const NL = String.fromCharCode(10);
const BSLASH = String.fromCharCode(92);
const root = 'G:/repos/n8n-harness-benchmark';
const base = path.join(root, 'benchmark/experiments/exp_01_skill_variants');

const request = 'Create on my n8n instance a multi-agent workflow that daily checks my Google emails and calendar, sorts the information, and presents an HTML daily briefing dashboard.';

const manifest = {
    experiment: 'exp_01_skill_variants',
    createdAt: new Date().toISOString(),
    hypothesis: 'The n8n-architect skill steers the builder in ways that cost quality. Arm B removes the examples-first steer. Arm C adds an explicit end-to-end answer check and stops the final step from absorbing the request verb.',
    baseline: 'run_12 branch A scored 74 on quality, its terminal Code node delivering nothing.',
    underTest: 'n8nac@2.6.0-rc.6, installed locally, no registry fetch.',
    heldConstant: 'Same prompt verbatim, same model, same local install, identical AGENTS.md across arms, every documented command rewritten to the local binary on all three arms. Arm A is a fresh control rather than run_12, so that rewrite is held constant too.',
    userRequest: request,
    arms: {},
};

for (const arm of ['arm_a', 'arm_b', 'arm_c']) {
    const token = 'bench-' + crypto.randomBytes(4).toString('hex');
    const dir = path.join(base, arm).split('/').join(BSLASH);
    const prompt = [
        'Benchmark task, requested by the owner of this machine.',
        '',
        `Your workspace for this task is ${dir}. It exists; change into it first and stay there. Its toolchain is already installed and its .env holds the credentials you need.`,
        '',
        'Operating rules:',
        '- Work only inside that directory. Do not read or run commands in parent or sibling directories.',
        '- Do not list, search for, or inspect existing workflows on the n8n instance.',
        '- Build your own workflow and use only the identifier returned when it is created.',
        `- Name the workflow exactly: ${token}`,
        '- Leave it inactive.',
        '- Never invent a credential value or create a credential. Nodes that need credentials are expected; add them with the credential slot left empty.',
        '- Write builder_log.json at the workspace root: startedAt and completedAt in UTC ISO, workflowId, workflowName, nodeCount, every command and tool call in order, and any friction you hit. No secrets. Do not grade your own work.',
        '',
        'Task:',
        request,
        '',
    ].join(NL);
    fs.writeFileSync(path.join(base, `${arm}_builder_prompt.txt`), prompt, 'utf8');
    manifest.arms[arm] = { sandbox: dir, workflowToken: token };
}

fs.writeFileSync(path.join(base, 'manifest.json'), JSON.stringify(manifest, null, 2) + NL, 'utf8');
for (const [k, v] of Object.entries(manifest.arms)) console.log(k, v.workflowToken);
