// One definition of the HotLoop lineup, used by the home page, the products
// page and each product's own page, so no two pages can disagree about what a
// product has or whether you can install it.
//
// The honesty rule lives in `status`. A feature is only 'released' if it is in
// a published version, 'unverified' if the path is in a published version and
// nobody has run it against the real thing yet, 'main' if it is merged and waiting for the next one,
// 'building' if somebody is writing it right now, and 'planned' otherwise. The
// build refuses a product marked installable without a published image, and a
// product that isn't installable with one, so a download button can't point at
// nothing.

export type Status = 'released' | 'unverified' | 'main' | 'building' | 'planned';

// The one published version. Change it here when the next release ships.
export const CURRENT = '4.16.0';

export const STATUS: Record<Status, { label: string; chip: 'ok' | 'info' | 'warn' | 'none' }> = {
  released: { label: `In ${CURRENT}`, chip: 'ok' },
  unverified: { label: 'Works on paper', chip: 'warn' },
  main: { label: 'On main', chip: 'info' },
  building: { label: 'Being built', chip: 'warn' },
  planned: { label: 'Not built yet', chip: 'none' },
};

export type Feature = { name: string; status: Status; note: string };

export type ProductId = 'iot' | 'edge' | 'gateway' | 'edge-relay';

export type Product = {
  id: ProductId;
  name: string;
  href: string;
  tagline: string;
  summary: string;
  installable: boolean;
  image?: string;
  chart?: string;
  databases: string;
  databasesToday?: string;
  adds: string;
};

export const PRODUCTS: Product[] = [
  {
    id: 'iot',
    name: 'HotLoop IoT',
    href: '/iot/',
    tagline: 'Home Assistant, rewritten in Go for OT.',
    summary:
      'The base everything else is built on: entities, automations, helpers, scripts, the logbook, dashboards, notifications, MCP, and MQTT with discovery, plus every protocol driver HotLoop has.',
    installable: false,
    databases: 'SQLite or PostgreSQL',
    adds: 'The base',
  },
  {
    id: 'edge',
    name: 'HotLoop Edge',
    href: '/edge/',
    tagline: 'IoT plus the machine layer.',
    summary:
      'Everything in IoT, plus what lives next to a machine: HMI screens, PLCs, CODESYS and Pi PLCs, store-and-forward upstream, and an OPC UA server.',
    installable: false,
    databases: 'SQLite, PostgreSQL or TimescaleDB',
    adds: 'HMI, store-and-forward, OPC UA server',
  },
  {
    id: 'gateway',
    name: 'HotLoop Gateway',
    href: '/gateway/',
    tagline: 'Everything, for the whole site.',
    summary:
      'Everything in Edge, plus what a site or a company of sites needs: fleet management of edge relays, multi-site roll-ups, and scheduled reports.',
    installable: true,
    image: 'ghcr.io/hotloop-io/hotloop',
    chart: 'hotloop',
    databases: 'SQLite, PostgreSQL or TimescaleDB',
    databasesToday: 'TimescaleDB, or plain PostgreSQL. SQLite is on its way, in the same image.',
    adds: 'Fleet, multi-site, reports',
  },
  {
    id: 'edge-relay',
    name: 'HotLoop Edge Relay',
    href: '/edge-relay/',
    tagline: 'Poll, forward, survive.',
    summary:
      'Headless and dumb on purpose. It polls equipment with the same drivers and forwards everything over Sparkplug B, and buffers to disk when the uplink is down.',
    installable: true,
    image: 'ghcr.io/hotloop-io/hotloop-edge-relay',
    chart: 'hotloop-edge-relay',
    databases: 'None. A disk-backed forward queue and nothing else',
    adds: 'Headless, no database',
  },
];

for (const p of PRODUCTS) {
  if (p.installable !== Boolean(p.image && p.chart)) {
    throw new Error(`${p.name}: installable is ${p.installable}, but image/chart say otherwise. No download button may point at nothing.`);
  }
}

export const product = (id: ProductId) => PRODUCTS.find((p) => p.id === id)!;

