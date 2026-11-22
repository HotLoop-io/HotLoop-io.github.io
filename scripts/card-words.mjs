// Audits the BUILT site (dist/) for dense cards: a card shows at most 39 visible
// words, and anything past that is folded inside the card in a <details>. Folded text
// is not counted, and licensing banners and interactive instruments are skipped. Run after `astro build`.
//
//   node scripts/card-words.mjs [dist] [--report]
//
// --report prints every card over the limit and exits 0, so the same script measures
// before and after. Without it, any card over the limit fails the build.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';

const MAX = 39;
// A translated page is read in its own language: Vietnamese spends a word on every syllable, Spanish and
// Greek run a third longer than English for the same sentence. The same card, said in the same space, is
// allowed half again as many words.
const LANG_FOLDERS = ['es', 'fr', 'it', 'de', 'nb', 'bg', 'el', 'ko', 'ja', 'vi', 'hi', 'zh-hans', 'ar'];
const MAX_TRANSLATED = Math.round(MAX * 1.5);
const args = process.argv.slice(2);
const report = args.includes('--report');
const dist = args.find((a) => !a.startsWith('--')) || 'dist';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

const words = (node) => {
  node.querySelectorAll('details, script, style').forEach((d) => d.remove());
  return node.text.split(/\s+/).filter(Boolean).length;
};

let total = 0;
const over = [];
for (const f of walk(dist).filter((p) => p.endsWith('.html'))) {
  const root = parse(readFileSync(f, 'utf8'));
  // A card nested in a folded <details> is already folded; only visible cards count.
  for (const card of root.querySelectorAll('.card')) {
    let hidden = false;
    for (let p = card.parentNode; p; p = p.parentNode) if (p.rawTagName === 'details') hidden = true;
    if (hidden) continue;
    // A licensing banner or call to action is a call to action with buttons, and an instrument (a slider, a
    // switch, a chart you drive) is a widget, not a card of prose. Neither is a feature card.
    if (card.classList.contains('licensing') || card.classList.contains('cta') || card.querySelector('input, button, svg, canvas')) continue;
    total++;
    const title = (card.querySelector('h2, h3, h4, summary, strong')?.text || card.text).trim().replace(/\s+/g, ' ').slice(0, 50);
    const n = words(parse(card.outerHTML));
    const limit = LANG_FOLDERS.includes(f.replace(dist, '').split('/')[1]) ? MAX_TRANSLATED : MAX;
    if (n > limit) over.push({ page: f.replace(dist, '').replace('/index.html', '/'), n, title });
  }
}
over.sort((a, b) => b.n - a.n);
for (const o of over) console.log(`${String(o.n).padStart(4)}  ${o.page}  ${o.title}`);
console.log(`card-words: ${total} cards checked, ${over.length} over ${MAX} visible words`);
if (over.length && !report) process.exit(1);
