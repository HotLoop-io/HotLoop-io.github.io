// Audits the BUILT site (dist/) for the things search engines actually check, and
// fails the build if any of them regress. Run after `astro build`.
//
//   node scripts/seo-audit.mjs [dist]
//
// It exists for the same reason the content schemas do: a rule that only lives in
// someone's head is broken within a month. Every check below is a thing that has
// gone wrong on a real site.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { parse } from 'node-html-parser';
import { NOT_IN_SITEMAP } from './sitemap-exclude.mjs';

const dist = process.argv[2] || 'dist';
const SITE = process.env.SITE_URL || null;

const TITLE_MAX = 60;       // Google truncates around 600px, roughly 60 characters
const TITLE_MIN = 15;
const DESC_MIN = 70;
const DESC_MAX = 160;       // truncated around 155 to 160
// Chinese, Japanese and Korean carry about twice the meaning per character and Google counts them by
// pixel width, so their windows are lower. These are the limits scripts/i18n-check.mjs applies to the catalogs.
const CJK = /^(ja|ko|zh)/i;
const limits = (lang) => (CJK.test(lang || '') ? { tMax: 40, tMin: 15, dMin: 30, dMax: 110 } : { tMax: TITLE_MAX, tMin: TITLE_MIN, dMin: DESC_MIN, dMax: DESC_MAX });

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

const files = walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const routeOf = (f) => {
  let r = '/' + relative(dist, f).split(sep).join('/');
  return r.replace(/index\.html$/, '');
};
const exists = new Set(files.map((f) => '/' + relative(dist, f).split(sep).join('/')));

const errors = [];
const warnings = [];
const err = (route, msg) => errors.push(`${route}  ${msg}`);
const warn = (route, msg) => warnings.push(`${route}  ${msg}`);

// No unreleased product, and none of our own build inside, anywhere a reader or a search engine can get at it:
// every text file in dist, the search index (Pagefind's fragments are gzip), and the sources the
// social cards are drawn from, because the card text is outlined into the PNG and can't be grepped.
{
  const { scan } = await import('./forbidden.mjs');
  const { gunzipSync } = await import('node:zlib');
  const TEXT = /\.(html|xml|txt|json|css|js|mjs|svg|webmanifest|yaml|yml|md)$/i;
  for (const f of files) {
    const rel = '/' + relative(dist, f).split(sep).join('/');
    let buf;
    if (TEXT.test(f)) buf = readFileSync(f);
    else if (/\/pagefind\//.test(rel)) {
      const raw = readFileSync(f);
      const at = raw.indexOf(Buffer.from([0x1f, 0x8b]));
      try { buf = at >= 0 ? gunzipSync(raw.subarray(at)) : raw; } catch { buf = raw; }
    } else continue;
    for (const h of scan(rel, buf.toString('utf8'))) err('forbidden', h);
  }
  const root = join(dist, '..');
  for (const f of [join(root, 'scripts', 'og.mjs')]) if (existsSync(f)) for (const h of scan('scripts/og.mjs', readFileSync(f, 'utf8'))) err('forbidden', h);
}

