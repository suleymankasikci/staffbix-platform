import type { Tool } from "../types";

/**
 * research_keywords — given a seed term, return related keyword ideas
 * with estimated monthly search volume + difficulty + intent. Used by
 * SEO Specialist + Content Writer to pick what to target.
 *
 * Real providers (Sprint 26+):
 *   - DataForSEO (cheapest, has Google + Bing volumes)
 *   - Ahrefs Webmaster Tools (free for verified sites)
 *   - Google Keyword Planner (requires Ads account)
 *
 * Fixture mode (KEYWORD_FIXTURE=1) returns a deterministic curated
 * list per seed so the audit can assert content without live API calls.
 */

interface KeywordIdea {
  keyword: string;
  monthlySearchVolume: number;
  difficulty: number; // 0-100
  intent: "informational" | "navigational" | "commercial" | "transactional";
  cpcUSD?: number;
}

export const researchKeywordsTool: Tool = {
  name: "research_keywords",
  description:
    "Find related keywords for a seed term with search volume, difficulty (0-100, lower is easier), and search intent. Use this BEFORE proposing a target keyword for a blog post or audit. Returns up to 10 ideas.",
  parameters: {
    type: "object",
    properties: {
      seed: {
        type: "string",
        description:
          "Starting keyword or phrase ('leather wallets', 'AI customer service').",
      },
      locale: {
        type: "string",
        description: "Locale for search volume — 'en-US', 'en-GB', 'tr-TR', etc. Defaults to en-US.",
      },
      maxResults: {
        type: "integer",
        description: "Cap on returned ideas (1-20). Default 10.",
        minimum: 1,
        maximum: 20,
      },
    },
    required: ["seed"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const seed = String(args.seed).trim();
    const locale = args.locale ? String(args.locale) : "en-US";
    const maxResults = Math.max(1, Math.min(20, Number(args.maxResults ?? 10)));

    if (seed.length < 2) {
      return { ok: false, refused: true, reason: "seed too short — give a real phrase." };
    }

    const provider = await pickKeywordProvider();
    if (!provider) {
      return {
        ok: true,
        data: {
          provider: "none",
          seed,
          locale,
          ideas: [],
          reason:
            "No keyword-research integration is wired for this tenant. Suggest the focus keyword from your own judgment or escalate.",
        },
      };
    }

    try {
      const ideas = await provider.research(seed, locale, maxResults);
      return {
        ok: true,
        data: {
          provider: provider.kind,
          seed,
          locale,
          ideas,
          count: ideas.length,
        },
      };
    } catch (err) {
      return {
        ok: true,
        data: {
          provider: provider.kind,
          seed,
          locale,
          ideas: [],
          reason: `Keyword provider errored: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    } finally {
      void ctx;
    }
  },
};

/* ── provider plumbing ──────────────────────────────────────── */

interface KeywordProvider {
  kind: string;
  research: (seed: string, locale: string, max: number) => Promise<KeywordIdea[]>;
}

async function pickKeywordProvider(): Promise<KeywordProvider | null> {
  if (process.env.KEYWORD_FIXTURE === "1") return FIXTURE_PROVIDER;
  return null;
}

const FIXTURE_CATALOG: Record<string, KeywordIdea[]> = {
  "leather wallet": [
    { keyword: "leather wallet", monthlySearchVolume: 90500, difficulty: 72, intent: "transactional", cpcUSD: 1.4 },
    { keyword: "best leather wallet", monthlySearchVolume: 12100, difficulty: 55, intent: "commercial", cpcUSD: 1.85 },
    { keyword: "leather wallet for men", monthlySearchVolume: 18100, difficulty: 64, intent: "transactional", cpcUSD: 1.6 },
    { keyword: "italian leather wallet", monthlySearchVolume: 5400, difficulty: 41, intent: "commercial", cpcUSD: 2.1 },
    { keyword: "vegan leather wallet", monthlySearchVolume: 2900, difficulty: 32, intent: "commercial", cpcUSD: 1.9 },
    { keyword: "how to care for a leather wallet", monthlySearchVolume: 1300, difficulty: 18, intent: "informational" },
    { keyword: "leather wallet repair", monthlySearchVolume: 880, difficulty: 22, intent: "transactional" },
  ],
  "ai customer service": [
    { keyword: "ai customer service", monthlySearchVolume: 14800, difficulty: 68, intent: "commercial", cpcUSD: 5.4 },
    { keyword: "ai customer service software", monthlySearchVolume: 5400, difficulty: 71, intent: "commercial", cpcUSD: 7.2 },
    { keyword: "best ai customer service tools", monthlySearchVolume: 1900, difficulty: 53, intent: "commercial", cpcUSD: 6.1 },
    { keyword: "ai customer service chatbot", monthlySearchVolume: 4400, difficulty: 65, intent: "commercial", cpcUSD: 4.9 },
    { keyword: "how does ai customer service work", monthlySearchVolume: 720, difficulty: 24, intent: "informational" },
    { keyword: "ai customer service vs human", monthlySearchVolume: 590, difficulty: 28, intent: "informational" },
  ],
};

const FIXTURE_PROVIDER: KeywordProvider = {
  kind: "fixture",
  async research(seed, _locale, max) {
    const key = seed.toLowerCase().trim();
    // Direct hit
    if (FIXTURE_CATALOG[key]) return FIXTURE_CATALOG[key].slice(0, max);
    // Substring fallback
    for (const [k, list] of Object.entries(FIXTURE_CATALOG)) {
      if (key.includes(k) || k.includes(key)) return list.slice(0, max);
    }
    // No match → empty
    return [];
  },
};
