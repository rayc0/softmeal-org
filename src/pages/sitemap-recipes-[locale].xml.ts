import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

const LOCALES = ['zh-hk', 'zh-cn', 'ja', 'en'] as const;
type Locale = typeof LOCALES[number];

export const getStaticPaths: GetStaticPaths = () =>
  LOCALES.map((locale) => ({ params: { locale } }));

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale as Locale;
  const siteUrl = 'https://softmeal.org';
  const lastmod = new Date().toISOString().split('T')[0];

  const recipes = await getCollection('recipes');
  const langRecipes = recipes.filter((r) => r.id.startsWith(`${locale}/`));

  const urlEntries = langRecipes
    .map((recipe) => {
      const slug = recipe.id.split('/').pop()!.replace(/\.mdx?$/, '');
      const url = `${siteUrl}/${locale}/recipes/${slug}/`;
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
