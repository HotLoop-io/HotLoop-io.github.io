// One definition of the HotLoop lineup, used by the home page, the products
// page and each product's own page, so no two pages can disagree about what a
// product has or whether you can install it.
//
// `status` says where a feature stands: 'released' if it is in a published
// version, 'main' if it is finished and waiting for the next one, 'building' if
// somebody is writing it right now, and 'planned' otherwise. Everything that
// was waiting on bare metal was tested there on 2026-11-17, so nothing is marked
// as untested. The build refuses a product marked installable without a published
// image, and a product that isn't installable with one, so a download button can't
// point at nothing.

export type Status = 'released' | 'main' | 'building' | 'planned';

// The one published version. Change it here when the next release ships.
export const CURRENT = '4.24.3';

export const STATUS: Record<Status, { label: string; chip: 'ok' | 'info' | 'warn' | 'none' }> = {
  released: { label: 'Available now', chip: 'ok' },
  main: { label: 'Next release', chip: 'info' },
  building: { label: 'Being built', chip: 'warn' },
  planned: { label: 'Planned', chip: 'none' },
};

export type Feature = { name: string; status: Status; note: string };

/** The catalog key for a feature, from its English name: ft.<name in lower case with dashes>. */
export const featureKey = (name: string) => 'ft.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
      'The base everything else is built on: entities, automations, helpers, scripts, the logbook, dashboards, notifications, AI agents (over MCP), and MQTT with discovery, plus every protocol driver HotLoop has.',
    installable: true,
    image: 'ghcr.io/hotloop-io/hotloop-iot',
    chart: 'hotloop-iot',
    databases: 'SQLite or PostgreSQL',
    adds: 'The base',
  },
  {
    id: 'edge',
    name: 'HotLoop Edge',
    href: '/edge/',
    tagline: 'IoT plus the machine layer.',
    summary:
      'Everything in IoT, plus what lives next to a machine: store-and-forward upstream that rides out a dead uplink, and an OPC UA server for the SCADA you already own. The machine\'s own screen comes with the dashboards every product has.',
    installable: true,
    image: 'ghcr.io/hotloop-io/hotloop-edge',
    chart: 'hotloop-edge',
    databases: 'SQLite, PostgreSQL or TimescaleDB',
    adds: 'Store-and-forward, OPC UA server',
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
    adds: 'Fleet, multi-site, reports',
  },
  {
    id: 'edge-relay',
    name: 'HotLoop Edge Relay',
    href: '/edge-relay/',
    tagline: 'Poll, forward, survive.',
    summary:
      'Headless (no screen) and simple on purpose. It polls equipment with the same drivers, forwards everything upstream, and holds on to it when the uplink is down.',
    installable: true,
    image: 'ghcr.io/hotloop-io/hotloop-edge-relay',
    chart: 'hotloop-edge-relay',
    databases: 'None. It holds readings until the uplink is back, and that is all',
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
  { name: 'Entities and the equipment tree', status: 'released', note: 'Every signal becomes a named thing that keeps its identity, on one plant tree. A motor is one entity built from the signals that make it up, so rules and agents talk about the pump, not a register number. Replace a PLC and your rules keep working.' },
  { name: 'Automations', status: 'released', note: 'Eleven kinds of trigger, entity state and the sun included, checked when you save. A broken rule dies in the editor, not at 3am halfway through a batch.' },
  { name: 'The automation language', status: 'released', note: 'Conditions, waits and stops inside a sequence, and "the pump has been on for five minutes" is one trigger, not a timer hack.' },
  { name: 'Helpers', status: 'released', note: 'The values the plant\'s people own, like today\'s batch target or which shift is on: toggles, numbers, selects, text, counters, timers, and schedules. They survive restarts and they are never quietly clamped.' },
  { name: 'Logbook', status: 'released', note: 'State changes, writes, alarms, rule runs and config changes on one timeline, for the plant, one area, or one entity. "What happened right before?" is one list, not five screens.' },
  { name: 'Scripts', status: 'released', note: 'Write the clean-in-place cycle once, name it, and run it from a rule, a screen, an AI agent, or its own entity. A dry run goes through the real write gate, so you see the refusal before anything moves.' },
  { name: 'Recipes', status: 'released', note: 'Grade A\'s setpoints off the laminated sheet and into the plant in one go: checked whole, refused whole, written in order, and read back from the device. Nobody ends up with half a recipe.' },
  { name: 'Blueprints', status: 'released', note: 'Write a rule once with blanks and fill it in per pump. Each rule remembers the blueprint it came from, so one edit never quietly changes forty rules.' },
  { name: 'Dashboards', status: 'released', note: 'Build a screen by dragging cards: gauges, numbers, trends, entity lists, write buttons, script and recipe buttons, alarm lists, text, cameras, and a floor plan. Hand a dashboard to the roles that need it, or bind it to one physical screen. One layout folds from a panel PC down to a phone, so nobody ever builds the phone version. A card commands nothing itself, so a button still meets the write gate.' },
  { name: 'ISA-18.2 alarms', status: 'released', note: 'The industrial alarm standard, including the alarm that cleared before anyone acknowledged it, so a trip that fixed itself is still there at shift change. Shelved alarms come back in the state they are really in.' },
  { name: 'Notifications', status: 'released', note: 'ntfy, Gotify, Discord, webhooks, and email. Press Acknowledge on an ntfy push or in the Discord bot and the alarm is acknowledged, signed, and good for one use. The night shift answers the page from the phone in their hand.' },
  { name: 'AI agents', status: 'released', note: 'An agent can read the whole plant and touch only what you armed, through the same write gate as the screen, and never without a stated reason, which goes in the log next to the write. With writes off, nothing writes. You get an assistant that can answer "why is line 3 slow" without being able to open a valve on its own.' },
  { name: 'Writes to scaled tags land right', status: 'released', note: 'Write 55.5 to a tag scaled by 0.1 and the device gets exactly that. A value the register can\'t hold is refused instead of wrapping, and a recipe with a value that doesn\'t fit is refused whole before its first write. Check your scaled tags before you upgrade an older plant.' },
  { name: 'MQTT and an embedded broker', status: 'released', note: 'Plain topics, Sparkplug B, and an optional broker in the same process, so one box can be the whole install.' },
  { name: 'The sun', status: 'released', note: 'Sunrise, sunset, dawn, dusk, and the sun\'s height and bearing, worked out on the box from the site\'s location, plus a sun trigger with an offset. A site whose uplink died three weeks ago still turns the yard lights on at dusk.' },
  { name: 'MQTT discovery', status: 'released', note: 'ESPHome, Zigbee2MQTT, Tasmota, and Shelly devices show up on their own, as read-only. Nothing is armed until a person accepts the device and arms each point, so a device announcing itself never earns the right to flip a relay.' },
  { name: 'Network discovery', status: 'released', note: 'HotLoop listens for devices announcing themselves on the network and lists what each one is and how HotLoop could talk to it. Active probing stays off until you name a network, because a port sweep has knocked over PLCs. Nothing is added by itself.' },
  { name: 'Broker logins with rules', status: 'released', note: 'A twelve dollar plug\'s login can\'t publish to the boiler\'s command topic. Logins carry publish and subscribe rules, checked on every message.' },
  { name: 'Historian targets', status: 'released', note: 'Every reading also goes to the plant\'s own database: PostgreSQL and TimescaleDB, SQL Server, InfluxDB, MySQL and MariaDB. Polling never waits for a target, and one that falls behind catches up on its own.' },
  { name: 'A Kafka event stream', status: 'released', note: 'Readings and the system log go to any Kafka-compatible broker, Apache Kafka and Redpanda included, with TLS and the standard sign-in methods. Delivery is at least once, so a reading can arrive twice after an outage. Your data team gets the plant on the bus they already run.' },
  { name: 'SQLite or PostgreSQL, your pick', status: 'released', note: 'The database is a setting. A Pi runs any product on a single file with no second container. Moving between databases is a backup and a restore.' },
  { name: 'Updates that roll themselves back', status: 'released', note: 'Boxes that follow the stable release update themselves, and an update that can\'t pass its health check is rolled back instead of reported as a success. On Kubernetes you run the upgrade yourself. Either way the update that breaks at 2am goes back by itself.' },
  { name: 'Every protocol driver', status: 'released', note: 'OPC UA, CODESYS, OPC UA PubSub, Modbus, MQTT and Sparkplug B, EtherNet/IP, S7comm, MTConnect, HTTP, SNMP, BACnet/IP, and UniFi. Protocols don\'t split the products, so nobody runs the Gateway just to reach one PLC.' },
  { name: 'CODESYS, by the names the programmer gave the variables', status: 'released', note: 'A CODESYS runtime is read and written by variable name, like Application.GVL_Line.rTemp, with nothing installed in the PLC. A download or a restart reads bad with the reason and comes back with no hands. Tested on a real runtime and on bare metal, including a program of over a hundred thousand variables read in about two seconds.' },
  { name: 'OPC UA PubSub over UADP', status: 'released', note: 'HotLoop listens for a publisher\'s data over UDP, unicast or multicast, and a lost message marks that publisher\'s tags uncertain until the next full update. You see a gap as a gap.' },
  { name: 'UniFi network', status: 'released', note: 'Devices, ports, PoE, WAN failover, and clients as tags, and a quiet PLC tells you which switch port it is on. A backup link that has been dead for two days reads dead. Every tag is read-only until a person arms it.' },
  { name: 'UniFi screens and events', status: 'released', note: 'An overview with the WAN strip, a topology map that zooms and pinches, switch faceplates with port traffic, clients, networks, and WiFi, one button that makes the usual alarms, and the console\'s event stream so a switch dropping off lands in the logbook in seconds. An agent can ask for the topology and the latest events.' },
  { name: 'UniFi commands', status: 'released', note: 'A device\'s locate LED, a device restart, a switch port\'s PoE power cycle, a wireless network on or off, a client block, and a port\'s PoE mode, each through the write gate and each off until you arm that tag. A power cycle waits out a 15 minute cooldown, and a port that carries the network is never cycled. Proven on the lab\'s controller, with one power cycle of an access point on a real network.' },
  { name: 'Hardware access', status: 'released', note: 'A container can share its node\'s network when it has to hear what the node hears, like multicast. The charts also mount the node\'s USB devices and Bluetooth for whatever you plug in later, which makes the container root on the node, and three switches turn that off. Zigbee comes through Zigbee2MQTT.' },
  { name: 'Backups and restore', status: 'released', note: 'One backup works in IoT, Edge, and the Gateway, and it is also how you move between them. A restore either works whole or says no.' },
];

