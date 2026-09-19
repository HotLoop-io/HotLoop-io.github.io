// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hotloop.io',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  // Prefetch on viewport entry. With view transitions this is what makes a
  // click feel instant instead of merely fast.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  // The 404 page must not be in the sitemap: it is marked noindex, and listing a
  // noindex page there is a contradiction Search Console reports as an error.
  integrations: [sitemap({ filter: (page) => !/\/404\/?$/.test(page) })],
});
