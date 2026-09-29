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
    tagline: 'The automation base, built in Go for OT.',
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
  { name: 'Entities and the equipment tree', status: 'released', note: 'Every tag gets an entity with an id that never changes, on one ISA-95 tree. A motor is one entity built from the tags it really is, so rules and agents talk about the pump, not register 40001.' },
  { name: 'Automations', status: 'released', note: 'Ten trigger types, entity state included, compiled when you save. A broken rule dies in the editor, not at 3am halfway through a batch.' },
  { name: 'The automation language', status: 'main', note: 'Condition, wait and stop steps inside a sequence, and forSec on a state trigger. "The pump has been on for five minutes" is one trigger, not a timer hack.' },
  { name: 'Helpers', status: 'main', note: 'The values the plant\'s people own, like today\'s batch target or which shift is on: toggles, numbers, selects, text, counters, timers and schedules. Kept across restarts, never clamped.' },
  { name: 'Logbook', status: 'main', note: 'State changes, writes, alarms, rule runs and config changes on one timeline, for the plant, one area or one entity. "What happened right before?" is one list, not five screens.' },
  { name: 'Scripts', status: 'main', note: 'Write the CIP cycle once, name it, run it from a rule, a screen, MCP or its own entity. A dry run goes through the real gate, so you see the refusal before anything moves.' },
  { name: 'Recipes', status: 'main', note: 'Grade A\'s setpoints off the laminated sheet and into the plant in one go: checked whole, refused whole, written in order and read back from the device.' },
  { name: 'Blueprints', status: 'main', note: 'Write a rule once with blanks and fill it in per pump. Each rule keeps the blueprint version it was made from, so one edit never quietly changes forty rules.' },
  { name: 'Dashboards', status: 'planned', note: 'A card builder, a dashboard per role or screen, and the same layout on a panel PC, a laptop and a phone. This is where it has to look better from across the room.' },
  { name: 'ISA-18.2 alarms', status: 'released', note: 'rtn-unack included, so a trip that fixed itself is still there at shift change. Shelving ends, and unshelve brings the alarm back in the state it\'s really in.' },
  { name: 'Notifications', status: 'released', note: 'ntfy, Gotify, Discord, webhooks and email. Press Acknowledge on your phone and the alarm is acknowledged, signed and single use.' },
  { name: 'MCP', status: 'released', note: 'An agent can read the whole plant and touch only what you armed, through the write gate, with its reason written next to every write.' },
  { name: 'MQTT and an embedded broker', status: 'released', note: 'Plain topics with JSON paths, Sparkplug B, and a broker in the same process, so one box can be the whole install.' },
  { name: 'MQTT discovery', status: 'planned', note: 'Shelly, ESPHome, Tasmota and Zigbee2MQTT devices show up by themselves. IoT doesn\'t ship until this works, because an automation base that can\'t find a smart plug is a joke.' },
  { name: 'Every protocol driver', status: 'released', note: 'OPC UA, Modbus, MQTT and Sparkplug B, EtherNet/IP, S7comm, MTConnect and HTTP. Protocols don\'t split the products, so nobody runs the Gateway just to reach one PLC.' },
  { name: 'UniFi', status: 'building', note: 'The read-only Network driver is on main: devices, ports, PoE and WAN failover as tags. It reads WAN health the way the console's own checks do, so a backup link that's been dead for two days reads dead. Screens and writes are next.' },
  { name: 'Backups and restore', status: 'released', note: 'Pure Go over the database connection, in IoT, Edge and the Gateway. It\'s also how you move between them, so it has to work every time.' },
];

// What Edge adds on top of IoT.
export const EDGE_FEATURES: Feature[] = [
  { name: 'HMI screens', status: 'planned', note: 'Fixed canvas screens that never reflow, ISA-101 graphics, motor and valve faceplates, and a kiosk mode for the touch panel on the machine.' },
  { name: 'PLCs', status: 'released', note: 'The native drivers read and write PLCs directly. S7comm and EtherNet/IP are decode tested and have never touched a physical PLC, and the integrations page says so.' },
  { name: 'CODESYS', status: 'unverified', note: 'A CODESYS runtime is an OPC UA server or a Modbus TCP slave, and HotLoop speaks both. It has not been run against a CODESYS runtime yet.' },
  { name: 'Pi PLCs', status: 'unverified', note: 'Raspberry Pi based PLCs talk Modbus TCP, and most can run CODESYS. Reached that way today. Not yet run against one on the bench.' },
  { name: 'Store-and-forward', status: 'released', note: 'Publishes upstream as a Sparkplug B edge node. When the link drops it buffers to disk and replays in order, so the historian upstream has no hole in it.' },
  { name: 'OPC UA server', status: 'released', note: 'Read-only and secured, and Ignition 8.3.9 reads it end to end. The SCADA you already own sees every tag without a new driver.' },
];

// What the Gateway adds on top of Edge.
export const GATEWAY_FEATURES: Feature[] = [
  { name: 'Fleet', status: 'released', note: 'Knows every Edge Relay from its Sparkplug births and deaths, and sends rebirth, restart and a new device file without anybody driving out to the box.' },
  { name: 'Multi-site', status: 'released', note: 'One Gateway asks the others what it would answer itself. A site that doesn\'t answer shows as unreachable, never as zero alarms.' },
  { name: 'Scheduled reports', status: 'released', note: 'Historian numbers on a schedule, as CSV or HTML, stored and emailed. Only good readings count, and every row says how many it threw out.' },
];
