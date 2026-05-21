import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Image sitemap — lists every page URL with its representative OG image.
 * All pages use /og-default.png as the canonical page image (1200×630 branded card).
 * Registered in sitemap-index.xml and robots.txt.
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */
export const GET: APIRoute = async () => {
  const siteUrl = 'https://softmeal.org';
  const ogImage = `${siteUrl}/og-default.png`;
  const langs = ['zh-hk', 'zh-cn', 'ja', 'en'] as const;

  const pages = await getCollection('pages');
  const recipes = await getCollection('recipes');

  // Each entry: { pageUrl, imageUrl, imageTitle }
  const entries: Array<{ pageUrl: string; imageUrl: string; imageTitle: string }> = [];

  for (const lang of langs) {
    // Language root (index page)
    entries.push({
      pageUrl: `${siteUrl}/${lang}/`,
      imageUrl: ogImage,
      imageTitle: 'softmeal.org — Care Food Knowledge Hub',
    });

    // Non-index pages
    const langPages = pages.filter(
      (p) => p.id.startsWith(`${lang}/`) && !p.id.includes('/index')
    );
    for (const page of langPages) {
      const slug = page.id.split('/').pop()!.replace(/\.mdx?$/, '');
      entries.push({
        pageUrl: `${siteUrl}/${lang}/${slug}/`,
        imageUrl: ogImage,
        imageTitle: page.data.title,
      });
    }

    // Recipes index
    entries.push({
      pageUrl: `${siteUrl}/${lang}/recipes/`,
      imageUrl: ogImage,
      imageTitle: 'softmeal.org Recipes',
    });

    // Individual recipes
    const langRecipes = recipes.filter((r) => r.id.startsWith(`${lang}/`));
    for (const recipe of langRecipes) {
      const slug = recipe.id.split('/').pop()!.replace(/\.mdx?$/, '');
      entries.push({
        pageUrl: `${siteUrl}/${lang}/recipes/${slug}/`,
        imageUrl: ogImage,
        imageTitle: recipe.data.title,
      });
    }
  }

  const urlEntries = entries
    .map(({ pageUrl, imageUrl, imageTitle }) => {
      // Escape XML special chars in title
      const safeTitle = imageTitle
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return `  <url>
    <loc>${pageUrl}</loc>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${safeTitle}</image:title>
    </image:image>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
