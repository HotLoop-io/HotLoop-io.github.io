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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

// The feature lists on the IoT, Edge and Gateway pages are in src/lib/products.ts in English and in the catalogs in every
// other language, keyed by the feature's name. The English catalog has to match the file, or an edit there would leave
// the translations describing something else, and a feature added there needs its keys in every language.
{
  const src = readFileSync(join(root, 'src', 'lib', 'products.ts'), 'utf8');
  const grab = (name) => {
    const i = src.indexOf(`export const ${name}: Feature[] = [`);
    const j = src.indexOf('\n];', i);
    return new Function(`return [${src.slice(src.indexOf('[', i) + 1, j)}]`)();
  };
  const want = {};
  for (const f of [...grab('IOT_FEATURES'), ...grab('EDGE_FEATURES'), ...grab('GATEWAY_FEATURES')]) {
    const k = 'ft.' + f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    want[`${k}.n`] = f.name;
    want[`${k}.d`] = f.note;
  }
  for (const [k, v] of Object.entries(want)) {
    if (en[k] === undefined) err('en', k, 'products.ts has this feature and the catalog does not');
    else if (en[k] !== v) err('en', k, 'differs from products.ts, update the catalog and every language');
  }
  for (const k of Object.keys(en)) if (/^ft\./.test(k) && !(k in want)) err('en', k, 'is not in products.ts');
}

