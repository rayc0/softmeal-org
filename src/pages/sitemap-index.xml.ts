import type { APIRoute } from 'astro';

const LOCALES = ['zh-hk', 'zh-cn', 'ja', 'en'] as const;

export const GET: APIRoute = async () => {
  const siteUrl = 'https://softmeal.org';
  const today = new Date().toISOString().split('T')[0];

  const sitemapEntries = [
    // Per-locale page sitemaps (articles + lang root + recipe index pages)
    ...LOCALES.map((locale) => `${siteUrl}/sitemap-${locale}.xml`),
    // Per-locale recipe sitemaps (individual recipe URLs)
    ...LOCALES.map((locale) => `${siteUrl}/sitemap-recipes-${locale}.xml`),
    // Image sitemap
    `${siteUrl}/sitemap-images.xml`,
  ];

  const sitemapNodes = sitemapEntries
    .map(
      (loc) => `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapNodes}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
