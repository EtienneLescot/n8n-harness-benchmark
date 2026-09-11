import fs from 'node:fs';
import path from 'node:path';

// Arm B removed the documentation and both builds went looking for examples anyway: the CLI
// still offered the subcommand and `--help` still listed it. Prose cannot ablate a
// capability. This builds a template where the capability itself is gone, by wrapping the
// CLI entry point so that every examples path answers like a command that does not exist,
// and so that help output never advertises one.
const NL = String.fromCharCode(10);
const base = 'G:/repos/n8n-harness-benchmark/benchmark/experiments/exp_01_skill_variants/templates';
const from = path.join(base, 'n8nac_no_examples');
const to = path.join(base, 'n8nac_examples_ablated');

const copyDir = (a, b) => {
    fs.mkdirSync(b, { recursive: true });
    for (const e of fs.readdirSync(a, { withFileTypes: true })) {
        const x = path.join(a, e.name);
        const y = path.join(b, e.name);
        if (e.isDirectory()) copyDir(x, y);
        else if (e.isFile()) fs.copyFileSync(x, y);
    }
};

fs.rmSync(to, { recursive: true, force: true });
copyDir(from, to);

const dist = path.join(to, 'node_modules/n8nac/dist');
const real = path.join(dist, 'index.real.js');
const entry = path.join(dist, 'index.js');
if (!fs.existsSync(entry)) throw new Error('CLI entry point not found');
fs.renameSync(entry, real);

const wrapper = [
    "// Capability ablation for the benchmark's examples experiment. The real entry point is",
    "// index.real.js; this shim makes every community-examples path unreachable and keeps help",
    '// output from advertising one, so the builder cannot reach for an affordance that the',
    '// experiment is meant to have taken away.',
    "const argv = process.argv.slice(2);",
    "const joined = argv.join(' ');",
    '',
    '// Direct subcommand, and the batch form that carries the call as JSON.',
    "const reachesExamples = /(^|\\s)examples?([\\s-]|$)/i.test(joined)",
    '    || /["\']cmd["\']\\s*:\\s*["\']examples/i.test(joined);',
    '',
    'if (reachesExamples) {',
    "    const name = (argv.find((a) => /^examples?([-\\w]*)$/i.test(a)) || 'examples');",
    "    process.stderr.write(`error: unknown command '${name}'${String.fromCharCode(10)}`);",
    '    process.exit(1);',
    '}',
    '',
    '// Help text is an affordance too. Drop any line that names the removed command.',
    "if (argv.includes('--help') || argv.includes('-h')) {",
    '    const write = process.stdout.write.bind(process.stdout);',
    '    process.stdout.write = (chunk, ...rest) => {',
    "        const text = typeof chunk === 'string' ? chunk : String(chunk);",
    "        const kept = text.split(String.fromCharCode(10)).filter((l) => !/examples?/i.test(l));",
    '        return write(kept.join(String.fromCharCode(10)), ...rest);',
    '    };',
    '}',
    '',
    "await import('./index.real.js');",
    '',
].join(NL);
fs.writeFileSync(entry, wrapper, 'utf8');

console.log('template n8nac_examples_ablated built');
