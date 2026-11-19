// Words that never appear on a public HotLoop surface. A product that has not shipped is not on the
// page: add its pattern here as [regex, reason]. The build fails on a match, in the generated pages, the
// built HTML, the search index, and the strings the social cards are drawn from.
export const FORBIDDEN = [];

// Returns one line per match, with a little of the text around it.
export function scan(label, text) {
  const hits = [];
  for (const [re, why] of FORBIDDEN) {
    const m = re.exec(text);
    if (m) hits.push(`${label}: "${m[0]}" (${why}) near: ${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ')}`);
  }
  return hits;
}
