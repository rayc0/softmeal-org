import { defineCollection, z } from 'astro:content';

const pageCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().min(40, "Description should be 40+ chars (60+ recommended for full SERP width)").max(200),
    lang: z.enum(['zh-hk', 'zh-cn', 'ja', 'en']),
    last_modified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    related_articles: z.array(z.string()).optional(),
    schema_type: z.enum(['WebPage', 'MedicalWebPage', 'AboutPage', 'ContactPage']).default('WebPage'),
    hreflang_pair: z.string().optional(),
    noindex: z.boolean().default(false),
  }),
});

const recipeCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().min(40, "Description should be 40+ chars (60+ recommended for full SERP width)").max(200),
    lang: z.enum(['zh-hk', 'zh-cn', 'ja', 'en']),
    last_modified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    iddsi_level: z.number().int().min(0).max(7),
    prep_time_minutes: z.number().int().positive(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    main_ingredient: z.string(),
    tags: z.array(z.string()),
    fork_test_pass: z.boolean(),
    schema_type: z.literal('Recipe').default('Recipe'),
    hreflang_pair: z.string().optional(),
  }),
});

export const collections = {
  'pages': pageCollection,
  'recipes': recipeCollection,
};
