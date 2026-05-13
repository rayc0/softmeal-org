import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const IDDSI_LABELS: Record<string, Record<number, string>> = {
  en:    { 0:'Thin',1:'Slightly Thick',2:'Mildly Thick',3:'Moderately Thick',4:'Puréed / Extremely Thick',5:'Minced & Moist',6:'Soft & Bite-Sized',7:'Easy to Chew' },
  'zh-hk':{ 0:'稀薄',1:'極微稠杰',2:'低度稠杰',3:'中度稠杰',4:'高度稠杰／糊狀',5:'細碎及濕軟',6:'軟質及一口量',7:'容易咀嚼' },
  'zh-cn':{ 0:'稀薄',1:'极微稠',2:'低度稠',3:'中度稠',4:'高度稠／糊状',5:'细碎及湿软',6:'软质及一口量',7:'容易咀嚼' },
  ja:    { 0:'とろみなし',1:'薄いとろみ',2:'中間のとろみ',3:'濃いとろみ',4:'ピューレ状',5:'ミンチ＆モイスト',6:'ソフト＆バイトサイズ',7:'普通食（容易咀嚼）' },
};

export const GET: APIRoute = async () => {
  const recipes = await getCollection('recipes');
  const siteUrl = 'https://softmeal.org';

  const data = recipes.map(r => {
    const slug = r.id.replace(/\.mdx?$/, '');
    const lang = r.data.lang;
    const level = r.data.iddsi_level;
    return {
      slug,
      url: `${siteUrl}/${slug}/`,
      lang,
      title: r.data.title,
      description: r.data.description,
      iddsi_level: level,
      iddsi_label: IDDSI_LABELS[lang]?.[level] ?? String(level),
      prep_time_minutes: r.data.prep_time_minutes,
      difficulty: r.data.difficulty,
      main_ingredient: r.data.main_ingredient,
      tags: r.data.tags,
      fork_test_pass: r.data.fork_test_pass,
      last_modified: r.data.last_modified,
    };
  }).sort((a, b) => a.iddsi_level - b.iddsi_level || a.lang.localeCompare(b.lang));

  const byLevel: Record<number, typeof data> = {};
  for (const r of data) {
    if (!byLevel[r.iddsi_level]) byLevel[r.iddsi_level] = [];
    byLevel[r.iddsi_level].push(r);
  }

  return new Response(
    JSON.stringify({
      meta: {
        total: data.length,
        by_level: Object.fromEntries(
          Object.entries(byLevel).map(([k, v]) => [k, v.length])
        ),
        locales: ['zh-hk', 'en', 'zh-cn', 'ja'],
        site: siteUrl,
        generated: new Date().toISOString().split('T')[0],
      },
      recipes: data,
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
