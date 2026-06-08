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

  const pages = await getCollection('pages');
  const recipes = await getCollection('recipes');

  const urls: string[] = [];

  // Language root
  urls.push(`${siteUrl}/${locale}/`);

  // Non-index pages
  const langPages = pages.filter(
    (p) => p.id.startsWith(`${locale}/`) && !p.id.includes('/index')
  );
  for (const page of langPages) {
    const slug = page.id.split('/').pop()!.replace(/\.mdx?$/, '');
    urls.push(`${siteUrl}/${locale}/${slug}/`);
  }

  // Recipes index (page 1 = canonical /recipes/)
  urls.push(`${siteUrl}/${locale}/recipes/`);

  // Paginated recipe index pages (page 2+)
  const langRecipes = recipes.filter((r) => r.id.startsWith(`${locale}/`));
  const PAGE_SIZE = 24;
  const totalPages = Math.ceil(langRecipes.length / PAGE_SIZE);
  for (let p = 2; p <= totalPages; p++) {
    urls.push(`${siteUrl}/${locale}/recipes/${p}/`);
  }

  const urlEntries = urls
    .map(
      (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
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
