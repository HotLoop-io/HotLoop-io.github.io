// hotloop.io keeps its copy in per-language catalogs (src/i18n/<code>.json, and src/i18n/seo-en.ts for the English
// search titles), so a page's imports do not show where its words live. This adds them, key by key:
//
//   1. A catalog key is named by a prefix (fw.title belongs to Flow, gw.* to Gateway). A page's catalog keys are
//      every key whose prefix its own source mentions, minus the prefixes the shared chrome mentions.
//   2. Each key's last change is read from the catalog's own git history: the commits that touched the file are
//      replayed and a key is dated by the newest commit where its value differs from the one before.
//   3. A page's date from the catalog is the newest key it uses, in the language of the page.
//
// So an edit to the Spanish Gateway paragraph moves /es/gateway/ and nothing else. Without history (the dates-file
// build) it falls back to the date of the whole catalog file.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const I18N = 'src/i18n';
const cache = new Map();

const parseCatalog = (file, text) => {
  const out = new Map();
  if (file.endsWith('.json')) {
    for (const [k, v] of Object.entries(JSON.parse(text))) out.set(k, String(v));
  } else {
    for (const m of text.matchAll(/^\s*['"]([\w.-]+)['"]:\s*(.+?),?\s*$/gm)) out.set(m[1], m[2]);
  }
  return out;
};

/** key -> ISO date of the newest commit that changed its value. */
function keyDates(file, git) {
  if (cache.has(file)) return cache.get(file);
  const commits = git('log', '--no-renames', '--format=%H %aI', '--', file).trim().split('\n').filter(Boolean)
    .map((l) => { const [h, d] = l.split(' '); return { h, d: new Date(d).toISOString().replace(/\.\d+Z$/, 'Z') }; })
    .reverse();
  const dates = new Map();
  let prev = new Map();
  for (const { h, d } of commits) {
    let cur;
    try { cur = parseCatalog(file, git('show', `${h}:${file}`)); } catch { continue; }
    for (const [k, v] of cur) if (prev.get(k) !== v && (!dates.has(k) || d > dates.get(k))) dates.set(k, d);
    prev = cur;
  }
  cache.set(file, dates);
  return dates;
}

let prefixes = null;
const prefixesOf = (read) => {
  if (!prefixes) prefixes = new Set([...parseCatalog(`${I18N}/en.json`, read(`${I18N}/en.json`)).keys()].map((k) => k.split('.')[0]));
  return prefixes;
};
const used = (text, all) => {
  const hit = new Set();
  for (const p of all) if (new RegExp(`['"\`]${p}\\.`).test(text)) hit.add(p);
  return hit;
};

const texts = new Map();
const textOf = (f) => { if (!texts.has(f)) texts.set(f, readFileSync(f, 'utf8')); return texts.get(f); };
const code = (f) => /\.(astro|ts)$/.test(f);

// A prefix half the pages use is chrome (the nav, the footer, the shared buttons), not that page's own words.
let chromePrefixes = null;
const chromeOf = (ownOf, all) => {
  if (chromePrefixes) return chromePrefixes;
  const n = new Map();
  for (const files of ownOf.values()) for (const p of used(files.filter(code).map(textOf).join('\n'), all)) n.set(p, (n.get(p) ?? 0) + 1);
  chromePrefixes = new Set([...n].filter(([, c]) => c / ownOf.size >= 0.5).map(([p]) => p));
  return chromePrefixes;
};

export function extraDates({ url, own, ownOf, dateOf, history, git }) {
  const all = prefixesOf(textOf);
  const chrome = chromeOf(ownOf, all);

  const first = new URL(url).pathname.split('/')[1] ?? '';
  const files = readdirSync(I18N).filter((f) => f.endsWith('.json'));
  const lang = files.map((f) => f.replace(/\.json$/, '')).find((c) => c !== 'en' && c.toLowerCase() === first) ?? 'en';

  const mine = [...used(own.filter(code).map(textOf).join('\n'), all)].filter((p) => !chrome.has(p));
  const catalogs = lang === 'en' ? [`${I18N}/en.json`, `${I18N}/seo-en.ts`] : [`${I18N}/${lang}.json`];
  const out = [];
  for (const cat of catalogs) {
    if (!existsSync(cat)) continue;
    if (!history) { out.push(dateOf(cat)); continue; }
    for (const [k, d] of keyDates(cat, git)) if (mine.includes(k.split('.')[0])) out.push(d);
  }
  return out;
}
