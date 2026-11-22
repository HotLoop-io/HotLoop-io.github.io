// Rewrites src/content/releases-i18n/pending.json from the files: for each language, the English release entries that have no
// translation in src/content/releases-i18n yet. Run it after adding translations; the list only shrinks.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loc = readFileSync(join(root, 'src', 'i18n', 'locales.ts'), 'utf8');
const langs = [...loc.matchAll(/\{ code: '([^']+)', path: '([^']*)'/g)].map((m) => ({ code: m[1], path: m[2] })).filter((l) => l.code !== 'en');
const ids = [];
for (const product of readdirSync(join(root, 'src', 'content', 'releases'))) {
  for (const f of readdirSync(join(root, 'src', 'content', 'releases', product)).filter((f) => f.endsWith('.md'))) ids.push(`${product}/${f.slice(0, -3)}`);
}
// Newest first inside a language is not needed; keep the same order as the English folders so diffs stay small.
const out = {};
for (const { code, path } of langs) {
  const miss = ids.filter((id) => !existsSync(join(root, 'src', 'content', 'releases-i18n', path, `${id}.md`)));
  if (miss.length) out[code] = miss;
}
writeFileSync(join(root, 'src', 'content', 'releases-i18n', 'pending.json'), JSON.stringify(out, null, 1) + '\n');
console.log(Object.entries(out).map(([c, m]) => `${c}: ${m.length}`).join(', ') || 'nothing pending');
