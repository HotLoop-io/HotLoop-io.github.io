// Gives every URL in the built sitemap its real <lastmod>: the date of the last git commit that touched the
// source of that page. Never the build date, so a release that changes three pages moves three dates.
//
//   node scripts/sitemap-lastmod.mjs [dist]                 stamp dist/sitemap-0.xml (and the index and the alias)
//   node scripts/sitemap-lastmod.mjs --dates <file.json>    write every source file's last commit date and stop
//
// What counts as a page's source: its route file under src/pages, every local file it imports (components, data,
// styles, images), the content entries it renders, and, for a dynamic route, only the entry its own slug names.
// A file that most pages import (the layout, the header, the footer, the global styles) is site chrome, not the
// page's own content, and is left out: otherwise one nav edit would stamp every page. "Most" is half the sitemap.
//
// History has to be there. A shallow checkout (actions/checkout without fetch-depth: 0) fails the build instead of
// stamping wrong dates. The one build that runs without .git (a Dockerfile that builds inside the image) reads the
// dates file the release workflow wrote beside it with --dates.
//
// Honest about its limits: a page whose copy lives in a shared data file moves when that file moves.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SRC = 'src';
const PAGES = 'src/pages';
const DATES_FILE = 'lastmod-dates.json';
const CHROME_SHARE = 0.5;

const args = process.argv.slice(2);
const posixPath = (p) => p.split(sep).join('/');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] });

// ---- history ----------------------------------------------------------------------------------------------------
function haveHistory() {
  try {
    if (git('rev-parse', '--is-inside-work-tree').trim() !== 'true') return false;
    return git('rev-parse', '--is-shallow-repository').trim() === 'false';
  } catch { return false; }
}

/** file (relative to the site root) -> ISO date of the newest commit that touched it. */
function fileDatesFromGit() {
  const out = git('log', '--relative', '--name-only', '--no-renames', '--format=%x01%aI', '--', '.');
  const dates = {};
  let cur = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('\x01')) { cur = new Date(line.slice(1)).toISOString().replace(/\.\d+Z$/, 'Z'); continue; }
    if (!line || !cur) continue;
    if (!dates[line] || cur > dates[line]) dates[line] = cur;
  }
  return dates;
}

const HISTORY = haveHistory();
if (args[0] === '--dates') {
  if (!HISTORY) { console.error('sitemap-lastmod: --dates needs the full git history (fetch-depth: 0)'); process.exit(1); }
  const d = fileDatesFromGit();
  writeFileSync(args[1], JSON.stringify(d));
  console.log(`sitemap-lastmod: ${Object.keys(d).length} file dates -> ${args[1]}`);
  process.exit(0);
}

let fileDates;
if (HISTORY) fileDates = fileDatesFromGit();
else if (existsSync(join(ROOT, DATES_FILE))) fileDates = JSON.parse(readFileSync(join(ROOT, DATES_FILE), 'utf8'));
else {
  console.error(`sitemap-lastmod: no full git history and no ${DATES_FILE}.\n` +
    'A shallow checkout would stamp wrong dates, so the build stops. In CI use actions/checkout with fetch-depth: 0.');
  process.exit(1);
}
const NOW = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
// A file git has never seen (an uncommitted edit on a laptop) is dated now. In CI everything is committed.
const dateOf = (f) => fileDates[f] ?? NOW;

