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
export const CURRENT = '4.19.10';

export const STATUS: Record<Status, { label: string; chip: 'ok' | 'info' | 'warn' | 'none' }> = {
  released: { label: `In ${CURRENT}`, chip: 'ok' },
  unverified: { label: 'Works on paper', chip: 'warn' },
  main: { label: 'Next release', chip: 'info' },
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
      'Everything in IoT, plus what lives next to a machine: store-and-forward upstream over Sparkplug B (MQTT for industrial data) that rides out a dead uplink, and an OPC UA server. Panel mode for the machine\'s screen comes with the dashboards every product has.',
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
      'Headless (no screen) and dumb on purpose. It polls equipment with the same drivers and forwards everything over Sparkplug B (MQTT for industrial data), and buffers to disk when the uplink is down.',
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
  { name: 'Entities and the equipment tree', status: 'released', note: 'Every tag gets an entity with an id that never changes, on one ISA-95 plant tree. A motor is one entity built from the tags that make it up, so rules and agents talk about the pump, not register 40001.' },
  { name: 'Automations', status: 'released', note: 'Eleven trigger types, entity state and the sun included, compiled when you save. A broken rule dies in the editor, not at 3am halfway through a batch.' },
  { name: 'The automation language', status: 'released', note: 'Condition, wait and stop steps inside a sequence, and forSec on a state trigger. "The pump has been on for five minutes" is one trigger, not a timer hack.' },
  { name: 'Helpers', status: 'released', note: 'The values the plant\'s people own, like today\'s batch target or which shift is on: toggles, numbers, selects, text, counters, timers, and schedules. Kept across restarts, never clamped.' },
  { name: 'Logbook', status: 'released', note: 'State changes, writes, alarms, rule runs and config changes on one timeline, for the plant, one area, or one entity. "What happened right before?" is one list, not five screens.' },
  { name: 'Scripts', status: 'released', note: 'Write the CIP (clean-in-place) cycle once, name it, run it from a rule, a screen, an AI agent over MCP, or its own entity. A dry run goes through the real gate, so you see the refusal before anything moves.' },
  { name: 'Recipes', status: 'released', note: 'Grade A\'s setpoints off the laminated sheet and into the plant in one go: checked whole, refused whole, written in order, and read back from the device.' },
  { name: 'Blueprints', status: 'released', note: 'Write a rule once with blanks and fill it in per pump. Each rule keeps the blueprint version it was made from, so one edit never quietly changes forty rules.' },
  { name: 'Dashboards', status: 'released', note: 'A card builder with drag and drop: gauges, numbers, trends, entity lists, write buttons, script and recipe buttons, alarm lists, text, cameras, and a floor plan. Give a dashboard to the roles that need it, or bind it to one physical screen. One layout folds from twelve columns on a panel PC to one on a phone, so nobody ever builds the phone version. A card commands nothing itself, so a button still meets the write gate.' },
  { name: 'ISA-18.2 alarms', status: 'released', note: 'Includes rtn-unack, the alarm that cleared before anyone acknowledged it, so a trip that fixed itself is still there at shift change. Shelving ends, and unshelve brings the alarm back in the state it\'s really in.' },
  { name: 'Notifications', status: 'released', note: 'ntfy, Gotify, Discord (a webhook, or a bot), webhooks, and email. Press Acknowledge on an ntfy push or in the Discord bot and the alarm is acknowledged, signed and single use. Gotify and the Discord webhook are one way. Discord has only met a stand-in, not the real thing.' },
  { name: 'AI agents (over MCP)', status: 'released', note: 'An agent can read the whole plant and touch only what you armed, through the write gate, and never without a stated reason, which goes in the system log next to the write. Agent writes are on since 4.19.4, behind the same master switch as the screen, so with writes off nothing writes. The endpoint always has a token: a bare binary or Quadlet unit makes one at its first start, and hotloop mcp-token prints it.' },
  { name: 'Writes to scaled tags land right', status: 'released', note: 'Write 55.5 to a tag scaled by 0.1 and 555 goes in the register, where 55 used to. A count the register can\'t hold is refused instead of wrapping, and a recipe with a value that doesn\'t fit is refused whole before its first write. If anyone typed raw counts to work around the old behavior, that now sends ten times too much, so check your scaled tags before you upgrade.' },
  { name: 'MQTT and an embedded broker', status: 'released', note: 'Plain topics with JSON paths, Sparkplug B, and an optional broker in the same process, so one box can be the whole install.' },
  { name: 'The sun', status: 'released', note: 'Sunrise, sunset, dawn, dusk, and the sun\'s height and bearing, worked out on the box from the site\'s latitude and longitude, plus a sun trigger with an offset. A site whose uplink died three weeks ago still turns the yard lights on at dusk.' },
  { name: 'MQTT discovery', status: 'released', note: 'ESPHome, Zigbee2MQTT, Tasmota, and Shelly Gen2 and later show up on their own, as read-only devices, on the embedded broker or any other. Nothing is armed until a person accepts the device and arms each point, so a device announcing itself never earns the right to flip a relay. Proven against recordings of real devices, not yet a bench of them.' },
  { name: 'Network discovery', status: 'released', note: 'mDNS and SSDP announcements are overheard, and DHCP is heard if the deployment allows it. Finds land next to the MQTT devices with what they are and how HotLoop could talk to them. Probing stays off until a network is named, because a port sweep has knocked over PLCs. Nothing is added by itself.' },
  { name: 'Broker logins with rules', status: 'released', note: 'A twelve dollar plug\'s login can\'t publish to the boiler\'s command topic. Logins made in HotLoop carry publish and subscribe rules from a profile, checked on every publish, subscription, and outgoing message. Logins from HOTLOOP_BROKER_USERS are unrestricted, as before.' },
  { name: 'Historian targets', status: 'released', note: 'Every reading also goes to the plant\'s own database: PostgreSQL and TimescaleDB, SQL Server, InfluxDB 2 and 3, MySQL and MariaDB. Same readings, same deadband, same quality. Polling never waits for a target, and one that falls behind catches up from HotLoop\'s own history.' },
  { name: 'A Kafka event stream', status: 'released', note: 'Readings and the system log go to any broker that speaks the Kafka API, Apache Kafka and Redpanda included, as one more kind of historian target, with TLS and SCRAM-SHA-256, SCRAM-SHA-512 or PLAIN. It is at least once, so a reading can arrive twice after an outage, and events have no catch-up. Proven against Kafka 4.4.0 and Redpanda 26.2.6, not Confluent Cloud, MSK or Event Hubs. The Edge Relay doesn\'t carry it.' },
  { name: 'SQLite or PostgreSQL, your pick', status: 'released', note: 'The database is a setting. A Pi can run any product on a SQLite file with no second container and no 300 MB database image on the SD card. Moving between databases is a backup and a restore.' },
  { name: 'Updates that roll themselves back', status: 'released', note: 'Quadlet boxes follow the stable tag and update themselves, and an update that can\'t pass its healthcheck is rolled back instead of reported as a success. On Helm (Kubernetes) you run the upgrade. Rolling back is only safe because migrations only add.' },
  { name: 'Every protocol driver', status: 'released', note: 'OPC UA, CODESYS, OPC UA PubSub, Modbus, MQTT and Sparkplug B, EtherNet/IP, S7comm, MTConnect, HTTP, SNMP, BACnet/IP, and UniFi. Protocols don\'t split the products, so nobody runs the Gateway just to reach one PLC.' },
  { name: 'CODESYS, by the names the programmer gave the variables', status: 'released', note: 'A CODESYS runtime is read and written through its own OPC UA server, from the application\'s Symbol Configuration, so a tag is Application.GVL_Line.rTemp and not a node id. A download or a restart reads bad with the reason and comes back with no hands. Proven against a real 4.22.0.0 runtime in a container, including a program of over a hundred thousand variables read in 2.4 seconds. Not run on a physical controller.' },
  { name: 'OPC UA PubSub over UADP', status: 'released', note: 'A device with the protocol opcua-pubsub listens for a publisher\'s DataSets over UDP, unicast or multicast, and a lost message marks that writer\'s tags uncertain until its next key frame. Proven against open62541 in both directions. Not yet against a CODESYS, Siemens or Beckhoff publisher, over a router, or with message security, which is refused by name.' },
  { name: 'UniFi, read-only', status: 'released', note: 'Devices, ports, PoE, WAN failover, and clients as tags, and a quiet PLC tells you which switch port it\'s on. WAN health comes from the console\'s own checks, so a backup link that\'s been dead for two days reads dead. Read on two real consoles, though a PoE draw above zero has not been seen yet. Nothing writes to a console yet.' },
  { name: 'UniFi screens and events', status: 'released', note: 'An overview with the WAN strip, a topology map that zooms and pinches and is laid out the same way every time, switch faceplates with port traffic traces, clients, networks, and WiFi, one button that makes the usual alarms, and the console\'s event stream so a switch dropping off lands in the logbook in seconds. An agent can ask over MCP for the topology and the latest events. Proven against a lab controller, with touch emulated, and not yet looked at on real gear.' },
  { name: 'UniFi writes', status: 'planned', note: 'Writes through the gate, starting with the locate LED. Then Protect, Access and PDUs, each only after it has run on real gear. Nothing writes to a console today.' },
  { name: 'Hardware access and hostNetwork', status: 'released', note: 'Every chart takes hostNetwork, off by default, for a pod that has to hear what its node hears, like UDP multicast on the node\'s loopback. Since 4.19.7 the charts also ship with the node\'s USB devices and Bluetooth socket mounted for what plugs in later, which makes the pod root on the node. Three switches turn that off. HotLoop has no Bluetooth, Z-Wave or USB serial code of its own yet, and Zigbee comes through Zigbee2MQTT over MQTT.' },
  { name: 'Backups and restore', status: 'released', note: 'Pure Go over the database connection, in IoT, Edge, and the Gateway. It\'s also how you move between them, so it has to work every time.' },
];

