import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://softmeal.org';
  const lastmod = new Date().toISOString().split('T')[0];
  const langs = ['zh-hk', 'zh-cn', 'ja', 'en'];

  // Gather all page slugs (excluding index pages — they map to lang root)
  const pages = await getCollection('pages');
  const recipes = await getCollection('recipes');

  const urls: string[] = [];

  for (const lang of langs) {
    // Language root (index pages)
    urls.push(`${siteUrl}/${lang}/`);

    // Non-index pages
    const langPages = pages.filter(
      (p) => p.id.startsWith(`${lang}/`) && !p.id.includes('/index')
    );
    for (const page of langPages) {
      const slug = page.id.split('/').pop()!.replace(/\.mdx?$/, '');
      urls.push(`${siteUrl}/${lang}/${slug}/`);
    }

    // Recipes index (page 1 = canonical /recipes/)
    urls.push(`${siteUrl}/${lang}/recipes/`);

    // Paginated recipe index pages (page 2+)
    const langRecipes = recipes.filter((r) => r.id.startsWith(`${lang}/`));
    const PAGE_SIZE = 24;
    const totalPages = Math.ceil(langRecipes.length / PAGE_SIZE);
    for (let p = 2; p <= totalPages; p++) {
      urls.push(`${siteUrl}/${lang}/recipes/${p}/`);
    }

    // Individual recipes
    for (const recipe of langRecipes) {
      const slug = recipe.id.split('/').pop()!.replace(/\.mdx?$/, '');
      urls.push(`${siteUrl}/${lang}/recipes/${slug}/`);
    }
  }

  const urlEntries = urls.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