// What Edge adds on top of IoT.
export const EDGE_FEATURES: Feature[] = [
  { name: 'Store-and-forward', status: 'released', note: 'A dead link leaves no hole in the historian upstream: Edge holds the readings and replays them in order, flagged as historical. It publishes upstream as a Sparkplug B edge node, which is the MQTT standard for industrial data. Off until you switch edge publishing on.' },
  { name: 'Runs with the WAN dead', status: 'released', note: 'We booted a real Edge with its uplink pointed at a link that eats every packet, and the screen, a write, a script, a recipe, an automation, and an alarm all worked. A box that reboots mid-outage comes right back. Readings are held in memory first and spill to disk only when the broker stops answering, oldest replayed first, with a cap so a long outage can\'t fill the disk.' },
  { name: 'OPC UA server', status: 'released', note: 'The SCADA you already own sees every tag without a new driver. Read-only and secured, and Ignition reads it end to end. Off until you switch it on.' },
  { name: 'OPC UA PubSub publisher', status: 'released', note: 'Edge can publish the tags you choose over OPC UA PubSub, full updates when values change and heartbeats when they don\'t. A bad tag goes out as bad, never as its last value. Off until you switch it on.' },
  { name: 'Panel mode', status: 'released', note: 'A dashboard bound to a physical screen opens full bleed, with no header, no tabs, and bigger touch targets, and it works with the uplink down. Every product with a dashboard has it, not only Edge.' },
  { name: 'HMI symbols, faceplates and PIN sign-in', status: 'planned', note: 'The ISA-101 symbol library, the motor and valve faceplates, and PIN sign-in for shared panels, so the audit names a person and not "panel 3". These are planned.' },
];

