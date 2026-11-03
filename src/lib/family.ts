// The lineup as one family: six products on three release lines. Every page that
// introduces the lineup reads from here, so the sentence and the links match
// everywhere. The docs site (HotLoop-io/docs) says the same thing in its landing.
import { CURRENT, CASCADE } from './products';

export const FAMILY_SENTENCE =
  'HotLoop is six products for the plant floor: four that grow with a site (IoT, Edge, Gateway, Edge Relay), plus Flow for wiring and Cascade for workflows.';

const DOCS = 'https://docs.hotloop.io';

export type Member = {
  id: string;
  name: string;
  href: string;
  tagline: string;
  docs: string;
  install: string;
  releases: string;
  roadmap: string;
};

const core = (id: string, name: string, href: string, tagline: string): Member => ({
  id, name, href, tagline,
  docs: `${DOCS}/${id}/overview/`,
  install: `${DOCS}/${id}/install/`,
  releases: '/releases/core/',
  roadmap: `${DOCS}/roadmap/`,
});

export const LINES = [
  {
    id: 'core',
    label: 'HotLoop core',
    version: CURRENT,
    blurb: 'One codebase and one version. IoT to Edge to Gateway is the path a site grows along, and Edge Relay is the forwarder with no screen that sits beside them.',
    members: [
      core('iot', 'HotLoop IoT', '/iot/', 'The automation base, built in Go for OT.'),
      core('edge', 'HotLoop Edge', '/edge/', 'IoT plus the machine layer.'),
      core('gateway', 'HotLoop Gateway', '/gateway/', 'Everything, for the whole site.'),
      core('edge-relay', 'HotLoop Edge Relay', '/edge-relay/', 'Poll, forward, survive.'),
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    version: '', // filled from the releases collection by the page
    blurb: 'Its own release line, running next to HotLoop.',
    members: [
      { id: 'flow', name: 'HotLoop Flow', href: '/flow/', tagline: 'Node-RED compatible flows on a Go runtime.', docs: `${DOCS}/flow/overview/`, install: `${DOCS}/flow/install/`, releases: '/releases/flow/', roadmap: `${DOCS}/flow/roadmap/` },
    ],
  },
  {
    id: 'cascade',
    label: 'Cascade',
    version: CASCADE,
    blurb: 'Its own release line, running next to HotLoop.',
    members: [
      { id: 'cascade', name: 'HotLoop Cascade', href: '/cascade/', tagline: 'The plant talking to everything else.', docs: `${DOCS}/cascade/overview/`, install: `${DOCS}/cascade/running/`, releases: '/releases/cascade/', roadmap: `${DOCS}/cascade/roadmap/` },
    ],
  },
];

export const memberOf = (id: string) => LINES.flatMap((l) => l.members).find((m) => m.id === id)!;
export const lineOf = (id: string) => LINES.find((l) => l.members.some((m) => m.id === id))!;
