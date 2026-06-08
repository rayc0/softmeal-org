import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const [pages, recipes] = await Promise.all([
    getCollection('pages'),
    getCollection('recipes'),
  ]);

  const locales = ['zh-hk', 'zh-cn', 'ja', 'en'] as const;

  const pagesByLocale: Record<string, number> = {};
  const recipesByLocale: Record<string, number> = {};
  for (const loc of locales) {
    pagesByLocale[loc] = 0;
    recipesByLocale[loc] = 0;
  }
  for (const p of pages) pagesByLocale[p.data.lang] = (pagesByLocale[p.data.lang] ?? 0) + 1;
  for (const r of recipes) recipesByLocale[r.data.lang] = (recipesByLocale[r.data.lang] ?? 0) + 1;

  const allDates = [
    ...pages.map(p => p.data.last_modified),
    ...recipes.map(r => r.data.last_modified),
  ].sort().reverse();

  const lastContent = allDates[0] ?? null;

  return new Response(
    JSON.stringify({
      status: 'ok',
      build_time: new Date().toISOString(),
      last_content_modified: lastContent,
      content: {
        pages: {
          total: pages.length,
          by_locale: pagesByLocale,
        },
        recipes: {
          total: recipes.length,
          by_locale: recipesByLocale,
        },
        total: pages.length + recipes.length,
      },
      site: 'https://softmeal.org',
    }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
