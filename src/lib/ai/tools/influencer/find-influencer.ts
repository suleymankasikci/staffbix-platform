import type { Tool } from "../types";

/**
 * find_influencer — locate creators matching niche + follower band +
 * engagement-rate threshold. Used by the Influencer Outreach role to
 * source candidates BEFORE drafting collaboration pitches (which then
 * reuse the SDR toolset: create_outreach_lead → queue_outreach_email).
 *
 * Real providers (Sprint 40+):
 *   - HypeAuditor / Upfluence (large library, expensive API)
 *   - Modash (creator DB)
 *   - Native IG/TikTok/YT Search (rate-limited, partial data)
 *
 * INFLUENCER_FIXTURE=1 wires a deterministic mini-database so the
 * audit can assert without a paid API.
 */

const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "twitch"] as const;

interface InfluencerProfile {
  handle: string;
  platform: string;
  displayName: string;
  followers: number;
  avgEngagementRate: number; // 0-1, e.g. 0.034 = 3.4%
  niches: string[];
  email: string | null;
  bio: string;
}

export const findInfluencerTool: Tool = {
  name: "find_influencer",
  description:
    "Find creators by niche + follower band + engagement-rate threshold. Returns up to 8 profiles you can pass to create_outreach_lead. Larger followings ≠ better — strong engagement rate at smaller scale is usually a better partner.",
  parameters: {
    type: "object",
    properties: {
      platform: { type: "string", enum: PLATFORMS },
      niche: {
        type: "string",
        description: "Topic / category — 'sustainable fashion', 'home cooking', 'rust programming', 'leather craft'.",
      },
      minFollowers: { type: "integer", description: "Lower bound on follower count.", minimum: 0 },
      maxFollowers: { type: "integer", description: "Upper bound on follower count.", minimum: 0 },
      minEngagementRatePct: {
        type: "number",
        description: "Floor on engagement rate as a PERCENTAGE (e.g. 3 means 3%). 0 = no floor.",
        minimum: 0,
        maximum: 100,
      },
      limit: { type: "integer", description: "Cap on results (1-8).", minimum: 1, maximum: 8 },
    },
    required: ["platform", "niche"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const platform = String(args.platform);
    const niche = String(args.niche).trim().toLowerCase();
    const minFollowers = Math.max(0, Number(args.minFollowers ?? 0));
    const maxFollowers = Math.max(0, Number(args.maxFollowers ?? 50_000_000));
    const minEngagementRate = Math.max(0, Math.min(100, Number(args.minEngagementRatePct ?? 0))) / 100;
    const limit = Math.max(1, Math.min(8, Number(args.limit ?? 6)));

    if (!(PLATFORMS as readonly string[]).includes(platform)) {
      return { ok: false, refused: true, reason: `platform must be one of: ${PLATFORMS.join(", ")}` };
    }
    if (niche.length < 2) {
      return { ok: false, refused: true, reason: "niche is too short." };
    }
    if (maxFollowers < minFollowers) {
      return { ok: false, refused: true, reason: "maxFollowers must be ≥ minFollowers." };
    }

    const provider = await pickProvider();
    if (!provider) {
      return {
        ok: true,
        data: {
          found: false,
          provider: "none",
          niche,
          reason:
            "No creator-search integration is wired. Tell the operator we need HypeAuditor/Modash credentials in Settings → Integrations.",
        },
      };
    }

    try {
      const all = await provider.search(platform, niche);
      const filtered = all.filter(
        (p) =>
          p.followers >= minFollowers &&
          p.followers <= maxFollowers &&
          p.avgEngagementRate >= minEngagementRate,
      );
      return {
        ok: true,
        data: {
          found: filtered.length > 0,
          provider: provider.kind,
          count: filtered.length,
          profiles: filtered.slice(0, limit),
        },
      };
    } catch (err) {
      return {
        ok: true,
        data: {
          found: false,
          provider: provider.kind,
          reason: `Provider errored: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    } finally {
      void ctx;
    }
  },
};

/* ── provider plumbing ──────────────────────────────────────── */

interface InfluencerProvider {
  kind: string;
  search: (platform: string, niche: string) => Promise<InfluencerProfile[]>;
}

async function pickProvider(): Promise<InfluencerProvider | null> {
  if (process.env.INFLUENCER_FIXTURE === "1") return FIXTURE_PROVIDER;
  return null;
}

const FIXTURE_DB: InfluencerProfile[] = [
  {
    handle: "@leatherandlamp",
    platform: "instagram",
    displayName: "Leather & Lamp",
    followers: 48_000,
    avgEngagementRate: 0.047,
    niches: ["leather craft", "leather goods", "handmade"],
    email: "collab@leatherandlamp.example.com",
    bio: "Independent leather worker in Brooklyn. Reviews + how-tos.",
  },
  {
    handle: "@thecarryologist",
    platform: "instagram",
    displayName: "The Carryologist",
    followers: 142_000,
    avgEngagementRate: 0.031,
    niches: ["leather goods", "edc", "wallets"],
    email: "hi@carryologist.example.com",
    bio: "Daily-carry obsessed. Reviews bags, wallets, knives. Honest takes.",
  },
  {
    handle: "@gracetannery",
    platform: "instagram",
    displayName: "Grace Tannery",
    followers: 12_500,
    avgEngagementRate: 0.062,
    niches: ["leather craft", "sustainable fashion"],
    email: null,
    bio: "Vegetable-tanned leather goods. Slow fashion advocate.",
  },
  {
    handle: "@cookwithleo",
    platform: "instagram",
    displayName: "Cook with Leo",
    followers: 220_000,
    avgEngagementRate: 0.028,
    niches: ["home cooking", "italian", "pasta"],
    email: "leo@cookwithleo.example.com",
    bio: "Italian recipes from my grandma. No sponsors that aren't real food.",
  },
  {
    handle: "@homechefkenji",
    platform: "tiktok",
    displayName: "HomeChef Kenji",
    followers: 1_400_000,
    avgEngagementRate: 0.052,
    niches: ["home cooking", "japanese", "quick recipes"],
    email: "kenji@homechef.example.com",
    bio: "30-second recipes. Japanese home cooking. 1.4M followers.",
  },
];

const FIXTURE_PROVIDER: InfluencerProvider = {
  kind: "fixture",
  async search(platform, niche) {
    return FIXTURE_DB.filter(
      (p) =>
        p.platform === platform &&
        p.niches.some((n) => n.includes(niche) || niche.includes(n)),
    );
  },
};
