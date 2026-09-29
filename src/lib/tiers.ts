// One definition of the four verification tiers, used by the home page, the
// integrations grid, and every protocol page, so they cannot disagree about what
// a tier means.
//
// Careful with the wording of 'live'. It does not say "a real server" in every
// case, because the Gateway's own PROTOCOLS.md verifies MTConnect against golden
// agent documents served over HTTP. The tier means "ran against a real target
// and the row names it", and the row's own text is what carries the detail.

export type Tier = 'certified' | 'live' | 'decode' | 'gateway-mode';

export const TIERS: Record<Tier, { label: string; chip: 'ok' | 'warn' | 'info' | 'none'; blurb: string }> = {
  certified: {
    label: 'Certified',
    chip: 'none',
    blurb:
      'Proven on real plant equipment by somebody standing next to it. Nothing has earned this yet. The day something does, that zero becomes a one, and not a day before.',
  },
  live: {
    label: 'Verified live',
    chip: 'ok',
    blurb: 'Ran against a real target, and the row names exactly which one. Real is not the same as certified, so it doesn\'t get to say certified.',
  },
  decode: {
    label: 'Decode tested',
    chip: 'warn',
    blurb: 'Tested hard at the frame level and never run against a physical PLC. The first real one is commissioning, not a formality.',
  },
  'gateway-mode': {
    label: 'Gateway mode',
    chip: 'info',
    blurb: 'No driver, on purpose. These come in through the gateway your site already has, instead of a half-built one of ours.',
  },
};

export const TIER_ORDER: Tier[] = ['certified', 'live', 'decode', 'gateway-mode'];

/** Renders `code` spans in the generated notes without pulling in a markdown parser. */
export function splitCode(s: string): { code: boolean; text: string }[] {
  return s.split(/(`[^`]+`)/g).filter(Boolean).map((t) =>
    t.startsWith('`') ? { code: true, text: t.slice(1, -1) } : { code: false, text: t },
  );
}
