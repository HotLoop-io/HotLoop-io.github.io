// A card shows a short lead, and the rest of its text sits in a details block on
// the same card. Nothing is cut: the lead is whole sentences from the front of the
// text, up to about max words, and everything after it is the remainder.
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function lead(text: string, max = 30): [string, string] {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
  let head = sentences[0];
  let i = 1;
  while (i < sentences.length && words(head) + words(sentences[i]) <= max) {
    head += ' ' + sentences[i];
    i++;
  }
  const rest = sentences.slice(i).join(' ');
  // One sentence that is itself far too long: break it at the last comma inside the
  // first max words and carry the remainder into the fold, so nothing is cut.
  if (i === 1 && words(head) > max + 10) {
    const w = head.split(/\s+/);
    let cut = -1;
    for (let k = 0; k < max && k < w.length; k++) if (w[k].endsWith(',')) cut = k;
    if (cut > 5) {
      const first = w.slice(0, cut + 1).join(' ').replace(/,$/, '') + '\u2026';
      const second = '\u2026' + w.slice(cut + 1).join(' ');
      return [first, rest ? second + ' ' + rest : second];
    }
  }
  return [head, rest];
}
