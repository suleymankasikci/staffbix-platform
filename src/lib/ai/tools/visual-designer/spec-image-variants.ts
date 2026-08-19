import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * spec_image_variants — for a single creative concept, output the
 * required size + aspect variants across operator-selected channels.
 * No AI calls — this is deterministic spec generation (channel → known
 * dimensions). The model can call this to plan a multi-channel ship.
 *
 * The Visual Designer team uses this as the cut-list before producing
 * any assets; it pairs with create_design_brief (LLM-driven concept)
 * to give the downstream designer everything they need.
 */

const CHANNELS = [
  "instagram_post",
  "instagram_story",
  "instagram_reels_cover",
  "facebook_feed",
  "facebook_story",
  "twitter_post",
  "linkedin_post",
  "linkedin_banner",
  "email_header",
  "web_banner_hero",
  "web_banner_leaderboard",
  "google_ad_square",
  "google_ad_skyscraper",
] as const;

const CROP_FOCUS_OPTIONS = [
  "subject_center",
  "rule_of_thirds_top_left",
  "rule_of_thirds_top_right",
  "rule_of_thirds_bottom_left",
  "rule_of_thirds_bottom_right",
  "subject_face_safe_zone",
] as const;

type VariantSpec = {
  channel: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileFormat: "JPG" | "PNG" | "WEBP";
  maxKB: number;
  safeAreaNote: string;
};

const VARIANT_TABLE: Record<(typeof CHANNELS)[number], VariantSpec> = {
  instagram_post: {
    channel: "instagram_post",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    fileFormat: "JPG",
    maxKB: 4096,
    safeAreaNote: "Avoid text in outer 8% (mobile UI overlaps in feed preview).",
  },
  instagram_story: {
    channel: "instagram_story",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    fileFormat: "JPG",
    maxKB: 4096,
    safeAreaNote:
      "Keep critical content in central 1080 × 1440. Top 250px + bottom 350px are UI-occluded.",
  },
  instagram_reels_cover: {
    channel: "instagram_reels_cover",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    fileFormat: "JPG",
    maxKB: 4096,
    safeAreaNote:
      "Cover appears on profile grid as 1080 × 1350 center-crop. Keep brand cue centered.",
  },
  facebook_feed: {
    channel: "facebook_feed",
    width: 1200,
    height: 630,
    aspectRatio: "1.91:1",
    fileFormat: "JPG",
    maxKB: 5120,
    safeAreaNote: "Text overlay should stay under 20% of image area.",
  },
  facebook_story: {
    channel: "facebook_story",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    fileFormat: "JPG",
    maxKB: 4096,
    safeAreaNote: "Same safe zones as Instagram story.",
  },
  twitter_post: {
    channel: "twitter_post",
    width: 1200,
    height: 675,
    aspectRatio: "16:9",
    fileFormat: "JPG",
    maxKB: 5120,
    safeAreaNote: "X / Twitter crops to 1.91:1 in feed preview — check both.",
  },
  linkedin_post: {
    channel: "linkedin_post",
    width: 1200,
    height: 1200,
    aspectRatio: "1:1",
    fileFormat: "JPG",
    maxKB: 5120,
    safeAreaNote: "1:1 surfaces more above the fold than 16:9.",
  },
  linkedin_banner: {
    channel: "linkedin_banner",
    width: 1584,
    height: 396,
    aspectRatio: "4:1",
    fileFormat: "JPG",
    maxKB: 4096,
    safeAreaNote: "Profile photo overlaps lower-left corner (~280px circle).",
  },
  email_header: {
    channel: "email_header",
    width: 600,
    height: 250,
    aspectRatio: "2.4:1",
    fileFormat: "PNG",
    maxKB: 200,
    safeAreaNote: "Keep file size tight — Gmail clips images > ~100KB in preview.",
  },
  web_banner_hero: {
    channel: "web_banner_hero",
    width: 1920,
    height: 600,
    aspectRatio: "3.2:1",
    fileFormat: "WEBP",
    maxKB: 300,
    safeAreaNote:
      "Mobile crops to 750 × 600 (centered). Keep focal point centered.",
  },
  web_banner_leaderboard: {
    channel: "web_banner_leaderboard",
    width: 728,
    height: 90,
    aspectRatio: "8.1:1",
    fileFormat: "JPG",
    maxKB: 150,
    safeAreaNote: "Very wide aspect — left-anchor logo, right-anchor CTA.",
  },
  google_ad_square: {
    channel: "google_ad_square",
    width: 300,
    height: 250,
    aspectRatio: "6:5",
    fileFormat: "JPG",
    maxKB: 150,
    safeAreaNote: "Display network — keep text concise, no small body copy.",
  },
  google_ad_skyscraper: {
    channel: "google_ad_skyscraper",
    width: 160,
    height: 600,
    aspectRatio: "4:15",
    fileFormat: "JPG",
    maxKB: 150,
    safeAreaNote: "Skyscraper format — stack logo / hero / CTA vertically.",
  },
};

export const specImageVariantsTool: Tool = {
  name: "spec_image_variants",
  description:
    "Output the cut-list of size / aspect / format variants required to ship one creative concept across the operator's selected channels. Deterministic — no AI call. Pair with create_design_brief for the concept itself.",
  parameters: {
    type: "object",
    properties: {
      channels: {
        type: "array",
        description: "1-12 channel slugs from the supported list.",
        items: { type: "string", enum: CHANNELS },
      },
      cropFocus: {
        type: "string",
        enum: CROP_FOCUS_OPTIONS,
        description: "Where the subject should sit when cropping across aspect ratios.",
      },
      includeRetinaVariants: {
        type: "boolean",
        description: "If true, add @2x variants (doubled width/height) where useful.",
      },
    },
    required: ["channels"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const channelsRaw = Array.isArray(args.channels) ? (args.channels as string[]) : [];
    const channels = channelsRaw
      .filter((c): c is (typeof CHANNELS)[number] =>
        (CHANNELS as readonly string[]).includes(c),
      )
      .slice(0, 12);
    const cropFocus =
      typeof args.cropFocus === "string" &&
      (CROP_FOCUS_OPTIONS as readonly string[]).includes(args.cropFocus)
        ? (args.cropFocus as (typeof CROP_FOCUS_OPTIONS)[number])
        : "subject_center";
    const includeRetina = Boolean(args.includeRetinaVariants);

    if (channelsRaw.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "channels required (at least one supported channel).",
      };
    }
    if (channels.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: `channels must be from: ${CHANNELS.join(", ")}`,
      };
    }

    const variants: Array<
      VariantSpec & { isRetina?: boolean; cropFocus: string }
    > = [];
    for (const c of channels) {
      const base = VARIANT_TABLE[c];
      variants.push({ ...base, cropFocus });
      if (includeRetina && base.maxKB >= 200) {
        variants.push({
          ...base,
          channel: `${base.channel}@2x`,
          width: base.width * 2,
          height: base.height * 2,
          maxKB: base.maxKB * 2,
          isRetina: true,
          cropFocus,
        });
      }
    }

    await logSecurityEvent({
      kind: "design.variants.specced",
      tenantId: ctx.tenantId,
      payload: {
        subject: "design.variants.specced",
        channelCount: channels.length,
        variantCount: variants.length,
        cropFocus,
        includeRetina,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        channelsRequested: channels,
        variantCount: variants.length,
        variants,
        cropFocus,
        includeRetina,
      },
    };
  },
};
