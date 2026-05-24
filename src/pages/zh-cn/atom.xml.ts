import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

const LOCALE = 'zh-cn';
const SITE_URL = 'https://softmeal.org';
const FEED_TITLE = 'softmeal.org — 简体中文';
const FEED_DESCRIPTION = '吞咽困难与质感改良饮食知识中心 — IDDSI 指南、食谱及照护者资源。';
const FEED_LANG = 'zh-CN';

export const GET: APIRoute = async () => {
  const pages = await getCollection('pages', (p) => p.id.startsWith(`${LOCALE}/`));
  const recipes = await getCollection('recipes', (r) => r.id.startsWith(`${LOCALE}/`));

  const allItems = [
    ...pages.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      link: `${SITE_URL}/${p.id.replace(/\.mdx?$/, '')}/`,
      updated: new Date(p.data.last_modified),
      id: `${SITE_URL}/${p.id.replace(/\.mdx?$/, '')}/`,
    })),
    ...recipes.map((r) => ({
      title: r.data.title,
      description: r.data.description,
      link: `${SITE_URL}/${r.id.replace(/\.mdx?$/, '')}/`,
      updated: new Date(r.data.last_modified),
      id: `${SITE_URL}/${r.id.replace(/\.mdx?$/, '')}/`,
    })),
  ]
    .sort((a, b) => b.updated.getTime() - a.updated.getTime())
    .slice(0, 30);

  const feedUpdated = allItems[0]?.updated.toISOString() ?? new Date().toISOString();

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${FEED_LANG}">
  <title>${esc(FEED_TITLE)}</title>
  <subtitle>${esc(FEED_DESCRIPTION)}</subtitle>
  <link href="${SITE_URL}/${LOCALE}/" />
  <link rel="self" type="application/atom+xml" href="${SITE_URL}/${LOCALE}/atom.xml" />
  <id>${SITE_URL}/${LOCALE}/</id>
  <updated>${feedUpdated}</updated>
  <author><name>softmeal.org</name></author>
${allItems
  .map(
    (item) => `  <entry>
    <title>${esc(item.title)}</title>
    <link href="${item.link}" />
    <id>${item.id}</id>
    <updated>${item.updated.toISOString()}</updated>
    <summary>${esc(item.description)}</summary>
  </entry>`
  )
  .join('\n')}
</feed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
