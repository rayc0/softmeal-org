import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const pages = await getCollection('pages');
  const recipes = await getCollection('recipes');

  const siteUrl = 'https://softmeal.org';

  const articles = [
    ...pages.map(p => {
      const slug = p.id.replace(/\.mdx?$/, '');
      return {
        slug,
        type: 'page',
        title: p.data.title,
        description: p.data.description,
        lang: p.data.lang,
        last_modified: p.data.last_modified,
        schema_type: p.data.schema_type,
        url: `${siteUrl}/${slug}/`,
      };
    }),
    ...recipes.map(r => {
      const slug = r.id.replace(/\.mdx?$/, '');
      return {
        slug,
        type: 'recipe',
        title: r.data.title,
        description: r.data.description,
        lang: r.data.lang,
        last_modified: r.data.last_modified,
        iddsi_level: r.data.iddsi_level,
        tags: r.data.tags,
        url: `${siteUrl}/${slug}/`,
      };
    }),
  ];

  return new Response(JSON.stringify({ articles }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
