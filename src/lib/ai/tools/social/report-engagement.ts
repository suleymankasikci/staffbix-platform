import type { Tool } from "../types";

/**
 * report_engagement — pull post-level engagement metrics for a
 * previously-published social post. The model uses this to:
 *
 *   - Decide whether to reply / amplify a strong post
 *   - Identify dead posts so the operator can rework them
 *   - Compose weekly performance summaries
 *
 * Real providers (Sprint 27+):
 *   - Meta Graph API (Instagram + Facebook page insights)
 *   - X/Twitter API v2 (organic post analytics)
 *   - LinkedIn Marketing API
 *
 * Fixture (SOCIAL_FIXTURE=1) returns deterministic data per
 * (platform, postRef) so the audit can assert on metric shapes.
 */

const PLATFORMS = ["instagram", "twitter", "facebook", "linkedin"] as const;

interface EngagementMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  clickThroughs?: number;
  engagementRate: number; // (likes + comments + shares) / impressions
}

export const reportEngagementTool: Tool = {
  name: "report_engagement",
  description:
    "Pull engagement metrics for a previously-published social post. Returns impressions, likes, comments, shares, and engagement rate. Use to compose performance summaries or to decide whether a post is worth amplifying.",
  parameters: {
    type: "object",
    properties: {
      platform: {
        type: "string",
        enum: PLATFORMS,
        description: "Which platform the post was published to.",
      },
      postRef: {
        type: "string",
        description:
          "Platform-native post id (Instagram media id, X tweet id, etc.) OR an internal reference if the worker tracked it during publish.",
      },
    },
    required: ["platform", "postRef"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const platform = String(args.platform);
    const postRef = String(args.postRef).trim();

    if (!(PLATFORMS as readonly string[]).includes(platform)) {
      return { ok: false, refused: true, reason: `platform must be one of: ${PLATFORMS.join(", ")}` };
    }
    if (!postRef) {
      return { ok: false, refused: true, reason: "postRef is required." };
    }

    const provider = await pickProvider();
    if (!provider) {
      return {
        ok: true,
        data: {
          found: false,
          platform,
          postRef,
          reason:
            "No social-analytics integration is wired. Tell the operator we'll surface metrics once they connect Meta/X/LinkedIn under Settings → Integrations.",
        },
      };
    }

    try {
      const metrics = await provider.fetch(platform, postRef);
      if (!metrics) {
        return {
          ok: true,
          data: {
            found: false,
            platform,
            postRef,
            reason: `No metrics found for ${platform}:${postRef}. Post may be too new (Meta lags 24-48h) or the id might be wrong.`,
          },
        };
      }
      return { ok: true, data: { found: true, platform, postRef, metrics } };
    } catch (err) {
      return {
        ok: true,
        data: {
          found: false,
          platform,
          postRef,
          reason: `Analytics provider errored: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    } finally {
      void ctx;
    }
  },
};

/* ── provider plumbing ──────────────────────────────────────── */

interface AnalyticsProvider {
  kind: string;
  fetch: (platform: string, postRef: string) => Promise<EngagementMetrics | null>;
}

async function pickProvider(): Promise<AnalyticsProvider | null> {
  if (process.env.SOCIAL_FIXTURE === "1") return FIXTURE_PROVIDER;
  return null;
}

const FIXTURE_PROVIDER: AnalyticsProvider = {
  kind: "fixture",
  async fetch(platform, postRef) {
    // Deterministic synthesis from postRef hash → metrics in plausible
    // ranges. Lets the audit assert on shape + monotonic
    // engagementRate calculation without depending on external state.
    const hash = simpleHash(`${platform}:${postRef}`);
    if (postRef === "missing") return null;
    const impressions = 1000 + (hash % 9000);
    const reach = Math.round(impressions * 0.7);
    const likes = Math.round(impressions * 0.04 + (hash % 50));
    const comments = Math.round(impressions * 0.003 + (hash % 10));
    const shares = Math.round(impressions * 0.005 + (hash % 8));
    const saves = platform === "instagram" ? Math.round(impressions * 0.008) : undefined;
    const clickThroughs =
      platform === "linkedin" || platform === "twitter"
        ? Math.round(impressions * 0.012)
        : undefined;
    const engagementRate = (likes + comments + shares) / impressions;
    return {
      impressions,
      reach,
      likes,
      comments,
      shares,
      saves,
      clickThroughs,
      engagementRate: Number(engagementRate.toFixed(4)),
    };
  },
};

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