// What the IoT base holds. Edge and the Gateway carry all of it.
export const IOT_FEATURES: Feature[] = [
  { name: 'Entities and the equipment tree', status: 'released', note: 'Every tag is an entity with an id that never changes, on one ISA-95 tree. A motor is one entity built from the tags it really is.' },
  { name: 'Automations', status: 'released', note: 'Ten trigger types, entity state triggers included, compiled when you save the rule so a broken one is caught in the editor.' },
  { name: 'The automation language', status: 'main', note: 'Condition, wait and stop steps inside a sequence, and forSec on a state trigger, for "the pump has been on for five minutes".' },
  { name: 'Helpers', status: 'main', note: 'The seven Home Assistant input helpers: toggles, numbers, selects, text, counters, timers and schedules. Kept across restarts, never clamped.' },
  { name: 'Logbook', status: 'main', note: 'One timeline of state changes, writes, alarms, automation runs and config changes, for the plant, one area, or one entity.' },
  { name: 'Scripts', status: 'building', note: 'Write the CIP cycle once, give it a name, and run it from a rule, the Scripts screen, MCP or its own entity. In review now.' },
  { name: 'Recipes and blueprints', status: 'planned', note: 'Scenes as recipes: a set of setpoints captured and applied together, audited. Then reusable automation templates.' },
  { name: 'Dashboards', status: 'planned', note: 'A builder with cards, one per role or screen, that looks right on a panel PC, a laptop and a phone.' },
  { name: 'ISA-18.2 alarms', status: 'released', note: 'Including rtn-unack, shelving with an end, and an unshelve that brings the alarm back in the state it is really in.' },
  { name: 'Notifications', status: 'released', note: 'ntfy, Gotify, Discord, webhooks and email, with Acknowledge buttons that act on the alarm itself.' },
  { name: 'MCP', status: 'released', note: 'Agents read the plant and act on it only through the write gate, with a stated reason on every write.' },
  { name: 'MQTT and an embedded broker', status: 'released', note: 'Plain topics with JSON paths, Sparkplug B, and a broker in the same process for a single-box install.' },
  { name: 'MQTT discovery', status: 'planned', note: 'Shelly, ESPHome, Tasmota and Zigbee2MQTT devices show up by themselves. IoT ships once this lands.' },
  { name: 'Every protocol driver', status: 'released', note: 'OPC UA, Modbus, MQTT and Sparkplug B, EtherNet/IP, S7comm, MTConnect and HTTP. Protocols do not split the products.' },
  { name: 'UniFi', status: 'building', note: 'Network first: devices, ports, PoE, WAN failover and a topology map, as tags like any PLC. Then Protect, Access and PDUs.' },
  { name: 'Backups and restore', status: 'released', note: 'In pure Go over the database connection, in IoT, Edge and the Gateway, because it is also how you move between them.' },
];

// What Edge adds on top of IoT.
export const EDGE_FEATURES: Feature[] = [
  { name: 'HMI screens', status: 'planned', note: 'Fixed canvas screens that never reflow, ISA-101 graphics, faceplates for motors and valves, and a kiosk panel mode for the touch screen on the box.' },
  { name: 'PLCs', status: 'released', note: 'The native drivers read and write PLCs directly. S7comm and EtherNet/IP are decode tested and have never touched a physical PLC, and the integrations page says so.' },
  { name: 'CODESYS', status: 'unverified', note: 'A CODESYS runtime is an OPC UA server or a Modbus TCP slave, and HotLoop speaks both. It has not been run against a CODESYS runtime yet.' },
  { name: 'Pi PLCs', status: 'unverified', note: 'Raspberry Pi based PLCs talk Modbus TCP, and most can run CODESYS. Reached that way today. Not yet run against one on the bench.' },
  { name: 'Store-and-forward', status: 'released', note: 'Publishes upstream as a Sparkplug B edge node, buffers to disk when the link is down, and replays in order when it comes back.' },
  { name: 'OPC UA server', status: 'released', note: 'Read-only, secured, and verified end to end with Ignition 8.3.9 reading it.' },
];

// What the Gateway adds on top of Edge.
export const GATEWAY_FEATURES: Feature[] = [
  { name: 'Fleet', status: 'released', note: 'Tracks registered edge relays from their Sparkplug births and deaths, and sends rebirth, restart and config push.' },
  { name: 'Multi-site', status: 'released', note: 'One Gateway asks the others the same question it would answer itself. A site that does not answer is shown as unreachable, never as zero alarms.' },
  { name: 'Scheduled reports', status: 'released', note: 'Historian numbers on a schedule as CSV or HTML, stored and emailed. Only good readings count, and each row says how many it left out.' },
];
