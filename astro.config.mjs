import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://softmeal.org',
  output: 'static',
  trailingSlash: 'always',

  i18n: {
    defaultLocale: 'zh-hk',
    locales: ['zh-hk', 'zh-cn', 'ja', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },

  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    // NOTE: @astrojs/sitemap is intentionally NOT used here.
    // A custom multi-locale sitemap is implemented via:
    //   src/pages/sitemap-index.xml.ts        — sitemap index
    //   src/pages/sitemap-[locale].xml.ts     — per-locale page sitemaps (zh-hk/zh-cn/ja/en)
    //   src/pages/sitemap-recipes-[locale].xml.ts — per-locale recipe sitemaps
    //   src/pages/sitemap-images.xml.ts       — image sitemap
    // This covers all 4 i18n locales more precisely than the generic integration.
  ],
});
