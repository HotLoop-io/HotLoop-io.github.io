// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// English plus the thirteen languages the HotLoop products ship in. English has no folder, so every
// English URL is exactly where it always was. The same list lives in src/i18n/locales.ts, which the
// pages read; scripts/i18n-check.mjs fails the build if the two ever disagree.
// https://docs.astro.build/en/guides/internationalization/
const LANGS = {
  en: 'en', es: 'es', fr: 'fr', it: 'it', de: 'de', nb: 'nb', bg: 'bg', el: 'el',
  ko: 'ko', ja: 'ja', vi: 'vi', hi: 'hi', 'zh-hans': 'zh-Hans', ar: 'ar',
};

export default defineConfig({
  site: 'https://hotloop.io',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  // The release notes for IoT, Edge, Gateway and Edge Relay are one line, HotLoop
  // core, so the old Gateway URL goes there and no link breaks.
  redirects: { '/releases/gateway/': '/releases/core/' },
  // Prefetch on viewport entry. With view transitions this is what makes a
  // click feel instant instead of merely fast.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  // The 404 page must not be in the sitemap: it is marked noindex, and listing a
  // noindex page there is a contradiction Search Console reports as an error.
  i18n: {
    defaultLocale: 'en',
    locales: [
      'en',
      ...Object.keys(LANGS).filter((k) => k !== 'en' && k !== 'zh-hans'),
      { path: 'zh-hans', codes: ['zh-Hans', 'zh'] },
    ],
    routing: { prefixDefaultLocale: false },
  },
  // The sitemap carries the same hreflang alternates the pages do, for the pages that exist in every language.
  integrations: [sitemap({ filter: (page) => !/\/404\/?$/.test(page), i18n: { defaultLocale: 'en', locales: LANGS } })],
});
