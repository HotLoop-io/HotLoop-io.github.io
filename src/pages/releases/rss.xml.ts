import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

// RSS is the one distribution channel that works before you have an audience,
// and it costs one file. Unpublished Gateway versions are in the feed, and each
// one says so in its title, so a reader is never told something shipped when it
// has not.
export async function GET(context: APIContext) {
  const releases = (await getCollection('releases')).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
  const NAME = { gateway: 'HotLoop Gateway', flow: 'HotLoop Flow' } as const;

  return rss({
    title: 'HotLoop release notes',
    description: 'What changed in HotLoop Gateway and HotLoop Flow, including which versions are actually published.',
    site: context.site!,
    items: releases.map((r) => ({
      title: `${NAME[r.data.product]} ${r.data.version}${r.data.published ? '' : ' (merged, not yet published)'}`,
      pubDate: r.data.date,
      description: r.data.summary,
      link: `/releases/${r.data.product}/#${r.data.product}-${r.data.version}`,
    })),
  });
}
