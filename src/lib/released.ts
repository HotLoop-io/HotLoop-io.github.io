// Whether a release line is out, and at what version, comes from one place: the release notes
// in src/content/releases. A line is released when it has a note marked published, and its
// version is the newest of those. Nothing here is set by hand, so a page cannot say "not
// released yet" about a line that has published notes. scripts/seo-audit.mjs checks the built
// pages against the same files.
type Note = { data: { product: string; version: string; published: boolean } };

export const latestPublished = <T extends Note>(releases: T[], product: string): T | undefined =>
  releases
    .filter((r) => r.data.product === product && r.data.published)
    .sort((a, b) => b.data.version.localeCompare(a.data.version, undefined, { numeric: true }))[0];
