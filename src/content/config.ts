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
    schema_faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    course: z.boolean().optional(),
    medical_condition: z.object({
      name: z.string(),
      alternate_name: z.union([z.string(), z.array(z.string())]).optional(),
      anatomy: z.string(),
      anatomy_system: z.string().optional(),
      treatments: z.array(z.object({
        type: z.enum(['MedicalTherapy', 'Drug']).default('MedicalTherapy'),
        name: z.string(),
      })),
    }).optional(),
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
    calories: z.string().optional(),
    protein_content: z.string().optional(),
    sodium_content: z.string().optional(),
  }),
});

const advisorCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    credentials: z.string().optional(),
    specialty: z.string().optional(),
    portrait: z.string().optional(),
    reviewedCount: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
  }),
});

export const collections = {
  'pages': pageCollection,
  'recipes': recipeCollection,
  'advisors': advisorCollection,
};
