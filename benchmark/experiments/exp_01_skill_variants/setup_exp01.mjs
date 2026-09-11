import fs from 'node:fs';
import path from 'node:path';

const root = 'G:/repos/n8n-harness-benchmark';
const src = path.join(root, 'benchmark/sandboxes/run_12_n8nac');
const base = path.join(root, 'benchmark/experiments/exp_01_skill_variants');
const NL = String.fromCharCode(10);

// Every arm runs the same locally installed build with no network fetch. The skill ships
// ~80 `npx --yes n8nac@next` invocations, each of which would hit the registry; rewriting
// them to the local binary is done identically on all three arms so it cannot confound the
// comparison. Arm A is a fresh control, not run_12, precisely so that this rewrite is held
// constant across every arm.
const LOCAL_CLI = 'npx --no-install n8nac';

const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        const a = path.join(from, e.name);
        const b = path.join(to, e.name);
        if (e.isDirectory()) copyDir(a, b);
        else if (e.isFile()) fs.copyFileSync(a, b);
    }
};

const readSkill = (dir) => fs.readFileSync(path.join(dir, '.agents/skills/n8n-architect/SKILL.md'), 'utf8')
    .split(String.fromCharCode(13) + NL).join(NL);
const writeSkill = (dir, text) => fs.writeFileSync(path.join(dir, '.agents/skills/n8n-architect/SKILL.md'), text, 'utf8');

const must = (text, needle, where) => {
    if (!text.includes(needle)) throw new Error(`${where}: anchor missing -> ${needle.slice(0, 70)}`);
    return text;
};

// ── arm B: remove the steer to look for an example before anything else ────────────────
function armB(text) {
    must(text, '5. Search examples and schemas.', 'B');
    text = text.replace('5. Search examples and schemas.', '5. Search node schemas.');

    must(text, '- Start with `examples search` when the user asks for a common automation pattern.' + NL, 'B');
    text = text.split('- Start with `examples search` when the user asks for a common automation pattern.' + NL).join('');

    must(text, '- Fetch community examples only when', 'B');
    text = text.split(NL).filter((l) => !l.startsWith('- Fetch community examples only when')
        && !l.startsWith('- Use examples to learn patterns')).join(NL);

    for (const cmd of ['skills examples search "<workflow pattern>"', 'skills examples info <id>', 'skills examples download <id>']) {
        const line = `${LOCAL_CLI} ${cmd}` + NL;
        must(text, line, 'B');
        text = text.split(line).join('');   // every occurrence, not just the first
    }

    must(text, 'Offline node knowledge, examples, documentation, and schema-first authoring', 'B');
    text = text.replace('Offline node knowledge, examples, documentation, and schema-first authoring',
        'Offline node knowledge, documentation, and schema-first authoring');

    return text;
}

// ── arm C: make the workflow's own output an explicit step, and stop step 11 from
//    absorbing the request's verb ─────────────────────────────────────────────────────
function armC(text) {
    const oldStep = '7. Validate locally.' + NL + '8. Push with `--verify`.';
    must(text, oldStep, 'C');
    text = text.replace(oldStep, [
        '7. Validate locally.',
        '8. Re-read the request and confirm the workflow answers it end to end, including where its',
        '   own output goes. A workflow that computes a result and wires it to nothing has not',
        '   answered a request to present, send, report, or deliver anything: the last node must',
        '   reach somewhere outside the execution, or the request must not have asked for that.',
        '9. Push with `--verify`.',
    ].join(NL));

    // Renumber the tail so the list stays coherent.
    for (const [from, to] of [['9. Test if the workflow is HTTP-triggered.', '10. Test if the workflow is HTTP-triggered.'],
        ['10. Inspect executions when behavior is unclear.', '11. Inspect executions when behavior is unclear.'],
        ['11. Present the final workflow link with', '12. Report the finished workflow to the user by link, with']]) {
        must(text, from, 'C');
        text = text.replace(from, to);
    }

    // "Present the final workflow link" sits one word away from the kind of request that says
    // "present a dashboard". Name the audience so the two cannot be confused.
    must(text, '- When the user asks for an URL or visual inspection of a workflow, run', 'C');
    text = text.replace('- When the user asks for an URL or visual inspection of a workflow, run',
        '- "Report to the user by link" is about your reply to the user. It never satisfies a request for the workflow itself to present, send or publish something; that has to be a node in the graph.' + NL
        + '- When the user asks for an URL or visual inspection of a workflow, run');

    return text;
}

const arms = { arm_a: null, arm_b: armB, arm_c: armC };

fs.rmSync(base, { recursive: true, force: true });
for (const [name, patch] of Object.entries(arms)) {
    const dir = path.join(base, name);
    copyDir(src, dir);
    for (const junk of ['builder_log.json', 'installer_log.json', 'workflows']) {
        fs.rmSync(path.join(dir, junk), { recursive: true, force: true });
    }

    // Point every documented command at the local install, on every arm.
    let skill = readSkill(dir).split('npx --yes n8nac@next').join(LOCAL_CLI).split('npx --yes n8nac').join(LOCAL_CLI);
    if (patch) skill = patch(skill);
    writeSkill(dir, skill);

    const net = (skill.match(/n8nac@next|npx --yes/g) || []).length;
    const ex = (skill.match(/example/gi) || []).length;
    console.log(`${name}: skill ${skill.split(NL).length} lines | network-fetching npx calls ${net} | "example" mentions ${ex}`);
}