// ---- the source tree --------------------------------------------------------------------------------------------
function walk(dir, out = []) {
  if (!existsSync(join(ROOT, dir))) return out;
  for (const e of readdirSync(join(ROOT, dir))) {
    const p = posix.join(dir, e);
    statSync(join(ROOT, p)).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const SRC_FILES = walk(SRC);
const SRC_SET = new Set(SRC_FILES);
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const CODE = /\.(astro|ts|tsx|js|mjs|jsx)$/;
const EXTS = ['', '.astro', '.ts', '.tsx', '.js', '.mjs', '.json', '/index.astro', '/index.ts', '/index.js', '/index.mjs'];

function resolveSpec(from, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const base = posix.normalize(spec.startsWith('/') ? spec.slice(1) : posix.join(posix.dirname(from), spec));
  const clean = base.split('?')[0];
  for (const e of EXTS) if (SRC_SET.has(clean + e)) return clean + e;
  return null;
}

function globToRegex(g) {
  let r = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') { if (g[i + 1] === '*') { r += '.*'; i++; if (g[i + 1] === '/') i++; } else r += '[^/]*'; }
    else if (c === '?') r += '[^/]';
    else r += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${r}$`);
}

// Content collections declared in src/content.config.ts: name -> { root, file? }.
const COLLECTIONS = {};
for (const cfg of ['src/content.config.ts', 'src/content/config.ts']) {
  if (!SRC_SET.has(cfg)) continue;
  const t = read(cfg);
  for (const m of t.matchAll(/const\s+(\w+)\s*=\s*defineCollection\(\{[\s\S]*?loader:\s*(glob|file)\(([^)]*)\)/g)) {
    const [, name, kind, argText] = m;
    if (kind === 'file') COLLECTIONS[name] = { file: posixPath(posix.normalize(argText.match(/['"]([^'"]+)['"]/)[1])) };
    else {
      const base = argText.match(/base:\s*['"]([^'"]+)['"]/);
      COLLECTIONS[name] = { root: posixPath(posix.normalize(base ? base[1] : '.')) };
    }
  }
}

function scan(file) {
  const text = read(file);
  const imports = new Set();
  const globs = [];
  const collections = new Set();
  if (CODE.test(file)) {
    for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)) {
      const r = resolveSpec(file, m[1]);
      if (r) imports.add(r);
    }
    for (const m of text.matchAll(/import\.meta\.glob\(\s*(\[[^\]]*\]|['"][^'"]+['"])/g)) {
      for (const g of m[1].matchAll(/['"]([^'"]+)['"]/g)) {
        if (!g[1].startsWith('.') && !g[1].startsWith('/')) continue;
        const abs = posix.normalize(g[1].startsWith('/') ? g[1].slice(1) : posix.join(posix.dirname(file), g[1]));
        const re = globToRegex(abs);
        for (const f of SRC_FILES) if (re.test(f)) imports.add(f);
        globs.push(abs);
      }
    }
    for (const m of text.matchAll(/\b(?:getCollection|getEntry)\(\s*['"](\w+)['"]/g)) collections.add(m[1]);
  }
  return { imports, collections };
}

const SCANNED = new Map();
const scanned = (f) => { if (!SCANNED.has(f)) SCANNED.set(f, scan(f)); return SCANNED.get(f); };

// ---- routes -----------------------------------------------------------------------------------------------------
const ROUTE_FILES = walk(PAGES).filter((f) => /\.(astro|md|mdx)$/.test(f));
const routes = ROUTE_FILES.map((file) => {
  let segs = posix.relative(PAGES, file).replace(/\.(astro|md|mdx)$/, '').split('/');
  if (segs[segs.length - 1] === 'index') segs.pop();
  const score = segs.reduce((s, x) => s + (x.startsWith('[...') ? 0 : x.startsWith('[') ? 1 : 3), 0);
  return { file, segs, score };
});

function matchRoute(urlPath) {
  const parts = urlPath.replace(/\.html$/, '').replace(/^\/|\/$/g, '').split('/').filter(Boolean).map(decodeURIComponent);
  let best = null;
  for (const r of routes) {
    const params = {};
    let i = 0, ok = true;
    for (const s of r.segs) {
      if (s.startsWith('[...')) { params[s.slice(4, -1)] = parts.slice(i).join('/'); i = parts.length; break; }
      if (i >= parts.length) { ok = s === ''; break; }
      if (s.startsWith('[')) params[s.slice(1, -1)] = parts[i];
      else if (s !== parts[i]) { ok = false; break; }
      i++;
    }
    if (ok && i === parts.length && (!best || r.score > best.score)) best = { ...r, params };
  }
  return best;
}

// ---- dependencies -----------------------------------------------------------------------------------------------
// An optional site hook (scripts/sitemap-lastmod-extra.mjs) adds sources the imports cannot show, for a site whose
// copy lives in per-language catalogs. It gets { url, route, own, ownOf, dateOf, history, git, urls } and returns extra dates.
const extra = existsSync(join(ROOT, 'scripts/sitemap-lastmod-extra.mjs'))
  ? await import(pathToFileURL(join(ROOT, 'scripts/sitemap-lastmod-extra.mjs')).href) : null;

function transitive(file) {
  const seen = new Set();
  const collections = new Set();
  const stack = [file];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (!CODE.test(f)) continue;
    const s = scanned(f);
    for (const c of s.collections) collections.add(c);
    for (const i of s.imports) stack.push(i);
  }
  return { files: seen, collections };
}

function entryFiles(name, params) {
  const c = COLLECTIONS[name];
  if (!c) return [];
  if (c.file) return [c.file];
  const all = SRC_FILES.filter((f) => f === c.root || f.startsWith(c.root + '/'));
  const vals = Object.values(params).filter(Boolean).flatMap((v) => v.split('/'));
  const named = all.filter((f) => {
    const rel = posix.relative(c.root, f).split('/');
    const first = rel[0].replace(/\.[^.]+$/, '');
    return vals.includes(first);
  });
  // A page with a slug of its own depends on its entry; a page without one depends on the whole collection.
  return named.length ? named : all;
}

// ---- the sitemap ------------------------------------------------------------------------------------------------
const dist = args[0] || 'dist';
const sitemapPath = join(dist, 'sitemap-0.xml');
if (!existsSync(sitemapPath)) { console.error(`sitemap-lastmod: ${sitemapPath} is missing`); process.exit(1); }
let xml = readFileSync(sitemapPath, 'utf8');
const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const pageDeps = new Map();
const prevalence = new Map();
for (const url of urls) {
  const route = matchRoute(new URL(url).pathname);
  if (!route) { console.error(`sitemap-lastmod: no page under ${PAGES} renders ${url}`); process.exit(1); }
  const { files, collections } = transitive(route.file);
  const content = new Set();
  for (const c of collections) for (const f of entryFiles(c, route.params)) content.add(f);
  // A dynamic route's own slug names its content: a loader of {slug}.md or {slug}/index.md.
  for (const f of files) prevalence.set(f, (prevalence.get(f) ?? 0) + 1);
  pageDeps.set(url, { route, files, content });
}
const chrome = new Set([...prevalence].filter(([, n]) => urls.length >= 8 && n / urls.length >= CHROME_SHARE).map(([f]) => f));

const ownOf = new Map();
for (const url of urls) {
  const { route, files } = pageDeps.get(url);
  ownOf.set(url, [...files].filter((f) => !chrome.has(f) || f === route.file));
}

const stamps = new Map();
for (const url of urls) {
  const { route, content } = pageDeps.get(url);
  const own = ownOf.get(url);
  const dates = [...own, ...content].map(dateOf);
  if (extra?.extraDates) dates.push(...extra.extraDates({ url, route, own, ownOf, dateOf, history: HISTORY, git, urls }));
  if (!dates.length) { console.error(`sitemap-lastmod: no dated source for ${url}`); process.exit(1); }
  stamps.set(url, dates.sort().pop());
}

// ---- write ------------------------------------------------------------------------------------------------------
xml = xml.replace(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>[^<]*<\/lastmod>)?/g, (_m, loc) => `<url><loc>${loc}</loc><lastmod>${stamps.get(loc)}</lastmod>`);
writeFileSync(sitemapPath, xml);

const newest = [...stamps.values()].sort().pop();
const indexPath = join(dist, 'sitemap-index.xml');
if (existsSync(indexPath)) {
  let ix = readFileSync(indexPath, 'utf8');
  // Only the sitemap this script stamped gets a date. A sitemap another system writes (the blog) keeps its own.
  ix = ix.replace(/<sitemap>\s*<loc>([^<]*\/sitemap-0\.xml)<\/loc>(?:\s*<lastmod>[^<]*<\/lastmod>)?/g, (_m, loc) => `<sitemap><loc>${loc}</loc><lastmod>${newest}</lastmod>`);
  writeFileSync(indexPath, ix);
}
// The /sitemap.xml alias is a copy of the full list: keep it one.
if (existsSync(join(dist, 'sitemap.xml'))) copyFileSync(sitemapPath, join(dist, 'sitemap.xml'));

// ---- self-check -------------------------------------------------------------------------------------------------
const distinct = new Set(stamps.values());
const future = [...stamps].filter(([, d]) => d > NOW);
if (future.length) { console.error(`sitemap-lastmod: dates in the future: ${future.map(([u]) => u).join(', ')}`); process.exit(1); }
if (urls.length > 4 && distinct.size === 1) {
  console.error(`sitemap-lastmod: every one of ${urls.length} URLs got ${[...distinct][0]}. That is a build date in disguise, not history.`);
  process.exit(1);
}
console.log(`sitemap-lastmod: ${urls.length} URLs, ${distinct.size} distinct dates, ${chrome.size} shared chrome files left out, newest ${newest}`);