// A release line with published notes must read as released, at its newest published version.
// The release notes in src/content/releases are the one source: the home page chips, the
// Transmitter page and the version constants in src/lib/products.ts all have to agree with them.
// This is the check that would have failed on the home page saying "not released yet" for every
// line while all four were shipped.
{
  const root = join(dist, '..');
  const dir = join(root, 'src', 'content', 'releases');
  const newest = {};
  for (const product of readdirSync(dir)) {
    for (const f of readdirSync(join(dir, product))) {
      if (!f.endsWith('.md')) continue;
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(dir, product, f), 'utf8'))?.[1] ?? '';
      const version = /^version:\s*"?([\d.]+)"?/m.exec(fm)?.[1];
      const published = /^published:\s*true/m.test(fm);
      if (!version || !published) continue;
      const cur = newest[product];
      if (!cur || version.localeCompare(cur, undefined, { numeric: true }) > 0) newest[product] = version;
    }
  }
  const LABEL = { core: 'HotLoop core', flow: 'Flow', cascade: 'Cascade', codesys: 'HotLoop for CODESYS', transmitter: 'Transmitter' };
  const home = existsSync(join(dist, 'index.html')) ? readFileSync(join(dist, 'index.html'), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '';
  for (const [product, label] of Object.entries(LABEL)) {
    const v = newest[product];
    if (!v) { err('/', `${label} has no published release note, so the lineup cannot show it as released`); continue; }
    if (!home.includes(`${label} line, ${v}`)) err('/', `${label} has published notes (newest ${v}) but the home page does not show "${label} line, ${v}"`);
    if (home.includes(`${label} line, not released yet`)) err('/', `the home page says "${label} line, not released yet" and the notes say ${v} is published`);
  }
  const tx = join(dist, 'transmitter', 'index.html');
  if (newest.transmitter && existsSync(tx) && /not released yet/i.test(readFileSync(tx, 'utf8'))) err('/transmitter/', `says "not released yet" and the notes say ${newest.transmitter} is published`);
  const consts = readFileSync(join(root, 'src', 'lib', 'products.ts'), 'utf8');
  const pin = (name, re, want) => { const got = re.exec(consts)?.[1]; if (got !== want) err('src/lib/products.ts', `${name} is ${got} and the newest published note is ${want}`); };
  pin('CURRENT', /export const CURRENT = '([\d.]+)'/, newest.core);
  pin('CASCADE', /export const CASCADE = '([\d.]+)'/, newest.cascade);
  pin('CODESYS.version', /export const CODESYS = \{[^}]*?version: '([\d.]+)'/, newest.codesys);
  pin('TRANSMITTER.version', /export const TRANSMITTER = \{[^}]*?version: '([\d.]+)'/, newest.transmitter);
}

const alternatesByRoute = new Map();
const titles = new Map();
const descs = new Map();
const idsByRoute = new Map();
const linksByRoute = new Map();
let pages = 0;

