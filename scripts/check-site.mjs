/**
 * The published page must be what the generator produces, byte for byte.
 *
 * It drifted once: docs/index.html was edited by hand to feature the newest run while the
 * generator still selected a different one, and the two disagreed on which tool was ahead.
 * A hand edit also disappears silently at the next regeneration, so the page and its own
 * history stop matching without anyone noticing.
 *
 *   node scripts/check-site.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = path.join(ROOT, 'docs/index.html');

if (!fs.existsSync(page)) {
    console.error('docs/index.html is missing. Run: npm run report');
    process.exit(1);
}
const before = fs.readFileSync(page, 'utf8');

execFileSync(process.execPath, [path.join(ROOT, 'benchmark/reporters/site-reporter.mjs')], { cwd: ROOT, stdio: 'pipe' });
const after = fs.readFileSync(page, 'utf8');

if (before === after) {
    console.log('OK  docs/index.html matches what the reporter generates.');
    process.exit(0);
}

// The regenerated file stays in place: it is the correct one, and the fix is to commit it.
const lines = (s) => s.split(/\r?\n/);
const [a, b] = [lines(before), lines(after)];
const i = a.findIndex((l, k) => l !== b[k]);
console.error('FAIL  docs/index.html is not what the reporter generates.');
console.error('      First difference at line ' + (i + 1) + '.');
console.error('      published: ' + (a[i] || '(missing)').trim().slice(0, 110));
console.error('      generated: ' + (b[i] || '(missing)').trim().slice(0, 110));
console.error('');
console.error('The regenerated page has been written. Review it and commit it.');
console.error('Never hand-edit docs/index.html: change benchmark/reporters/site-reporter.mjs instead.');
process.exit(1);
