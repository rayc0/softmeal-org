import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://softmeal.org';
  const lastmod = '2026-05-07';

  const urls = [
    // zh-hk pages
    `${siteUrl}/zh-hk/`,
    `${siteUrl}/zh-hk/dysphagia/`,
    `${siteUrl}/zh-hk/iddsi-guide/`,
    `${siteUrl}/zh-hk/gba-standard/`,
    `${siteUrl}/zh-hk/about/`,
    `${siteUrl}/zh-hk/supplier-directory/`,
    `${siteUrl}/zh-hk/resources/`,
    `${siteUrl}/zh-hk/recipes/`,
    // zh-hk recipes
    `${siteUrl}/zh-hk/recipes/zhengdan-toufu/`,
    `${siteUrl}/zh-hk/recipes/nangua-cream/`,
    `${siteUrl}/zh-hk/recipes/ji-rou-zhou/`,
    `${siteUrl}/zh-hk/recipes/xilanhua-yu/`,
    `${siteUrl}/zh-hk/recipes/xiangjiao-yanbai/`,
    `${siteUrl}/zh-hk/recipes/fanqie-chaodan/`,
    `${siteUrl}/zh-hk/recipes/jiangzhi-zhengyu/`,
    `${siteUrl}/zh-hk/recipes/nanru-toufu-shizitou/`,
    `${siteUrl}/zh-hk/recipes/zhima-hu/`,
    `${siteUrl}/zh-hk/recipes/jiangcha-dongdong/`,
    // en pages
    `${siteUrl}/en/`,
    `${siteUrl}/en/dysphagia/`,
    `${siteUrl}/en/iddsi-guide/`,
    `${siteUrl}/en/gba-standard/`,
    `${siteUrl}/en/about/`,
    `${siteUrl}/en/supplier-directory/`,
    `${siteUrl}/en/resources/`,
    `${siteUrl}/en/recipes/`,
    // en recipes
    `${siteUrl}/en/recipes/zhengdan-toufu/`,
    `${siteUrl}/en/recipes/nangua-cream/`,
    `${siteUrl}/en/recipes/ji-rou-zhou/`,
    `${siteUrl}/en/recipes/xilanhua-yu/`,
    `${siteUrl}/en/recipes/xiangjiao-yanbai/`,
    `${siteUrl}/en/recipes/fanqie-chaodan/`,
    `${siteUrl}/en/recipes/jiangzhi-zhengyu/`,
    `${siteUrl}/en/recipes/nanru-toufu-shizitou/`,
    `${siteUrl}/en/recipes/zhima-hu/`,
    `${siteUrl}/en/recipes/jiangcha-dongdong/`,
  ];

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
