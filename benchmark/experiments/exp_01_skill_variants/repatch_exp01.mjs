import fs from 'node:fs';
import path from 'node:path';

// update-ai regenerates the skill as well as AGENTS.md, so the arm patches have to be
// applied AFTER it runs, never before. The first attempt patched then regenerated, and the
// regeneration silently restored the control text on all three arms.
const base = 'G:/repos/n8n-harness-benchmark/benchmark/experiments/exp_01_skill_variants';
const NL = String.fromCharCode(10);
const CLI = 'npx --no-install n8nac';
const skillOf = (arm) => path.join(base, arm, '.agents/skills/n8n-architect/SKILL.md');
const read = (arm) => fs.readFileSync(skillOf(arm), 'utf8').split(String.fromCharCode(13) + NL).join(NL);
const must = (t, n, w) => { if (!t.includes(n)) throw new Error(`${w}: anchor missing -> ${n.slice(0, 70)}`); };

function armB(text) {
    must(text, '5. Search examples and schemas.', 'B');
    text = text.replace('5. Search examples and schemas.', '5. Search node schemas.');

    const steer = '- Start with `examples search` when the user asks for a common automation pattern.' + NL;
    must(text, steer, 'B');
    text = text.split(steer).join('');

    must(text, '- Fetch community examples only when', 'B');
    text = text.split(NL).filter((l) => !l.startsWith('- Fetch community examples only when')
        && !l.startsWith('- Use examples to learn patterns')).join(NL);

    for (const cmd of ['skills examples search "<workflow pattern>"', 'skills examples info <id>', 'skills examples download <id>']) {
        const line = `${CLI} ${cmd}` + NL;
        must(text, line, 'B');
        text = text.split(line).join('');
    }

    must(text, 'Offline node knowledge, examples, documentation, and schema-first authoring', 'B');
    text = text.split('Offline node knowledge, examples, documentation, and schema-first authoring')
        .join('Offline node knowledge, documentation, and schema-first authoring');
    return text;
}

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

    for (const [from, to] of [
        ['9. Test if the workflow is HTTP-triggered.', '10. Test if the workflow is HTTP-triggered.'],
        ['10. Inspect executions when behavior is unclear.', '11. Inspect executions when behavior is unclear.'],
        ['11. Present the final workflow link with', '12. Report the finished workflow to the user by link, with'],
    ]) {
        must(text, from, 'C');
        text = text.replace(from, to);
    }

    const anchor = '- When the user asks for an URL or visual inspection of a workflow, run';
    must(text, anchor, 'C');
    text = text.replace(anchor,
        '- "Report to the user by link" is about your reply to the user. It never satisfies a request'
        + ' for the workflow itself to present, send or publish something; that has to be a node in the graph.'
        + NL + anchor);
    return text;
}

for (const [arm, patch] of [['arm_b', armB], ['arm_c', armC]]) {
    fs.writeFileSync(skillOf(arm), patch(read(arm)), 'utf8');
}

const control = read('arm_a');
for (const arm of ['arm_b', 'arm_c']) {
    const t = read(arm);
    console.log(`${arm}: ${t === control ? 'IDENTICAL TO CONTROL — patch did not apply' : 'differs from control'}`
        + ` | lines ${t.split(NL).length} vs ${control.split(NL).length}`
        + ` | "skills examples" ${(t.match(/skills examples/g) || []).length}`);
}
