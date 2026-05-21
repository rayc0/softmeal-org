/**
 * Per-page OG image generator — build-time static PNG via sharp (SVG template → PNG).
 * Generates for all zh-hk pages + recipes (primary social sharing locale).
 * Output: /og/<type>/<slug>.png  (1200×630)
 */
import type { GetStaticPaths, APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';

export const GET: APIRoute = async ({ params }) => {
  const pathStr = params.path ?? '';
  const parts = pathStr.split('/');
  // path format: "recipes/<slug>" or "pages/<slug>"
  const type = parts[0];
  const slug = parts.slice(1).join('/');

  let title = 'softmeal.org';
  let description = '香港照護食知識中心';
  let badge = '';
  let badgeColor = '#10b981'; // emerald

  if (type === 'recipes') {
    const recipes = await getCollection('recipes');
    const recipe = recipes.find((r) => {
      const rParts = r.id.split('/');
      return rParts[0] === 'zh-hk' && rParts[rParts.length - 1].replace(/\.mdx?$/, '') === slug;
    });
    if (recipe) {
      title = recipe.data.title;
      description = recipe.data.description.slice(0, 100);
      badge = `IDDSI Level ${recipe.data.iddsi_level}`;
      const levelColors: Record<number, string> = {
        0: '#60a5fa', 1: '#93c5fd', 2: '#a78bfa', 3: '#f59e0b',
        4: '#f97316', 5: '#ef4444', 6: '#8b5cf6', 7: '#6b7280',
      };
      badgeColor = levelColors[recipe.data.iddsi_level] ?? '#10b981';
    }
  } else if (type === 'pages') {
    const pages = await getCollection('pages');
    const page = pages.find((p) => {
      const pParts = p.id.split('/');
      return pParts[0] === 'zh-hk' && pParts[pParts.length - 1].replace(/\.mdx?$/, '') === slug;
    });
    if (page) {
      title = page.data.title;
      description = page.data.description.slice(0, 100);
      badge = page.data.schema_type === 'MedicalWebPage' ? '醫療資訊' : '知識庫';
      badgeColor = '#0ea5e9'; // sky
    }
  }

  // Truncate long titles/descriptions for SVG layout
  const titleShort = title.length > 50 ? title.slice(0, 48) + '…' : title;
  const descShort = description.length > 95 ? description.slice(0, 93) + '…' : description;

  // Escape XML special chars
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0fdf4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e0f2fe;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <!-- Left accent bar -->
  <rect x="0" y="0" width="8" height="630" fill="${esc(badgeColor)}" />
  <!-- Logo / brand -->
  <text x="60" y="80" font-family="PingFang TC, Hiragino Sans, system-ui, sans-serif"
        font-size="28" font-weight="700" fill="#064e3b">softmeal.org</text>
  <!-- Badge -->
  <rect x="60" y="105" width="${badge.length * 14 + 24}" height="36" rx="6" fill="${esc(badgeColor)}" />
  <text x="${60 + 12}" y="129" font-family="PingFang TC, Hiragino Sans, system-ui, sans-serif"
        font-size="18" font-weight="600" fill="white">${esc(badge)}</text>
  <!-- Title -->
  <text x="60" y="230" font-family="PingFang TC, Hiragino Sans, system-ui, sans-serif"
        font-size="48" font-weight="800" fill="#1a2e1a" text-anchor="start">${esc(titleShort)}</text>
  <!-- Description -->
  <text x="60" y="300" font-family="PingFang TC, Hiragino Sans, system-ui, sans-serif"
        font-size="26" fill="#374151" text-anchor="start">${esc(descShort)}</text>
  <!-- Bottom bar -->
  <rect x="0" y="580" width="1200" height="50" fill="${esc(badgeColor)}" opacity="0.15" />
  <text x="60" y="612" font-family="PingFang TC, Hiragino Sans, system-ui, sans-serif"
        font-size="20" fill="#374151">香港照護食知識中心 · 吞嚥困難 · IDDSI · 免費資源</text>
</svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [recipes, pages] = await Promise.all([
    getCollection('recipes'),
    getCollection('pages'),
  ]);

  const recipePaths = recipes
    .filter((r) => r.id.startsWith('zh-hk/'))
    .map((r) => {
      const slug = r.id.split('/').pop()!.replace(/\.mdx?$/, '');
      return { params: { path: `recipes/${slug}` } };
    });

  const pagePaths = pages
    .filter((p) => p.id.startsWith('zh-hk/'))
    .map((p) => {
      const slug = p.id.split('/').pop()!.replace(/\.mdx?$/, '');
      return { params: { path: `pages/${slug}` } };
    });

  return [...recipePaths, ...pagePaths];
};
