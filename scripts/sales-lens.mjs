// hotloop.io is a sales document. It says what HotLoop does for a plant, not how it is
// built inside, so API routes, internal package paths, chart names and upstream or
// runtime names never reach a page. Two things use this file:
//
//   import-flow-compat.mjs  runs `scrub` over every generated note, so a rerun of the
//                           importer cannot bring them back.
//   sales-lens-check.mjs    runs `scan` over the built site and fails the build if any
//                           of them shows up, from the importer or from a hand edit.

// Rewrites, applied in order. Each one turns an internal detail into what it means.
export const SCRUB = [
  [/ \((?:GET|POST|PUT|PATCH|DELETE) \/[^)]*\)/g, ''],
  [/ as a Model Context Protocol tool at \/mcp,/g, ' as an agent tool,'],
  [/ at \/mcp\b/g, ''],
  [/Runs on goja, a JavaScript interpreter written in Go, rather than Node's vm module\./g, "Runs on our own sandboxed JavaScript engine rather than Node's vm module."],
  [/, targeting the App Store's influxdb-app\./g, ', targeting the InfluxDB in the EmberNet App Store.'],
  [/Targets the App Store's postgresql-app and timescale-db-pod, which share a wire protocol\./g, 'Targets the PostgreSQL and TimescaleDB apps in the EmberNet App Store.'],
  [/Targets the App Store's influxdb-app\./g, 'Targets the InfluxDB in the EmberNet App Store.'],
  [/Dashboard 2 \(FlowFuse\)/g, 'Dashboard 2'],
];

export const scrub = (s) => SCRUB.reduce((t, [re, to]) => t.replace(re, to), s);

// What must never appear on a built page. Each entry says why.
export const INTERNAL = [
  [/\b(?:GET|POST|PUT|PATCH|DELETE) \/(?:api|mcp|static|next)\b/, 'an API route'],
  [/\/api\/[a-z]/, 'an API route'],
  [/HOTLOOP_[A-Z0-9_]{3,}/, 'a setting name'],
  [/\bgoja\b/i, 'an upstream engine name'],
  [/\binternal\/[a-z]/, 'an internal package path'],
  [/\b(?:timescale-db-pod|postgresql-app|influxdb-app)\b/, 'an internal chart name'],
  [/FlowFuse/, 'an upstream product name'],
  [/Keycloak|OpenZiti|\bZiti\b/, 'an upstream name EmberNet rebrands'],
];

export function scan(label, text) {
  const hits = [];
  for (const [re, why] of INTERNAL) {
    const m = re.exec(text);
    if (m) hits.push(`${label}: "${m[0]}" (${why}) near: ${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ')}`);
  }
  return hits;
}