for (const f of htmlFiles) {
  const route = routeOf(f);
  const src = readFileSync(f, 'utf8');
  const root = parse(src);

  // Redirect stubs and internal test files are not pages a crawler should index.
  if (/http-equiv=["']refresh["']/i.test(src) || route.startsWith('/__')) continue;

  const is404 = route.endsWith('/404.html') || route === '/404/';
  pages++;

  // ids on the page, for fragment checks
  idsByRoute.set(route, new Set(root.querySelectorAll('[id]').map((n) => n.getAttribute('id'))));
  linksByRoute.set(
    route,
    root.querySelectorAll('a[href]').map((a) => a.getAttribute('href')).filter(Boolean),
  );

  // <html lang>
  const lang = root.querySelector('html')?.getAttribute('lang');
  if (!lang) err(route, 'missing <html lang>');

  // title
  const title = root.querySelector('title')?.text.trim();
  if (!title) err(route, 'missing <title>');
  else {
    const L = limits(lang);
    if ([...title].length > L.tMax) err(route, `title is ${title.length} chars, over ${L.tMax}: "${title}"`);
    if ([...title].length < L.tMin) warn(route, `title is only ${title.length} chars: "${title}"`);
    if (!is404) {
      if (titles.has(title)) err(route, `duplicate title with ${titles.get(title)}: "${title}"`);
      titles.set(title, route);
    }
  }

  // description
  const desc = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  if (!desc) { if (!is404) err(route, 'missing meta description'); }
  else {
    const L = limits(lang);
    if ([...desc].length > L.dMax) err(route, `description is ${desc.length} chars, over ${L.dMax}`);
    if ([...desc].length < L.dMin) err(route, `description is only ${desc.length} chars, under ${L.dMin}`);
    if (descs.has(desc)) err(route, `duplicate description with ${descs.get(desc)}`);
    descs.set(desc, route);
  }

  // exactly one h1
  const h1 = root.querySelectorAll('h1').filter((h) => !h.closest('[hidden]'));
  if (!is404 && h1.length !== 1) err(route, `has ${h1.length} <h1>, want exactly 1`);

  // headings never skip a level going down (h2 straight to h4), which is what
  // Lighthouse's heading-order audit fails and what a screen reader's outline shows
  let prevLevel = 0;
  for (const h of root.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    if (h.closest('[hidden]')) continue;
    const level = Number(h.tagName[1]);
    if (prevLevel && level > prevLevel + 1) {
      err(route, `heading jumps from h${prevLevel} to h${level}: "${h.text.trim().slice(0, 50)}"`);
    }
    prevLevel = level;
  }

  // a column header with no text leaves every cell under it unlabeled
  for (const th of root.querySelectorAll('th')) {
    if (!th.text.trim() && !th.querySelector('img, svg')) err(route, 'table has an empty <th>');
  }

  // canonical: present, absolute, and it points at this very page
  const canon = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!canon) { if (!is404) err(route, 'missing canonical'); }
  else {
    if (!/^https:\/\//.test(canon)) err(route, `canonical is not absolute https: ${canon}`);
    let path;
    try { path = new URL(canon).pathname; } catch { path = canon; }
    if (!is404 && path !== route) err(route, `canonical points elsewhere: ${canon}`);
    if (SITE && !canon.startsWith(SITE)) err(route, `canonical is not on ${SITE}: ${canon}`);
  }

  // language: the folder a page sits in says which language it is, and <html lang> and dir have to agree
  {
    const folder = /^\/([a-z]{2}(?:-[a-z]+)?)\//.exec(route)?.[1];
    const tagOf = { 'zh-hans': 'zh-Hans' };
    const LANG_FOLDERS = ['es', 'fr', 'it', 'de', 'nb', 'bg', 'el', 'ko', 'ja', 'vi', 'hi', 'zh-hans', 'ar'];
    const want = folder && LANG_FOLDERS.includes(folder) ? (tagOf[folder] || folder) : 'en';
    if (lang && lang !== want) err(route, `<html lang="${lang}"> on a page that should be ${want}`);
    const dir = root.querySelector('html')?.getAttribute('dir');
    if (want === 'ar' && dir !== 'rtl') err(route, 'Arabic page without dir="rtl"');
    if (want !== 'ar' && dir && dir !== 'ltr') err(route, `dir="${dir}" on a left-to-right page`);
    const alts = root.querySelectorAll('link[rel="alternate"][hreflang]').map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')]);
    alternatesByRoute.set(route, { want, alts });
  }

  // social
  for (const p of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!root.querySelector(`meta[property="${p}"]`)) { if (!is404) err(route, `missing ${p}`); }
  }
  const og = root.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (og && !/^https:\/\//.test(og)) err(route, `og:image is not absolute: ${og}`);
  if (og) {
    try {
      const ogPath = new URL(og).pathname;
      if (!exists.has(ogPath)) err(route, `og:image does not exist in the build: ${ogPath}`);
    } catch {}
  }
  if (!root.querySelector('meta[name="twitter:card"]')) { if (!is404) err(route, 'missing twitter:card'); }

  // structured data must at least be valid JSON
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(s.text); } catch (e) { err(route, `invalid JSON-LD: ${e.message}`); }
  }

  // images need alt text (empty is fine, it means decorative; absent is not)
  for (const img of root.querySelectorAll('img')) {
    if (img.getAttribute('alt') === undefined) err(route, `<img> without alt: ${img.getAttribute('src')}`);
  }

  // the 404 page must not be indexed
  if (is404 && !/noindex/i.test(root.querySelector('meta[name="robots"]')?.getAttribute('content') || '')) {
    err(route, '404 page is missing <meta name="robots" content="noindex">');
  }

  // it should never be noindex by accident on a real page
  if (!is404 && /noindex/i.test(root.querySelector('meta[name="robots"]')?.getAttribute('content') || '')) {
    err(route, 'a real page is marked noindex');
  }
}

