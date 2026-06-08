/**
 * MCP (Model Context Protocol) server for softmeal.org
 * Implements Streamable HTTP transport (spec 2024-11-05)
 * Route: /mcp
 */

type Env = Record<string, unknown>;

const MCP_VERSION = "2024-11-05";
const SERVER_NAME = "softmeal.org";
const SERVER_VERSION = "1.0.0";

const TOOLS = [
  {
    name: "search_recipes",
    description:
      "Search IDDSI-compliant care food recipes. Filter by IDDSI texture level (0–7), locale, dietary tags, or free-text query.",
    inputSchema: {
      type: "object",
      properties: {
        iddsi_level: {
          type: "integer",
          minimum: 0,
          maximum: 7,
          description:
            "IDDSI texture level: 0=Thin, 1=Slightly Thick, 2=Mildly Thick, 3=Moderately Thick, 4=Puréed, 5=Minced & Moist, 6=Soft & Bite-Sized, 7=Easy to Chew",
        },
        locale: {
          type: "string",
          enum: ["en", "zh-hk", "zh-cn", "ja"],
          description: "Language/locale filter",
        },
        dietary_tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Dietary tags to filter by (e.g. vegetarian, dairy-free, high-protein, egg, fish)",
        },
        query: {
          type: "string",
          description:
            "Free-text search across recipe titles, descriptions, and tags",
        },
        limit: {
          type: "integer",
          default: 20,
          maximum: 50,
          description: "Maximum results to return (default 20, max 50)",
        },
      },
    },
  },
  {
    name: "get_recipe",
    description:
      "Get a specific recipe by its slug. Returns full recipe metadata including URL, IDDSI level, prep time, difficulty, and tags.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: {
          type: "string",
          description:
            'Recipe slug, e.g. "en/steamed-egg-l4". Obtain slugs from search_recipes.',
        },
      },
    },
  },
  {
    name: "search_articles",
    description:
      "Search dysphagia knowledge articles and caregiver guides (pages only, not recipes). Topics: IDDSI framework, dysphagia management, stroke, Parkinson's, dementia, ALS, texture modification.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text search across article titles and descriptions",
        },
        locale: {
          type: "string",
          enum: ["en", "zh-hk", "zh-cn", "ja"],
          description: "Language/locale filter",
        },
        topic: {
          type: "string",
          description:
            "Topic keyword to filter by (e.g. iddsi, dysphagia, stroke, parkinson, dementia, thickening)",
        },
        limit: {
          type: "integer",
          default: 20,
          maximum: 50,
          description: "Maximum results to return (default 20, max 50)",
        },
      },
    },
  },
  {
    name: "get_article",
    description:
      "Get a specific article by its slug. Returns article metadata and URL.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: {
          type: "string",
          description:
            'Article slug, e.g. "en/what-is-iddsi". Obtain slugs from search_articles.',
        },
      },
    },
  },
  {
    name: "iddsi_classify",
    description:
      "Heuristically classify a food or drink into an IDDSI texture level (0–7) based on a description of its texture, consistency, or preparation method. Always verify with IDDSI standardised tests before serving to patients.",
    inputSchema: {
      type: "object",
      required: ["food_description"],
      properties: {
        food_description: {
          type: "string",
          description:
            'Description of the food/drink texture and preparation, e.g. "smooth puréed carrot soup with no lumps" or "soft steamed fish that flakes apart easily".',
        },
      },
    },
  },
];

// ─── JSON-RPC helpers ──────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function err(
  id: string | number | null,
  code: number,
  message: string
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function fetchRecipes(origin: string): Promise<unknown[]> {
  const resp = await fetch(`${origin}/api/recipes.json`);
  const data = (await resp.json()) as { recipes: unknown[] };
  return data.recipes ?? [];
}

async function fetchArticles(origin: string): Promise<unknown[]> {
  const resp = await fetch(`${origin}/api/articles.json`);
  const data = (await resp.json()) as { articles: unknown[] };
  return data.articles ?? [];
}

