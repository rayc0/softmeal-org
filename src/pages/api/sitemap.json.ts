import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://softmeal.org';
const LOCALES = ['zh-hk', 'zh-cn', 'ja', 'en'] as const;

export const GET: APIRoute = async () => {
  const [pages, recipes] = await Promise.all([
    getCollection('pages'),
    getCollection('recipes'),
  ]);

  const urls: { url: string; lang: string; type: string; last_modified: string }[] = [];

  for (const p of pages) {
    if (p.data.noindex) continue;
    const slug = p.id.replace(/\.mdx?$/, '');
    urls.push({
      url: `${SITE}/${slug}/`,
      lang: p.data.lang,
      type: 'page',
      last_modified: p.data.last_modified,
    });
  }

  for (const r of recipes) {
    const slug = r.id.replace(/\.mdx?$/, '');
    urls.push({
      url: `${SITE}/${slug}/`,
      lang: r.data.lang,
      type: 'recipe',
      last_modified: r.data.last_modified,
    });
  }

  // Sort: locale then type then URL
  urls.sort((a, b) =>
    LOCALES.indexOf(a.lang as typeof LOCALES[number]) - LOCALES.indexOf(b.lang as typeof LOCALES[number]) ||
    a.type.localeCompare(b.type) ||
    a.url.localeCompare(b.url)
  );

  const byLocale: Record<string, number> = {};
  for (const u of urls) {
    byLocale[u.lang] = (byLocale[u.lang] ?? 0) + 1;
  }

  return new Response(
    JSON.stringify({
      meta: {
        total: urls.length,
        by_locale: byLocale,
        site: SITE,
        generated: new Date().toISOString().split('T')[0],
      },
      urls,
    }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