// What Edge adds on top of IoT.
export const EDGE_FEATURES: Feature[] = [
  { name: 'Store-and-forward', status: 'released', note: 'A dead link leaves no hole in the historian upstream: it buffers and replays in order, flagged historical. Publishes upstream as a Sparkplug B edge node. Off until you switch edge publishing on.' },
  { name: 'Runs with the WAN dead', status: 'released', note: 'A real Edge was booted with its uplink pointed at a link that eats every packet, and the screen, a write, a script, a recipe, an automation, and an alarm all worked. A box rebooted mid-outage used to crash-loop. The queue holds messages in memory first and uses disk only when the broker stops confirming, replays oldest first, and is capped at 64 MiB by default.' },
  { name: 'OPC UA server', status: 'released', note: 'The SCADA you already own sees every tag without a new driver. Read-only and secured, and Ignition 8.3.9 reads it end to end. Off until you switch it on.' },
  { name: 'OPC UA PubSub publisher', status: 'released', note: 'Edge can publish the tags a layout names as UADP, key frames when values change and keep alives when they don\'t. A bad tag goes out as its status, never as its last value. Off until HOTLOOP_UADP_PUBLISH_ENABLED is set, and not in IoT, which has no OPC UA server.' },
  { name: 'Panel mode', status: 'released', note: 'A dashboard bound to a physical screen opens full bleed at /?screen=name, with no header, no tabs, and bigger touch targets, and it works against the box with the uplink down. That comes with the dashboards, so IoT and the Gateway have it too. It is not something only Edge has.' },
  { name: 'HMI symbols, faceplates and PIN sign-in', status: 'planned', note: 'The ISA-101 symbol library, the motor and valve faceplates and PIN sign-in for shared panels. None of it is built.' },
];

