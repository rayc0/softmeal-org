import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

const LOCALE = 'zh-cn';
const SITE_URL = 'https://softmeal.org';
const FEED_TITLE = 'softmeal.org — 简体中文';
const FEED_DESCRIPTION = '吞咽困难与质感改良饮食知识中心 — IDDSI 指南、食谱及照护者资源。';

export const GET: APIRoute = async (context) => {
  const pages = await getCollection('pages', (p) => p.id.startsWith(`${LOCALE}/`));
  const recipes = await getCollection('recipes', (r) => r.id.startsWith(`${LOCALE}/`));

  const allItems = [
    ...pages.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      link: `${SITE_URL}/${p.id.replace(/\.mdx?$/, '')}/`,
      pubDate: new Date(p.data.last_modified),
      categories: [] as string[],
    })),
    ...recipes.map((r) => ({
      title: r.data.title,
      description: r.data.description,
      link: `${SITE_URL}/${r.id.replace(/\.mdx?$/, '')}/`,
      pubDate: new Date(r.data.last_modified),
      categories: r.data.tags ?? [],
    })),
  ]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 30);

  return rss({
    title: FEED_TITLE,
    description: FEED_DESCRIPTION,
    site: `${SITE_URL}/${LOCALE}/`,
    items: allItems,
    customData: `<language>zh-CN</language>`,
  });
};
