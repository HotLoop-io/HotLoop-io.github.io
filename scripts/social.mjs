// Generates the images every social profile needs, at each platform's exact
// dimensions, from the same mark and the same Inter outlines as the site.
//
//   node scripts/social.mjs <output directory>
//
// Text is converted to outlined paths, never a live <text> element, for the same
// reason as everywhere else: the renderer has no idea what Inter is and would
// substitute whatever the machine has.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const out = process.argv[2];
if (!out) { console.error('usage: node scripts/social.mjs <output directory>'); process.exit(1); }
mkdirSync(out, { recursive: true });

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Token values from brand/tokens.css. A script cannot import CSS custom
// properties, so these are the one place hex values may live.
const T = { bg: '#14120F', ink: '#F5F3EF', soft: '#A6A29A', orange: '#FF5A00', amber: '#FFB700' };

const load = (w) => opentype.parse(readFileSync(resolve(root, `node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff`)).buffer);
const bold = load(800), regular = load(500);

function measure(font, text, size, tracking = 0) {
  const s = size / font.unitsPerEm; let w = 0, prev = null;
  for (const ch of text) { const g = font.charToGlyph(ch); if (prev) w += font.getKerningValue(prev, g) * s; w += g.advanceWidth * s + tracking; prev = g; }
  return w;
}
function pathFor(font, text, size, x, y, tracking = 0) {
  const p = new opentype.Path(); const s = size / font.unitsPerEm; let pen = x, prev = null;
  for (const ch of text) { const g = font.charToGlyph(ch); if (prev) pen += font.getKerningValue(prev, g) * s; p.extend(g.getPath(pen, y, size)); pen += g.advanceWidth * s + tracking; prev = g; }
  return p.toPathData(2);
}

const defs = `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="${T.amber}"/><stop offset="100%" stop-color="${T.orange}"/></linearGradient></defs>`;

// The mark, from the same geometry as brand/logo-mark.svg, at any scale.
const mark = (x, y, size, dotScale = 1) => `
  <g transform="translate(${x},${y}) scale(${size / 100})">
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#g)" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="179.1 59.7" transform="rotate(-45 50 50)"/>
    <circle cx="77" cy="23" r="${6 * dotScale}" fill="${T.orange}"/>
  </g>`;

// Mark plus the word, sized by the word's font size. Returns the SVG and its width.
function lockup(x, y, fontSize) {
  const markSize = fontSize * 1.05;
  const gap = fontSize * 0.28;
  const tx = x + markSize + gap;
  const base = y + markSize * 0.5 + fontSize * 0.34;
  const hotW = measure(bold, 'hot', fontSize, -fontSize * 0.02);
  const svg = `${mark(x, y, markSize)}
    <path d="${pathFor(bold, 'hot', fontSize, tx, base, -fontSize * 0.02)}" fill="${T.ink}"/>
    <path d="${pathFor(bold, 'loop', fontSize, tx + hotW, base, -fontSize * 0.02)}" fill="${T.orange}"/>`;
  return { svg, width: tx + hotW + measure(bold, 'loop', fontSize, -fontSize * 0.02) - x, height: markSize };
}

const tagline = (x, y, size) => `<path d="${pathFor(regular, 'Automation loops for the real world.', size, x, y)}" fill="${T.soft}"/>`;
const taglineW = (size) => measure(regular, 'Automation loops for the real world.', size);

const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}<rect width="${w}" height="${h}" fill="${T.bg}"/>${body}</svg>`;
const png = async (name, svg) => { await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(out, name)); console.log('wrote', name); };

// A profile picture is the mark alone. At YouTube's rendered 98px and Reddit's
// circular 256px the word would be illegible, so it never appears in an avatar.
// The mark is centered inside the circular crop's safe area.
// The dash gap makes the ring's visible centre sit low, so it is lifted 4% to look centred.
const avatar = (size) => wrap(size, size, mark(size * 0.16, size * 0.12, size * 0.68));

// A banner: centered lockup over a tagline, with a large faint ring behind it.
function banner(w, h, opts) {
  const { fontSize, safeW = w, safeH = h, cx = w / 2, cy = h / 2, ringX, ringSize } = opts;
  const lk = lockup(0, 0, fontSize);
  const tSize = fontSize * 0.32;
  const totalH = lk.height + fontSize * 0.42 + tSize;
  const left = cx - lk.width / 2;
  const top = cy - totalH / 2;
  const lockSvg = `<g transform="translate(${left},${top})">${lk.svg}</g>`;
  const tagX = cx - taglineW(tSize) / 2;
  const tagY = top + lk.height + fontSize * 0.42 + tSize * 0.85;
  const ring = `<g opacity="0.16">${mark(ringX ?? w * 0.78, (h - ringSize) / 2, ringSize)}</g>`;
  return wrap(w, h, `${ring}${lockSvg}${tagline(tagX, tagY, tSize)}`);
}

await png('avatar-512.png', avatar(512));          // GitHub org, X, YouTube, Discord
await png('reddit-icon-256.png', avatar(256));
await png('reddit-banner-1920x384.png', banner(1920, 384, { fontSize: 92, ringX: 1500, ringSize: 520 }));
await png('x-header-1500x500.png', banner(1500, 500, { fontSize: 104, cx: 800, ringX: 1170, ringSize: 560 }));
// YouTube crops hard. Only the central 1546x423 is guaranteed visible on every
// device, so the lockup lives inside it and the rest is atmosphere.
await png('youtube-banner-2560x1440.png', banner(2560, 1440, { fontSize: 190, safeW: 1546, safeH: 423, ringX: 1960, ringSize: 1150 }));
await png('discord-icon-512.png', avatar(512));
console.log('done');
