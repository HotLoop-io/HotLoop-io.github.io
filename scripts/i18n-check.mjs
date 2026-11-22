// Checks the language catalogs before the build. A page in thirteen languages is only as good as the
// weakest string, so this fails on the things that have gone wrong in other products' catalogs:
//   - a language that lacks a key English has, or has one English does not
//   - a changed {placeholder}, or a changed or missing link (the href has to survive translation)
//   - an empty string, or one left exactly as the English (allowed only for names and short tokens)
//   - a product, protocol or brand name that is in the English and gone from the translation
//   - an em or en dash, which none of our copy uses in any language
//   - the language list in astro.config.mjs and src/i18n/locales.ts disagreeing
// The glossary the terms come from is the codex term base (work/notes/i18n/glossary), the same one the
// products use; product and protocol names are the ones in its do-not-translate list.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'i18n');
const load = (c) => JSON.parse(readFileSync(join(dir, `${c}.json`), 'utf8'));

const loc = readFileSync(join(dir, 'locales.ts'), 'utf8');
const codes = [...loc.matchAll(/\{ code: '([^']+)', path: '([^']*)'/g)].map((m) => ({ code: m[1], path: m[2] }));
const en = load('en');
const errors = [];
const err = (c, k, m) => errors.push(`${c}${k ? ' ' + k : ''}: ${m}`);

if (codes.length !== 14) err('locales.ts', '', `expected 14 languages, found ${codes.length}`);
const cfg = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
for (const { code, path } of codes) {
  if (path && !new RegExp(`['"]?${path.replace(/-/g, '-')}['"]?:\\s*'`).test(cfg)) err('astro.config.mjs', '', `language folder "${path}" is not in LANGS`);
}
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  if (!codes.some((c) => `${c.code}.json` === f)) err(f, '', 'catalog for a language that is not in locales.ts');
}

// Names that stay exactly as written, wherever the English has them.
const NAMES = [
  'HotLoop for CODESYS', 'Edge Relay', 'HotLoop', 'EmberNet', 'Fireball Industries', 'Fireball', 'Node-RED', 'OPC UA',
  'Modbus', 'EtherNet/IP', 'Sparkplug B', 'MQTT', 'ISA-18.2', 'Raspberry Pi', 'Kubernetes', 'PostgreSQL', 'TimescaleDB',
  'SQLite', 'CODESYS', 'UniFi', 'DayGlo', 'Shepherd Boy Farms', 'Trane Technologies', 'Gold Licensee', 'Pilot', 'Starter',
  'Flow', 'Cascade', 'Transmitter', 'Gateway', 'IoT', 'Siemens S7', 'Go', 'MCP', 'Helm',
];
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const hrefs = (s) => [...s.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).sort().join(',');
// A translation may keep a name inside a link or beside a letter of its own script (Arabic joins "و" to the
// next word), so look for the name anywhere in the string.
const norm = (s) => s.replace(/-/g, ' ');
const has = (s, name) => norm(s).includes(norm(name));

for (const { code } of codes) {
  if (code === 'en') continue;
  const c = load(code);
  for (const k of Object.keys(en)) if (!(k in c)) err(code, k, 'missing');
  for (const k of Object.keys(c)) if (!(k in en)) err(code, k, 'not in English');
  for (const [k, e] of Object.entries(en)) {
    const v = c[k];
    if (v === undefined) continue;
    if (!v.trim()) { err(code, k, 'empty'); continue; }
    if (placeholders(e) !== placeholders(v)) err(code, k, `placeholders differ: ${placeholders(e)} vs ${placeholders(v)}`);
    if (hrefs(e) !== hrefs(v)) err(code, k, `links differ: ${hrefs(e)} vs ${hrefs(v)}`);
    if (/[–—]/.test(v)) err(code, k, 'has an em or en dash');
    for (const n of NAMES) {
      // "Gateway mode" is a mode name, not the product; "Edge" alone is covered by Edge Relay and the product line names.
      if (n === 'Gateway' && k.startsWith('t.gateway-mode')) continue;
      // "Go on, try ..." is the English phrase, not the Go language.
      if (n === 'Go' && k === 'wg.heading') continue;
      if (n === 'Flow' && /\bFlow\b/.test(e) === false) continue;
      if (new RegExp(`(^|[^A-Za-z])${norm(n).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([^A-Za-z]|$)`).test(norm(e)) && !has(v, n)) err(code, k, `"${n}" is in the English and gone from the translation`);
    }
    if (v === e && e.length > 24 && !/docs\.hotloop\.io/.test(e)) err(code, k, 'identical to the English');
  }
}

// The protocol pages draw their text from src/data/protocols.json in English and from the catalogs in every other
// language, so the English catalog has to say exactly what the data file says, or a data edit would leave the
// translations describing something else.
{
  const data = JSON.parse(readFileSync(join(root, 'src', 'data', 'protocols.json'), 'utf8'));
  const want = {};
  for (const p of data) {
    p.verifiedAgainst.forEach((v, i) => (want[`pr.${p.id}.va${i + 1}`] = v));
    want[`pr.${p.id}.sum`] = p.summary;
    p.body.forEach((v, i) => (want[`pr.${p.id}.b${i + 1}`] = v));
    if (p.trap) want[`pr.${p.id}.trap`] = p.trap;
    if ((p.notVerifiedNote || '').trim()) want[`pr.${p.id}.nvn`] = p.notVerifiedNote;
    if ((p.notVerifiedHeading || '').trim()) want[`pr.${p.id}.nvh`] = p.notVerifiedHeading;
  }
  for (const [k, v] of Object.entries(want)) {
    if (en[k] === undefined) err('en', k, 'protocols.json has this text and the catalog does not');
    else if (en[k] !== v) err('en', k, 'differs from protocols.json, update the catalog and every language');
  }
  for (const k of Object.keys(en)) if (/^pr\./.test(k) && !(k in want)) err('en', k, 'is not in protocols.json');
}

// Length rules the SEO audit applies to titles and descriptions, checked here too so a catalog fails fast.
// Chinese, Japanese and Korean carry about twice the meaning per character, so their limits are lower.
const CJK = new Set(['ja', 'ko', 'zh-Hans']);
for (const { code } of codes) {
  const c = load(code);
  for (const k of Object.keys(c).filter((k) => /\.(title|desc)$/.test(k) && k !== 'i.title')) {
    const n = [...c[k].replace(/\{version\}/g, '4.23.6')].length;
    const title = k.endsWith('.title');
    const [lo, hi] = title ? [15, CJK.has(code) ? 40 : 60] : CJK.has(code) ? [30, 110] : [70, 160];
    if (n < lo || n > hi) err(code, k, `${title ? 'title' : 'description'} is ${n} characters, wants ${lo} to ${hi}`);
  }
}

if (errors.length) {
  console.error(`i18n-check: ${errors.length} problem(s)`);
  for (const e of errors) console.error('  FAIL  ' + e);
  process.exit(1);
}
console.log(`i18n-check: ${codes.length} languages, ${Object.keys(en).length} keys each, clean`);
