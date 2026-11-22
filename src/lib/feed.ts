import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { useT } from '../i18n/t';
import { byCode } from '../i18n/locales';

// RSS is the one distribution channel that works before you have an audience,
// and it costs one file. Unpublished core versions are in the feed, and each
// one says so in its title, so a reader is never told something shipped when it
// has not. One feed per language: the channel title and description and the
// "never published" note are in the reader's language, and so is each release summary
// (an entry with no translation yet keeps the English one).
export async function feed(site: URL, code: string) {
  const { t } = useT(byCode(code));
  const releases = (await getCollection('releases')).sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() ||
      b.data.version.localeCompare(a.data.version, undefined, { numeric: true }),
  );
  const NAME = { core: 'HotLoop core', flow: 'HotLoop Flow', cascade: 'HotLoop Cascade', codesys: 'HotLoop for CODESYS', transmitter: 'HotLoop Transmitter' } as const;
  const translated = code === 'en' ? [] : (await getCollection('releasesI18n')).filter((e) => e.data.lang === byCode(code).path);
  const tr = new Map(translated.map((e) => [`${e.data.product}/${e.data.version}`, e.data.summary]));
  const prefix = code === 'en' ? '' : `/${byCode(code).path}`;

  return rss({
    title: t('rel.rssTitle'),
    description: t('rel.rssDesc'),
    site,
    items: releases.map((r) => ({
      title: `${NAME[r.data.product]} ${r.data.version}${r.data.published ? '' : ' ' + t('rel.rssUnpub')}`,
      pubDate: r.data.date,
      description: tr.get(`${r.data.product}/${r.data.version}`) ?? r.data.summary,
      link: `${prefix}/releases/${r.data.product}/#${r.data.product}-${r.data.version}`,
    })),
  });
}
