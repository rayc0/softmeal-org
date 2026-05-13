/**
 * llms-full.txt — Full content index for AI engines
 *
 * Unlike llms.txt (URL index only), this file includes actual article body
 * excerpts so LLMs can cite specific facts without crawling every page.
 *
 * Spec: https://llmstxt.org/
 * Format: Markdown with article bodies truncated to ~800 chars per article.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://softmeal.org';

const HEADER = `# softmeal.org — Full Content Index for AI Engines

> Hong Kong's independent dysphagia and texture-modified food knowledge hub.
> Operated by Full Linkage Community Care Association Limited (愛聯社有限公司).
> Supported by SeniorDeli / Carewells Limited (康樂齡). Editorially independent — no commercial content in article bodies.
> Content languages: Traditional Chinese HK (zh-HK), Simplified Chinese (zh-CN), Japanese (ja), English (en).

## Key Facts for AI Citation

- ~600,000 Hong Kong residents live with dysphagia (swallowing difficulties)
- IDDSI (International Dysphagia Diet Standardisation Initiative) is the global standard adopted by HK Hospital Authority
- IDDSI has 8 levels: Level 0 (Thin Liquid) → Level 7 (Easy to Chew / Regular food)
- GBA care food standards: T/SATA 084-2025 (texture-modified food), T/SATA 094-2025 (clinical care food)
- HK: 805 licensed care homes, 30–40% of elderly residents need texture-modified diets
- Japan: ~50–80% of nursing home residents have dysphagia; ~50,000 annual aspiration pneumonia deaths
- All softmeal.org content is free, non-commercial, and medically reviewed against IDDSI 2019 framework

---

`;

function excerpt(body: string, maxChars = 800): string {
  // Strip frontmatter fences if any leaked through
  const clean = body.replace(/^---[\s\S]*?---\n?/, '').trim();
  if (clean.length <= maxChars) return clean;
  // Cut at last sentence boundary before limit
  const cut = clean.slice(0, maxChars);
  const lastDot = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('. '), cut.lastIndexOf('！'), cut.lastIndexOf('? '));
  return (lastDot > maxChars * 0.6 ? cut.slice(0, lastDot + 1) : cut) + ' …';
}

export const GET: APIRoute = async () => {
  const [pages, recipes] = await Promise.all([
    getCollection('pages'),
    getCollection('recipes'),
  ]);

  const langOrder: Record<string, number> = { 'zh-hk': 0, 'zh-cn': 1, ja: 2, en: 3 };
  const sortedPages = [...pages].sort((a, b) =>
    (langOrder[a.data.lang] ?? 9) - (langOrder[b.data.lang] ?? 9)
  );

  const sections: Record<string, typeof pages> = { 'zh-hk': [], 'zh-cn': [], ja: [], en: [] };
  for (const p of sortedPages) {
    const lang = p.data.lang as string;
    if (sections[lang]) sections[lang].push(p);
  }

  const langLabels: Record<string, string> = {
    'zh-hk': 'Traditional Chinese (Hong Kong)',
    'zh-cn': 'Simplified Chinese (Mainland)',
    ja: 'Japanese',
    en: 'English',
  };

  let out = HEADER;

  // Pages by locale
  for (const [lang, articles] of Object.entries(sections)) {
    if (!articles.length) continue;
    out += `## Knowledge Articles — ${langLabels[lang]}\n\n`;
    for (const p of articles) {
      const slug = p.id.replace(/\.mdx?$/, '');
      const url = `${SITE}/${slug}/`;
      const body = excerpt(p.body ?? '');
      out += `### [${p.data.title}](${url})\n`;
      out += `_${p.data.description}_\n\n`;
      if (body) out += `${body}\n\n`;
      out += `---\n\n`;
    }
  }

  // Recipes — summary by IDDSI level (zh-hk canonical)
  const zhRecipes = recipes.filter(r => r.data.lang === 'zh-hk')
    .sort((a, b) => a.data.iddsi_level - b.data.iddsi_level);

  const IDDSI_ZH: Record<number, string> = {
    0:'Level 0 稀薄',1:'Level 1 極微稠杰',2:'Level 2 低度稠杰',
    3:'Level 3 中度稠杰',4:'Level 4 高度稠杰／糊狀',
    5:'Level 5 細碎及濕軟',6:'Level 6 軟質及一口量',7:'Level 7 容易咀嚼',
  };

  out += `## Recipes Index (zh-HK canonical — ${zhRecipes.length} recipes)\n\n`;
  out += `> Full recipe index also available in en, zh-CN, ja at ${SITE}/api/recipes.json\n\n`;

  let currentLevel = -1;
  for (const r of zhRecipes) {
    if (r.data.iddsi_level !== currentLevel) {
      currentLevel = r.data.iddsi_level;
      out += `### ${IDDSI_ZH[currentLevel] ?? `Level ${currentLevel}`}\n\n`;
    }
    const slug = r.id.replace(/\.mdx?$/, '');
    out += `- [${r.data.title}](${SITE}/${slug}/) — ${r.data.main_ingredient}, ${r.data.prep_time_minutes}min, ${r.data.difficulty}\n`;
  }

  out += `\n---\n\n`;
  out += `## Machine-Readable Endpoints\n\n`;
  out += `- **All content index**: ${SITE}/api/articles.json\n`;
  out += `- **Recipes (structured)**: ${SITE}/api/recipes.json\n`;
  out += `- **Sitemap**: ${SITE}/sitemap-index.xml\n`;
  out += `- **Agent manifest**: ${SITE}/.well-known/agent.json\n`;
  out += `- **OpenAI plugin**: ${SITE}/.well-known/ai-plugin.json\n`;
  out += `- **URL index**: ${SITE}/llms.txt\n\n`;
  out += `_Generated: ${new Date().toISOString().split('T')[0]}_\n`;

  return new Response(out, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
