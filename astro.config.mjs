import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://softmeal.org',
  output: 'static',
  trailingSlash: 'always',

  i18n: {
    defaultLocale: 'zh-hk',
    locales: ['zh-hk', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },

  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
  ],
});