// The node notes on the integrations page: src/data/nodes.json in English, the catalogs in every other language, keyed by
// the node type. The English catalog has to match the file, and a translation keeps every `code` span of its English.
{
  const nodes = JSON.parse(readFileSync(join(root, 'src', 'data', 'nodes.json'), 'utf8'));
  const want = {};
  for (const n of nodes) if (n.notes && n.notes.trim()) want[`nd.${n.type}`] = n.notes;
  for (const [k, v] of Object.entries(want)) {
    if (en[k] === undefined) err('en', k, 'nodes.json has this note and the catalog does not');
    else if (en[k] !== v) err('en', k, 'differs from nodes.json, update the catalog and every language');
  }
  for (const k of Object.keys(en)) if (/^nd\./.test(k) && !(k in want)) err('en', k, 'is not in nodes.json');
  const spans = (s) => [...s.matchAll(/`[^`]+`/g)].map((m) => m[0]).sort().join('|');
  for (const { code } of codes) {
    if (code === 'en') continue;
    const c = load(code);
    for (const k of Object.keys(want)) if (c[k] !== undefined && spans(want[k]) !== spans(c[k])) err(code, k, 'its `code` spans differ from the English');
  }
}

// The release notes. English entries are src/content/releases/<product>/<version>.md; each other language has the same entry,
// translated, at src/content/releases-i18n/<language folder>/<product>/<version>.md. A new English entry fails the build until
// its thirteen translations are in the same PR. src/content/releases-i18n/pending.json lists the entries a language has not caught up
// on yet (the page serves those in English with a note); the list may only shrink: an entry that is translated must come off
// it, and an entry that is not translated and not on it is an error. `node scripts/rel-pending.mjs` rewrites it from the files.
{
  const relDir = join(root, 'src', 'content', 'releases');
  const trDir = join(root, 'src', 'content', 'releases-i18n');
  const parse = (text, file) => {
    const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
    if (!m) { errors.push(`${file}: no front matter`); return null; }
    const fm = { highlights: [], breaking: [] };
    let list = null;
    for (const line of m[1].split('\n')) {
      const item = /^ {2}- (.*)$/.exec(line);
      if (item && list) { try { fm[list].push(JSON.parse(item[1])); } catch { errors.push(`${file}: ${list} item is not a double-quoted string`); } continue; }
      const kv = /^(\w+):\s*(.*)$/.exec(line);
      if (!kv) continue;
      list = null;
      if (kv[1] === 'highlights' || kv[1] === 'breaking') { list = kv[1]; if (kv[2] === '[]') list = null; continue; }
      try { fm[kv[1]] = kv[2].startsWith('"') ? JSON.parse(kv[2]) : kv[2]; } catch { errors.push(`${file}: ${kv[1]} is not a double-quoted string`); }
    }
    return { fm, body: m[2] };
  };
  const english = [];
  for (const product of readdirSync(relDir)) {
    for (const f of readdirSync(join(relDir, product)).filter((f) => f.endsWith('.md'))) {
      const e = parse(readFileSync(join(relDir, product, f), 'utf8'), `releases/${product}/${f}`);
      if (e) english.push({ id: `${e.fm.product}/${e.fm.version}`, ...e });
    }
  }
  const fences = (b) => [...b.matchAll(/^```[^\n]*\n[\s\S]*?^```/gm)].map((m) => m[0]);
  const outside = (b) => b.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
  const all = (e) => [e.fm.summary, ...e.fm.highlights, ...e.fm.breaking, outside(e.body)].join('\n');
  const spans = (e) => [...all(e).matchAll(/`[^`\n]+`/g)].map((m) => m[0]).sort().join('|');
  const urls = (e) => [...(all(e) + e.body).matchAll(/https?:\/\/[^\s)>\]"'`]+|\]\(([^)]+)\)/g)].map((m) => m[0]).sort().join('|');
  const versions = (e) => [...all(e).replace(/`[^`\n]+`/g, '').matchAll(/\b\d+\.\d+\.\d+\b/g)].map((m) => m[0]).sort().join('|');
  const shape = (e) => {
    const b = outside(e.body).split('\n');
    return [
      e.fm.highlights.length, e.fm.breaking.length,
      b.filter((l) => /^#{1,6} /.test(l)).map((l) => l.match(/^#+/)[0].length).join(''),
      b.filter((l) => /^\s*([-*]|\d+\.) /.test(l)).length,
      b.filter((l) => /^\|/.test(l)).length,
      fences(e.body).length,
    ].join('/');
  };
  const pendingFile = join(trDir, 'pending.json');
  const pending = existsSync(pendingFile) ? JSON.parse(readFileSync(pendingFile, 'utf8')) : {};
  let missing = 0, done = 0;
  for (const { code, path } of codes) {
    if (code === 'en') continue;
    const here = join(trDir, path);
    const have = new Set();
    if (existsSync(here)) for (const product of readdirSync(here)) for (const f of readdirSync(join(here, product)).filter((f) => f.endsWith('.md'))) have.add(`${product}/${f.slice(0, -3)}`);
    const wait = new Set(pending[code] ?? []);
    const ids = new Set(english.map((e) => e.id));
    for (const id of have) if (!ids.has(id)) err(code, `releases-i18n/${id}`, 'a translation with no English entry');
    for (const id of wait) if (!ids.has(id)) err(code, `releases-pending ${id}`, 'is not an English entry');
    for (const e of english) {
      const label = `release ${e.id}`;
      if (!have.has(e.id)) {
        if (wait.has(e.id)) { missing++; continue; }
        err(code, label, 'has no translation: add src/content/releases-i18n/' + path + '/' + e.id + '.md in this PR');
        continue;
      }
      if (wait.has(e.id)) err(code, label, 'is translated, take it off pending.json (node scripts/rel-pending.mjs)');
      done++;
      const x = parse(readFileSync(join(here, `${e.id}.md`), 'utf8'), `${path}/${e.id}.md`);
      if (!x) continue;
      if (x.fm.lang !== path || `${x.fm.product}/${x.fm.version}` !== e.id) err(code, label, 'front matter lang, product or version does not match its path');
      if (shape(e) !== shape(x)) err(code, label, `structure differs (highlights/breaking/headings/list items/table rows/code blocks): ${shape(e)} vs ${shape(x)}`);
      if (fences(e.body).join('\n') !== fences(x.body).join('\n')) err(code, label, 'a code block differs from the English');
      if (spans(e) !== spans(x)) err(code, label, 'its `code` spans differ from the English');
      if (urls(e) !== urls(x)) err(code, label, 'a link or URL differs from the English');
      if (versions(e) !== versions(x)) err(code, label, 'a version number differs from the English');
      const v = [x.fm.summary, ...x.fm.highlights, ...x.fm.breaking, x.body].join('\n');
      if (/[–—]/.test(v)) err(code, label, 'has an em or en dash');
      if (!x.fm.summary.trim() || x.fm.highlights.some((h) => !h.trim())) err(code, label, 'has an empty summary or highlight');
      if (x.fm.summary === e.fm.summary && e.fm.summary.length > 24) err(code, label, 'summary is identical to the English');
      const ev = all(e), tv = all(x) + '\n' + outside(x.body);
      for (const n of NAMES) {
        if (new RegExp(`(^|[^A-Za-z])${norm(n).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([^A-Za-z]|$)`).test(norm(ev)) && !has(tv, n) && !has(v, n)) err(code, label, `"${n}" is in the English and gone from the translation`);
      }
    }
  }
  if (!existsSync(trDir) && english.length) err('releases-i18n', '', 'folder is missing');
  console.log(`i18n-check: release notes ${english.length} entries, ${done} translations, ${missing} waiting in pending.json`);
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