function matchesQuery(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

// ─── IDDSI heuristic classifier ───────────────────────────────────────────────

function classifyIddsi(description: string): {
  level: number;
  label: string;
  reasoning: string;
} {
  const d = description.toLowerCase();

  const checks: Array<{
    level: number;
    label: string;
    test: boolean;
    reasoning: string;
  }> = [
    {
      level: 0,
      label: "Thin",
      test:
        /\b(water|juice|broth|tea|coffee|soda)\b/.test(d) ||
        (d.includes("thin") && d.includes("liquid")),
      reasoning: "Flows freely like water; no thickening detected",
    },
    {
      level: 1,
      label: "Slightly Thick",
      test:
        d.includes("slightly thick") ||
        d.includes("level 1") ||
        d.includes("nectar"),
      reasoning: "Slightly thickened; flows through a straw with effort",
    },
    {
      level: 2,
      label: "Mildly Thick",
      test:
        d.includes("mildly thick") ||
        d.includes("level 2") ||
        (d.includes("honey") && d.includes("thick")),
      reasoning: "Mildly thick; flows off a spoon in a slow stream",
    },
    {
      level: 3,
      label: "Moderately Thick",
      test:
        d.includes("moderately thick") ||
        d.includes("level 3") ||
        d.includes("flows slowly"),
      reasoning: "Moderately thick; falls off spoon in dollops",
    },
    {
      level: 4,
      label: "Puréed",
      test:
        d.includes("purée") ||
        d.includes("puree") ||
        d.includes("level 4") ||
        (d.includes("smooth") &&
          (d.includes("no lump") || d.includes("homogeneous"))),
      reasoning: "Smooth purée; holds shape on a spoon; no lumps",
    },
    {
      level: 5,
      label: "Minced & Moist",
      test:
        d.includes("minced") ||
        d.includes("level 5") ||
        d.includes("finely chopped") ||
        (d.includes("moist") && d.includes("small piece")),
      reasoning: "Small moist pieces (≤4 mm) that clump together",
    },
    {
      level: 6,
      label: "Soft & Bite-Sized",
      test:
        d.includes("level 6") ||
        (d.includes("soft") &&
          (d.includes("bite") || d.includes("tender") || d.includes("fork"))),
      reasoning:
        "Soft, tender pieces (≤1.5 cm) that yield to tongue pressure",
    },
    {
      level: 7,
      label: "Easy to Chew",
      test:
        d.includes("level 7") ||
        d.includes("easy to chew") ||
        d.includes("7ec"),
      reasoning: "Normal soft food requiring minimal chewing effort",
    },
  ];

  for (const c of checks) {
    if (c.test) return { level: c.level, label: c.label, reasoning: c.reasoning };
  }

  // Fallback heuristics
  if (d.includes("smooth") || d.includes("blended"))
    return {
      level: 4,
      label: "Puréed",
      reasoning: "Smooth/blended texture suggests Level 4 Puréed",
    };
  if (d.includes("soft"))
    return {
      level: 6,
      label: "Soft & Bite-Sized",
      reasoning: "Soft texture description suggests Level 6",
    };

  return {
    level: 4,
    label: "Puréed",
    reasoning:
      "Unable to determine from description — defaulting to Level 4 (Puréed). Verify with IDDSI fork/spoon tests.",
  };
}

// ─── Tool execution ────────────────────────────────────────────────────────────

interface McpCallResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  origin: string
): Promise<McpCallResult> {
  switch (name) {
    case "search_recipes": {
      const recipes = await fetchRecipes(origin);
      let results = recipes as Array<Record<string, unknown>>;

      if (args.iddsi_level !== undefined) {
        results = results.filter((r) => r.iddsi_level === args.iddsi_level);
      }
      if (args.locale) {
        results = results.filter((r) => r.lang === args.locale);
      }
      if (Array.isArray(args.dietary_tags) && args.dietary_tags.length > 0) {
        const tags = args.dietary_tags as string[];
        results = results.filter(
          (r) =>
            Array.isArray(r.tags) && tags.some((t) => (r.tags as string[]).includes(t))
        );
      }
      if (args.query) {
        const q = args.query as string;
        results = results.filter(
          (r) =>
            matchesQuery(String(r.title ?? ""), q) ||
            matchesQuery(String(r.description ?? ""), q) ||
            (Array.isArray(r.tags) &&
              (r.tags as string[]).some((t) => matchesQuery(t, q)))
        );
      }

      const limit = Math.min(Number(args.limit ?? 20), 50);
      results = results.slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ total: results.length, recipes: results }, null, 2),
          },
        ],
      };
    }

    case "get_recipe": {
      const slug = String(args.slug ?? "");
      const recipes = await fetchRecipes(origin);
      const recipe = (recipes as Array<Record<string, unknown>>).find(
        (r) => r.slug === slug || r.slug === slug.replace(/^\//, "")
      );

      if (!recipe) {
        return {
          content: [{ type: "text", text: `Recipe not found: ${slug}` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(recipe, null, 2) }] };
    }

    case "search_articles": {
      const articles = await fetchArticles(origin);
      let results = (articles as Array<Record<string, unknown>>).filter(
        (a) => a.type === "page"
      );

      if (args.locale) {
        results = results.filter((a) => a.lang === args.locale);
      }
      if (args.topic) {
        const topic = String(args.topic);
        results = results.filter(
          (a) =>
            matchesQuery(String(a.title ?? ""), topic) ||
            matchesQuery(String(a.description ?? ""), topic) ||
            matchesQuery(String(a.slug ?? ""), topic)
        );
      }
      if (args.query) {
        const q = String(args.query);
        results = results.filter(
          (a) =>
            matchesQuery(String(a.title ?? ""), q) ||
            matchesQuery(String(a.description ?? ""), q)
        );
      }

      const limit = Math.min(Number(args.limit ?? 20), 50);
      results = results.slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ total: results.length, articles: results }, null, 2),
          },
        ],
      };
    }

    case "get_article": {
      const slug = String(args.slug ?? "");
      const articles = await fetchArticles(origin);
      const article = (articles as Array<Record<string, unknown>>).find(
        (a) => a.slug === slug || a.slug === slug.replace(/^\//, "")
      );

      if (!article) {
        return {
          content: [{ type: "text", text: `Article not found: ${slug}` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(article, null, 2) }] };
    }

    case "iddsi_classify": {
      const desc = String(args.food_description ?? "");
      const result = classifyIddsi(desc);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                iddsi_level: result.level,
                iddsi_label: result.label,
                reasoning: result.reasoning,
                disclaimer:
                  "Heuristic classification only. Verify with IDDSI standardised tests (fork drip test, spoon tilt test, etc.) before serving to patients.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC dispatcher ───────────────────────────────────────────────────────

async function dispatch(
  req: JsonRpcRequest,
  origin: string
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;

  // Notifications (no id) need no response
  if (req.id === undefined && req.method.startsWith("notifications/")) {
    return null;
  }

  switch (req.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: MCP_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          "softmeal.org provides IDDSI-compliant care food recipes and dysphagia knowledge for HK, Mainland China, and Japan. Use search_recipes to find recipes by texture level or ingredient. Use iddsi_classify to assess a food's IDDSI level from a description.",
      });

    case "tools/list":
      return ok(id, { tools: TOOLS });

    case "tools/call": {
      const p = req.params as { name: string; arguments?: Record<string, unknown> };
      try {
        const result = await callTool(p.name, p.arguments ?? {}, origin);
        return ok(id, result);
      } catch (e: unknown) {
        return err(id, -32603, e instanceof Error ? e.message : "Internal error");
      }
    }

    case "ping":
      return ok(id, {});

    default:
      return err(id, -32601, `Method not found: ${req.method}`);
  }
}

// ─── CORS headers ─────────────────────────────────────────────────────────────

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

// ─── Cloudflare Pages Function handlers ───────────────────────────────────────

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const accept = request.headers.get("accept") ?? "";

  // SSE transport: send endpoint event then close
  if (accept.includes("text/event-stream")) {
    const endpoint = new URL(request.url).href;
    const body = `event: endpoint\ndata: ${endpoint}\n\n`;
    return new Response(body, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Plain GET: return server info + tool list
  return new Response(
    JSON.stringify(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        protocol: "MCP",
        protocolVersion: MCP_VERSION,
        endpoint: new URL(request.url).href,
        transport: "Streamable HTTP (POST) + SSE (GET)",
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      },
      null,
      2
    ),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
};

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  const origin = new URL(request.url).origin;

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = (await request.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return new Response(JSON.stringify(err(null, -32700, "Parse error")), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((r) => dispatch(r, origin)));
    const filtered = responses.filter(Boolean);
    return new Response(JSON.stringify(filtered), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const response = await dispatch(body, origin);
  if (response === null) {
    return new Response(null, { status: 202, headers: CORS });
  }

  return new Response(JSON.stringify(response), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
};
