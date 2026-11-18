// Fails the build when an internal detail reaches a public page. Runs after `astro build`:
//
//   node scripts/sales-lens-check.mjs [dist]
//
// It reads the built HTML as text, so it covers the importer output, the release notes, and
// anything typed by hand. /license and /terms are the canonical legal text, vendored
// byte for byte, so they are the one exception.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse } from 'node-html-parser';
import { scan } from './sales-lens.mjs';

const dist = process.argv[2] || 'dist';
const SKIP = new Set(['license', 'terms']);
const walk = (d, o = []) => { for (const e of readdirSync(d)) { const p = join(d, e); statSync(p).isDirectory() ? walk(p, o) : o.push(p); } return o; };

const problems = [];
let n = 0;
for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
  const route = relative(dist, f).split(sep)[0];
  if (SKIP.has(route)) continue;
  n++;
  const root = parse(readFileSync(f, 'utf8'));
  root.querySelectorAll('script,style').forEach((e) => e.remove());
  problems.push(...scan(relative(dist, f), root.text));
}
if (problems.length) {
  console.error(`sales-lens-check: ${problems.length} internal detail(s) on public pages:`);
  for (const p of problems) console.error('  FAIL  ' + p);
  process.exit(1);
}
console.log(`sales-lens-check: ${n} pages clean`);
