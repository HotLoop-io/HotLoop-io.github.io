// Turns Flow's generated docs/compatibility.md into src/data/nodes.json.
//
//   node scripts/import-flow-compat.mjs path/to/compatibility.md
//
// That markdown file is itself generated from Flow's node registry, and Flow's
// tests fail if it drifts, so it is the source of truth. This script exists so
// the website imports the 51 rows instead of anyone retyping them. When Flow
// grows a JSON emitter beside the markdown one, replace this with a plain copy.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/import-flow-compat.mjs <compatibility.md>');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/data/nodes.json');

const CATEGORIES = new Set([
  'Common', 'Function', 'Network', 'Sequence', 'Parser', 'Storage', 'Discover', 'Config',
]);

// The source says "HotLoop Flow", and on these pages the product is just Flow.
// Node TYPE strings are left exactly as they are: they are identifiers persisted
// inside users' flow files, so they are never reworded here.
const rebrand = (s) => s.replace(/HotLoop Flow's/g, "Flow's").replace(/HotLoop Flow/g, 'Flow');

// The site's house style has no em-dashes as connectors and uses American
// spelling. Flow's generated doc has both, and we cannot edit it, so the import
// applies the house style. Every rule below was checked against every occurrence
// in the current 51 rows, and the count is asserted so a new pattern is noticed.
const AMERICAN = [
  [/\bhonoured\b/g, 'honored'], [/\bbehaviour\b/g, 'behavior'], [/\blicence\b/g, 'license'],
  [/\boptimisation\b/g, 'optimization'], [/\bartefact\b/g, 'artifact'], [/\bcolour\b/g, 'color'],
];
let dashes = 0;
const house = (s) => {
  let out = s.replace(/ — (\S.*?)(?= — |$)/g, (_, rest, offset, whole) => {
    dashes++;
    if (/^along with\b/.test(rest)) return `, ${rest}`;             // an addition to a list
    if (/^[a-z][a-z-]*, /.test(rest)) return `: ${rest}`;          // a list introduced by the clause before it
    return `. ${rest[0].toUpperCase()}${rest.slice(1)}`;           // a complete thought of its own
  });
  for (const [re, to] of AMERICAN) out = out.replace(re, to);
  return out;
};

const rows = [];
let category = null;

for (const line of readFileSync(src, 'utf8').split(/\r?\n/)) {
  const h = line.match(/^## (.+)$/);
  if (h) {
    category = CATEGORIES.has(h[1].trim()) ? h[1].trim() : null;
    continue;
  }
  if (!category) continue;

  // | `type` | level | notes |
  const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*([a-z-]+)\s*\|\s*(.*?)\s*\|\s*$/);
  if (!m) continue;

  const [, type, rawLevel, rawNotes] = m;
  const level = rawLevel === 'hotloop-flow-only' ? 'flow-only' : rawLevel;
  const notes = rawNotes === '—' ? '' : house(rebrand(rawNotes));
  const id = type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  rows.push({ id, type, category, level, notes });
}

// The comment above promises this, so enforce it. If Flow's doc ever grows a new
// dash pattern the rules above do not cover, fail loudly instead of publishing it.
const leftover = rows.filter((r) => r.notes.includes('—'));
if (leftover.length) {
  console.error(`em-dashes survived the house-style pass in: ${leftover.map((r) => r.type).join(', ')}`);
  process.exit(1);
}

const ids = new Set(rows.map((r) => r.id));
if (ids.size !== rows.length) {
  console.error('duplicate node ids after slugging, fix the slug rule');
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows, null, 2) + '\n');

const by = rows.reduce((a, r) => ((a[r.level] = (a[r.level] || 0) + 1), a), {});
console.log(`wrote ${rows.length} nodes to src/data/nodes.json`, by);
