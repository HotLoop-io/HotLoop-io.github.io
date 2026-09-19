import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * The honesty norm, enforced by the build.
 *
 * Both product repos already fail their own build when a claim outruns its
 * evidence: Flow's tests fail if a partially compatible node does not say what
 * is missing, and the Gateway's tests fail if the protocol catalog advertises
 * a driver that is not compiled in. These refinements do the same thing for the
 * website, so the site cannot drift further in the flattering direction than
 * the repos it describes.
 */

const verification = z.enum([
  'certified', // proven on real plant equipment, by someone standing there
  'live', //      ran against a real target, and the page names it
  'decode', //    thorough frame-level tests, never run against a physical PLC
  'gateway-mode', // no driver, by choice
]);

const protocols = defineCollection({
  loader: file('src/data/protocols.json'),
  schema: z
    .object({
      name: z.string(),
      aka: z.array(z.string()).default([]),
      order: z.number(),
      verification,
      verifiedAgainst: z.array(z.string()).default([]),
      notVerifiedNote: z.string().default(''),
      summary: z.string(),
      vendors: z.array(z.string()).default([]),
      addressExamples: z
        .array(z.object({ expr: z.string(), means: z.string() }))
        .default([]),
      trap: z.string().default(''),
      configKeys: z.array(z.string()).default([]),
      body: z.array(z.string()).default([]),
    })
    .superRefine((p, ctx) => {
      if (p.verification === 'live' && p.verifiedAgainst.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: `${p.name}: claims "verified live" and names nothing it was verified against.`,
        });
      }
      if (p.verification === 'decode' && p.notVerifiedNote.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: `${p.name}: claims "decode tested" and does not say what has not been verified.`,
        });
      }
      if (p.verification === 'certified' && p.verifiedAgainst.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: `${p.name}: claims "certified" and names no certified instance.`,
        });
      }
    }),
});

const nodes = defineCollection({
  loader: file('src/data/nodes.json'),
  schema: z
    .object({
      type: z.string(),
      category: z.string(),
      level: z.enum(['full', 'partial', 'divergent', 'flow-only']),
      notes: z.string(),
    })
    .superRefine((n, ctx) => {
      if (n.level !== 'full' && (n.notes.trim() === '' || n.notes.trim() === '—')) {
        ctx.addIssue({
          code: 'custom',
          message: `${n.type}: is ${n.level} and says nothing about what is different.`,
        });
      }
    }),
});

const releases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/releases' }),
  schema: z.object({
    product: z.enum(['gateway', 'flow']),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    date: z.coerce.date(),
    // A merged version that has never been tagged or published must say so.
    // "published: false" is a fact the page prints, not a draft flag.
    published: z.boolean(),
    summary: z.string().min(20),
    highlights: z.array(z.string()).min(1),
    breaking: z.array(z.string()).default([]),
  }),
});

export const collections = { protocols, nodes, releases };