// hreflang: every language version lists all the others and itself, the lists agree, every target is a real
// page, and x-default is the English one. A page that is English only carries none.
{
  const ALL = ['en', 'es', 'fr', 'it', 'de', 'nb', 'bg', 'el', 'ko', 'ja', 'vi', 'hi', 'zh-Hans', 'ar'];
  for (const [route, { want, alts }] of alternatesByRoute) {
    if (!alts.length) continue;
    const map = new Map(alts);
    for (const tag of [...ALL, 'x-default']) if (!map.has(tag)) err(route, `hreflang is missing ${tag}`);
    for (const [tag, url] of alts) {
      let path;
      try { path = new URL(url).pathname; } catch { err(route, `hreflang ${tag} is not an absolute URL: ${url}`); continue; }
      if (!url.startsWith('https://')) err(route, `hreflang ${tag} is not https: ${url}`);
      if (!alternatesByRoute.has(path)) { err(route, `hreflang ${tag} points at a page that is not in the build: ${path}`); continue; }
      const back = alternatesByRoute.get(path);
      if (back.want !== (tag === 'x-default' ? 'en' : tag)) err(route, `hreflang ${tag} points at ${path}, which is ${back.want}`);
      // reciprocal: the page it points at must point back at this one
      const rev = back.alts.find(([, u]) => new URL(u).pathname === route);
      if (!rev) err(route, `hreflang ${tag} (${path}) does not link back`);
    }
    if (map.get(want) && new URL(map.get(want)).pathname !== route) err(route, `hreflang ${want} is not this page`);
  }
}

// internal links: every one has to land on a real file, and every #fragment on a real id
for (const [route, links] of linksByRoute) {
  for (const raw of new Set(links)) {
    if (/^(https?:|mailto:|tel:|javascript:)/i.test(raw) || raw.startsWith('//')) continue;
    const [pathPart, frag] = raw.split('#');
    const abs = pathPart === '' ? route : posix.normalize(pathPart.startsWith('/') ? pathPart : posix.join(posix.dirname(route), pathPart));
    const candidates = [abs, abs.endsWith('/') ? abs + 'index.html' : abs + '/index.html', abs];
    const hit = candidates.find((c) => exists.has(c));
    if (!hit) { err(route, `broken internal link: ${raw}`); continue; }
    if (frag && hit.endsWith('.html')) {
      const pageRoute = hit.replace(/index\.html$/, '');
      const ids = idsByRoute.get(pageRoute);
      if (ids && !ids.has(frag)) err(route, `link to missing anchor: ${raw}`);
    }
  }
}

// sitemap + robots
const sm = files.find((f) => f.endsWith('sitemap-index.xml'));
if (!sm) err('/', 'no sitemap-index.xml was generated');
for (const f of files.filter((f) => /sitemap-\d+\.xml$/.test(f))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) if (NOT_IN_SITEMAP.test(m[1])) err('/sitemap', `lists a page that is not necessary: ${m[1]}`);
}
if (!exists.has('/robots.txt')) err('/', 'no robots.txt');
else if (!/Sitemap:\s*https:\/\//i.test(readFileSync(join(dist, 'robots.txt'), 'utf8'))) err('/robots.txt', 'does not point at the sitemap');

console.log(`seo-audit: ${pages} pages checked`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); warnings.forEach((w) => console.log('  warn  ' + w)); }
if (errors.length) {
  console.log(`\n${errors.length} problem(s):`);
  errors.forEach((e) => console.log('  FAIL  ' + e));
  process.exit(1);
}
console.log('seo-audit: clean');
