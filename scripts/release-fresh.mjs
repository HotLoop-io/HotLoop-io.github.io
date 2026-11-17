// Fails when hotloop.io says an older release than the one that is live.
//
//   node scripts/release-fresh.mjs
//
// The site's own audit (seo-audit.mjs) pins the version constants in src/lib/products.ts to the
// newest published release note in this repo, so the site can never disagree with itself. It
// cannot see a release nobody wrote a note for. That is how the site sat on 4.19.10 while 4.21.1
// was the live release: the product repo's release checklist had no step for this repo, so
// nothing ever noticed. This asks the public chart indexes what is live, and compares.
//
// The indexes are served from hotloop.io itself, so no token and no private repo is read. A
// release is live when its chart is in the index, which is the last thing a release publishes.
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SITE_URL || 'https://hotloop.io';

// product folder in src/content/releases, chart index path, and the release line's name
const LINES = [
  { dir: 'core', index: '/hotloop/index.yaml', name: 'HotLoop core' },
  { dir: 'flow', index: '/hotloop-flow/index.yaml', name: 'Flow' },
  { dir: 'cascade', index: '/hotloop-cascade/index.yaml', name: 'Cascade' },
];

const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const failures = [];

for (const { dir, index, name } of LINES) {
  const res = await fetch(BASE + index, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) { failures.push(`${name}: ${BASE}${index} answered ${res.status}, so what is live could not be read`); continue; }
  const versions = [...(await res.text()).matchAll(/^\s+version:\s*"?(\d+\.\d+\.\d+)"?\s*$/gm)].map((m) => m[1]);
  if (versions.length === 0) { failures.push(`${name}: no version found in ${BASE}${index}`); continue; }
  const live = versions.sort(cmp).at(-1);
  const notes = readdirSync(resolve(root, 'src/content/releases', dir))
    .filter((f) => /^\d+\.\d+\.\d+\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort(cmp);
  const mine = notes.at(-1);
  if (cmp(live, mine) > 0) failures.push(`${name}: ${live} is live and the newest note on this site is ${mine}. Add src/content/releases/${dir}/${live}.md and bump the version constant in src/lib/products.ts.`);
  else console.log(`${name}: ${mine} on the site, ${live} live`);
}

if (failures.length) {
  console.error('hotloop.io is behind:\n' + failures.map((f) => '  ' + f).join('\n'));
  process.exit(1);
}
