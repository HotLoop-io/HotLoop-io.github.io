// One definition of the four verification tiers, used by the home page, the
// integrations grid, and every protocol page, so they cannot disagree about what
// a tier means.
//
// 'live' means "ran against a real target and the row names it". A driver whose
// record names no real target (EtherNet/IP, S7comm, MTConnect and HTTP today:
// tests on recorded frames and documents, plus an unnamed bare-metal run) sits in
// 'decode' until a run against a named controller or agent is on record.

export type Tier = 'certified' | 'live' | 'decode' | 'gateway-mode';

export const TIERS: Record<Tier, { label: string; chip: 'ok' | 'warn' | 'info' | 'none'; blurb: string }> = {
  certified: {
    label: 'Certified',
    chip: 'none',
    blurb:
      'Proven on real plant equipment by somebody standing next to it, and the row names the site and the device.',
  },
  live: {
    label: 'Verified live',
    chip: 'ok',
    blurb: 'Ran against a real target, and the row names exactly which one.',
  },
  decode: {
    label: 'Decode tested',
    chip: 'warn',
    blurb: 'A driver proven on the raw protocol messages, ahead of a run on a real device.',
  },
  'gateway-mode': {
    label: 'Gateway mode',
    chip: 'info',
    blurb: 'These come in through the gateway your site already has, so they work on day one.',
  },
};

export const TIER_ORDER: Tier[] = ['certified', 'live', 'decode', 'gateway-mode'];

/** Renders `code` spans in the generated notes without pulling in a markdown parser. */
export function splitCode(s: string): { code: boolean; text: string }[] {
  return s.split(/(`[^`]+`)/g).filter(Boolean).map((t) =>
    t.startsWith('`') ? { code: true, text: t.slice(1, -1) } : { code: false, text: t },
  );
}