// What the Gateway adds on top of Edge.
export const GATEWAY_FEATURES: Feature[] = [
  { name: 'Fleet', status: 'released', note: 'Restart a relay, ask it to rebirth (re-announce itself), or send it a new device file without anybody driving out to the box. Fleet knows every Edge Relay you register from its Sparkplug birth and death messages. Off until you switch it on, and API only, no screen yet. A pushed file lands from 4.17.0 on; 4.16.0 relays dropped it.' },
  { name: 'Multi-site', status: 'released', note: 'One Gateway asks the others the questions it would answer for itself. A site that doesn\'t answer shows as unreachable, never as zero alarms.' },
  { name: 'Scheduled reports', status: 'released', note: 'Historian numbers on a schedule, as CSV or HTML, stored and emailed. Only good readings count, and every row says how many it threw out.' },
];

// Cascade is its own product and is not one of the four from the shared codebase,
// so it lives beside PRODUCTS. 0.1.1 was its first release, 1.0.0 the editor and identity
// release. A 0.1.0 tag exists and never published anything. The repository is private, the
// image and chart are public. Change it here when the next release ships.
export const CASCADE = '1.0.2';

// HotLoop Transmitter is its own release line: a CODESYS library (HotLoop-io/hotloop-transmitter)
// that publishes PLC values as OPC UA PubSub. 1.1.0 shipped on 2026-11-04 (1.0.0 the same day). The repository is private,
// so the files are served from hotloop.io/hotloop-transmitter/<version>/ the way the charts are
// (that repository's gh-pages branch). Change `version` here and in the release note when the next one ships.
export const TRANSMITTER = {
  version: '1.1.0',
  downloads: 'https://hotloop.io/hotloop-transmitter/',
};
