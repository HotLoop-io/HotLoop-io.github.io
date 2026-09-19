// One-time seed for src/content/releases. After this, releases are added by
// dropping a markdown file in, which is the only maintenance model that survives
// a busy week. Kept in the repo so the seed is reproducible and reviewable.
//
// Dates are the UTC merge times of the pull requests that produced each version.
// The Gateway has merged ten versions since 4.3.1 without tagging any of them,
// so every one of them says published: false, and the page says so out loud.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src/content/releases');

const R = [
  {
    product: 'gateway', version: '4.13.0', date: '2026-09-19', published: false,
    summary: 'The Gateway can be an OPC UA server, read-only, so a third-party client can browse and read its tags.',
    highlights: [
      'A read-only OPC UA server exposing the Gateway’s tags as an address space. Nodes are read-only, and there is no write handler at all, so this version has no setting that enables writes.',
      'Secure channels use Basic256Sha256 in Sign and SignAndEncrypt. SecurityPolicy None is an explicit opt-in.',
      'Users log in with their HotLoop user name and password, the same user database and bcrypt hashes as the web login, and must hold tags.read and values.read. Permissions are re-checked on live sessions, so revoking one takes effect without waiting for a reconnect.',
      'Anonymous sessions are an explicit opt-in, and a client’s application certificate has to be approved by an operator before it is trusted.',
    ],
    body: 'Writes are deliberately absent. The runtime has one write gate, and an OPC UA write would have to go through it. That deserves its own review, so it did not ride along in this release.',
  },
  {
    product: 'gateway', version: '4.12.0', date: '2026-09-18', published: false,
    summary: 'Database backups, taken in pure Go over the existing connection, with a restore that refuses to touch a database that already has data.',
    highlights: [
      'A logical snapshot of every configuration and history table, taken inside one REPEATABLE READ transaction so it is consistent. It is table data only, since migrations rebuild the schema from nothing on every start.',
      'No pg_dump. The runtime image is distroless with no shell and no external binaries, and backups do not get an exception to that.',
      'Retention defaults to 7 backups, and 0 keeps everything. An optional interval scheduler runs backups on a plain interval, not cron.',
      'Restore is deliberately not an API endpoint. It is a flag an operator runs by hand against an empty, freshly migrated database, and it refuses a target that already has data.',
    ],
    body: 'Not verified, and stated in the backup docs: very large history volumes, where long-transaction and connection-pool behavior have not been measured, and restoring across Gateway versions that changed the schema.',
  },
  {
    product: 'gateway', version: '4.11.0', date: '2026-09-18', published: false,
    summary: 'An optional embedded MQTT broker, so a single-box install can be its own Sparkplug hub.',
    highlights: [
      'An in-process broker with a plain TCP listener on 1883, plus a TLS listener on 8883 whenever a certificate and key are configured.',
      'Credential authentication, checked in constant time. Anonymous access is an explicit, off-by-default opt-in.',
      'Fleet management, edge publishing, and an edge relay can all point at localhost with nothing else to stand up.',
    ],
    body: 'There is no per-topic access control, by design. The broker is the authorization boundary, and for a production deployment at scale you should still run a dedicated broker such as Mosquitto or EMQX.',
  },
  {
    product: 'gateway', version: '4.10.0', date: '2026-09-18', published: false,
    summary: 'Alarm notifications by webhook and email, so a 03:00 alarm can reach a phone.',
    highlights: [
      'Two provider-agnostic channels. A webhook posts JSON to any URL, which composes with PagerDuty, Opsgenie, ntfy, Pushover, Slack, Discord, or a script of your own. Email goes out over SMTP.',
      'Notifications fire when an alarm is raised, and only then. Cleared, acknowledged, and shelved alarms are deliberately not page-worthy.',
      'A priority floor per channel, so a channel set to high and above stays quiet for a low alarm.',
      'SMTP upgrades to STARTTLS automatically when the server offers it, which authenticated relays generally require. It is tested against a local server configured for STARTTLS and authentication, and not against a hosted provider.',
    ],
    body: 'Off by default. A test endpoint, restricted to administrators, lets you verify a channel without waiting for a real alarm.',
  },
  {
    product: 'gateway', version: '4.9.0', date: '2026-09-18', published: false,
    summary: 'The rename to HotLoop: module path, container images, charts, and environment variables.',
    highlights: [
      'The Go module is now github.com/HotLoop-io/hotloop, and the images are ghcr.io/hotloop-io/hotloop and ghcr.io/hotloop-io/hotloop-edge-relay.',
      'Both Helm charts are renamed to hotloop and hotloop-edge-relay.',
      'Every IIOT_ environment variable is now HOTLOOP_.',
    ],
    breaking: [
      'Every IIOT_ environment variable is now HOTLOOP_. An upgrade in place means renaming every IIOT_ value to its HOTLOOP_ equivalent before the pod comes back up.',
      'The image and chart names changed, so an upgrade in place also means new image references.',
    ],
    body: 'The App Store labels and annotations under the embernet.ai namespace are unchanged on purpose. A namespaced key names the system that reads it, and those labels are how the EmberNET App Store finds a chart.',
  },
  {
    product: 'gateway', version: '4.8.0', date: '2026-09-18', published: false,
    summary: 'Config push: stage a new device file on a fleet relay without touching it by hand.',
    highlights: [
      'The Gateway publishes a device file to a retained MQTT topic per relay, validated before it is published with the same validation the relay uses, so a malformed file never reaches a relay.',
      'A push and a restart are two separate operator actions on purpose. Pushing to a running relay only stages the file for the next restart, and a relay that is offline picks it up automatically when it reconnects.',
      'Pushing a config is administrator-only.',
    ],
  },
  {
    product: 'gateway', version: '4.7.0', date: '2026-09-18', published: false,
    summary: 'Fleet management: see registered edge relays, and command them.',
    highlights: [
      'Membership is declared, not auto-trusted. A birth message from an unregistered relay is logged and ignored.',
      'Presence comes from Sparkplug birth and death messages, which are outbound from the relay and work through NAT with no inbound connection to a relay ever required.',
      'Rebirth is open to operators. Restart is administrator-only, since it takes a relay down.',
    ],
    body: 'The application cannot enforce this part, so the docs say it plainly: the broker’s own access controls should restrict publishing of node commands to the Gateway’s credentials.',
  },
  {
    product: 'gateway', version: '4.6.0', date: '2026-09-17', published: false,
    summary: 'A second binary, the Edge Relay, with no database at all, and two ways to deploy it.',
    highlights: [
      'The Edge Relay is a separate, lighter binary that polls equipment and forwards it, with no PostgreSQL dependency. About 16.9 MB against the Gateway’s 33.4 MB.',
      'It exposes only /healthz and /status, read-only and unauthenticated, since there is no identity system to guard them and nothing sensitive in the response.',
      'Deployable on k3s with its own Helm chart, or on a box with no cluster as a Podman Quadlet unit that runs as a real systemd service.',
    ],
  },
  {
    product: 'gateway', version: '4.5.0', date: '2026-09-17', published: false,
    summary: 'The Gateway can be a Sparkplug B edge node, with a queue that survives a restart.',
    highlights: [
      'A disk-backed queue with at-least-once delivery, oldest-first eviction when it fills, and no loss across a restart.',
      'Full Sparkplug B edge node behavior: birth, data, and death messages, sequence numbers, and rebirth on request.',
      'Buffered readings replay as historical data, one message per reading, in order.',
    ],
    body: 'Off by default.',
  },
  {
    product: 'gateway', version: '4.4.0', date: '2026-09-17', published: false,
    summary: 'A login, and writes off until someone turns them on.',
    highlights: [
      'Local users with bcrypt-hashed passwords, sessions by cookie or bearer token, and three roles: admin, operator, and viewer.',
      'Every route checks a permission before it does anything.',
      'Writes are off by default. They used to be on, and a tag is now read-only until somebody marks it writable, one at a time.',
      'The Helm chart generates an admin account into the release Secret.',
    ],
    breaking: [
      'Writes that worked out of the box no longer do. Turn on safety.allowWrites deliberately, and mark each tag writable.',
    ],
  },
  {
    product: 'flow', version: '0.1.0', date: '2026-08-08', published: true,
    summary: 'The first public release, published under its original name, Emberwire.',
    highlights: [
      'A 25.1 MB image for amd64 and arm64, with 51 node types and roughly 30,000 lines of Go in one static binary.',
      'Flow files stay Node-RED v1 compatible. Point it at a flows.json and it runs.',
      'Every inbox is bounded, with a policy per node: block, drop the newest, drop the oldest, or raise it to a Catch node.',
      'The race detector is clean on every package.',
    ],
    body: 'This release is Apache-2.0 and stays that way. It is published today as Emberwire, and the HotLoop Flow release is coming.',
  },
];

const q = (s) => JSON.stringify(s);
const list = (a) => (a.length ? '\n' + a.map((x) => `  - ${q(x)}`).join('\n') : ' []');

for (const r of R) {
  const path = resolve(root, r.product, `${r.version}.md`);
  mkdirSync(dirname(path), { recursive: true });
  const fm = [
    '---',
    `product: ${r.product}`,
    `version: ${q(r.version)}`,
    `date: ${r.date}`,
    `published: ${r.published}`,
    `summary: ${q(r.summary)}`,
    `highlights:${list(r.highlights)}`,
    `breaking:${list(r.breaking || [])}`,
    '---',
    '',
    (r.body || '') + (r.body ? '\n' : ''),
  ].join('\n');
  writeFileSync(path, fm);
}
console.log(`wrote ${R.length} release files`);