// What the Gateway adds on top of Edge.
export const GATEWAY_FEATURES: Feature[] = [
  { name: 'Fleet', status: 'released', note: 'Restart a relay, ask it to re-announce itself, or send it a new device file without anybody driving out to the box. Fleet knows every Edge Relay you register. Off until you switch it on, and it has no screen yet, so you drive it through the API.' },
  { name: 'Multi-site', status: 'released', note: 'One Gateway asks the others the questions it would answer for itself. A site that doesn\'t answer shows as unreachable, never as zero alarms.' },
  { name: 'Scheduled reports', status: 'released', note: 'Historian numbers on a schedule, as CSV or HTML, stored and emailed. Only good readings count, and every row says how many it threw out.' },
];

// Cascade is its own product and is not one of the four from the shared codebase,
// so it lives beside PRODUCTS. 0.1.1 was its first release, 1.0.0 the editor and identity
// release. A 0.1.0 tag exists and never published anything. The repository is private, the
// image and chart are public. Change it here when the next release ships.
export const CASCADE = '1.4.1';

// HotLoop Transmitter is its own release line: a CODESYS library (HotLoop-io/hotloop-transmitter)
// that publishes PLC values as OPC UA PubSub. 1.2.0 shipped on 2026-11-23 (1.1.0 on 2026-11-04). The repository is private,
// so the files are served from hotloop.io/hotloop-transmitter/<version>/ the way the charts are
// (that repository's gh-pages branch). Change `version` here and in the release note when the next one ships.
export const TRANSMITTER = {
  version: '1.2.0',
  downloads: 'https://hotloop.io/hotloop-transmitter/',
};

// HotLoop for CODESYS is its own release line: a chart and a provisioner
// (HotLoop-io/hotloop-codesys) around HotLoop Edge, for a CODESYS runtime on the same node.
// 0.3.10 is the newest chart in the index at hotloop.io/hotloop-codesys/ (published 2026-11-23),
// and it wraps HotLoop 4.24.0. The repository is private, the chart index and the provisioner
// image are public. The EmberCORE App Store lists it for staff. Change `version` here and in
// the release note (src/content/releases/codesys/) when the next chart ships.
export const CODESYS = {
  version: '0.3.10',
  needsCore: '4.24.0',
  chart: 'hotloop-codesys',
  chartRepo: 'https://hotloop.io/hotloop-codesys/',
  image: 'ghcr.io/hotloop-io/hotloop-provision',
};
