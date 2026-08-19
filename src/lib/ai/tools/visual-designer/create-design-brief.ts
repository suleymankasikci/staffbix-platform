import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * create_design_brief — produce a structured creative brief for a
 * design asset. The output is consumed by an in-house designer or by
 * an image-generation pipeline (Sprint 55+ separate tool).
 *
 * Structured fields:
 *   - concept: 1-2 sentence creative idea
 *   - keyMessage: ≤12-word headline equivalent
 *   - layout: composition guidance (rule-of-thirds, hierarchy)
 *   - palette: 3-5 hex colors pulled from Brand Bible / operator
 *   - typography: { primary, secondary } font directives
 *   - copyHierarchy: { headline, subhead, cta }
 *   - accessibility: WCAG-relevant notes (contrast, alt-text style)
 *   - dosAndDonts: list of rules
 *   - assetSpec: dimensions, file format, max size
 *   - referenceImageQueries: 1-3 search queries the operator can use
 *     to find moodboard references (NOT real images — the brief never
 *     ships actual files).
 */

const MODEL = "gpt-4o-mini";

const ASSET_TYPES = [
  "instagram_post",
  "instagram_story",
  "instagram_carousel",
  "facebook_feed",
  "email_header",
  "web_banner",
  "ad_creative",
  "product_photo_retouch",
] as const;

const MIN_PROMPT_LEN = 30;
const MAX_PROMPT_LEN = 3000;

export const createDesignBriefTool: Tool = {
  name: "create_design_brief",
  description:
    "Generate a structured creative brief for a single design asset (Instagram post, story, carousel, FB feed, email header, web banner, ad creative, product photo retouch). Returns concept + palette + typography + copy hierarchy + accessibility notes + asset spec. Does NOT generate images — produces specifications only.",
  parameters: {
    type: "object",
    properties: {
      assetType: { type: "string", enum: ASSET_TYPES },
      campaign: {
        type: "string",
        description:
          "What the asset is for. 1-3 sentences with subject, audience, and the call to action.",
      },
      paletteHexes: {
        type: "array",
        description:
          "Brand-palette hex codes (e.g., '#0A0A0A'). 0-8 entries. Empty = the tool falls back to Brand Bible / safe defaults.",
        items: { type: "string" },
      },
      primaryFont: { type: "string", description: "Headline font family." },
      secondaryFont: { type: "string", description: "Body font family." },
      moodKeywords: {
        type: "array",
        description: "3-7 mood / vibe descriptors (e.g., 'gritty', 'sunlit', 'minimal').",
        items: { type: "string" },
      },
    },
    required: ["assetType", "campaign"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const assetType = String(args.assetType);
    const campaign = String(args.campaign).trim();
    const rawPaletteHexes = Array.isArray(args.paletteHexes)
      ? (args.paletteHexes as string[])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
      : [];
    const paletteHexes = rawPaletteHexes
      .filter((s) => /^#?[0-9a-fA-F]{3,8}$/.test(s))
      .slice(0, 8)
      .map((s) => (s.startsWith("#") ? s.toUpperCase() : `#${s.toUpperCase()}`));
    const primaryFont = args.primaryFont ? String(args.primaryFont).trim() : "";
    const secondaryFont = args.secondaryFont
      ? String(args.secondaryFont).trim()
      : "";
    const moodKeywords = Array.isArray(args.moodKeywords)
      ? (args.moodKeywords as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 7)
      : [];

    if (!(ASSET_TYPES as readonly string[]).includes(assetType)) {
      return {
        ok: false,
        refused: true,
        reason: `assetType must be one of: ${ASSET_TYPES.join(", ")}`,
      };
    }
    if (campaign.length < MIN_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `campaign too short (need ≥${MIN_PROMPT_LEN} chars).`,
      };
    }
    if (campaign.length > MAX_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `campaign too long (max ${MAX_PROMPT_LEN} chars).`,
      };
    }
    // If operator passed any hexes that LOOK like hexes but failed our
    // strict regex, we should signal the rejection rather than silently
    // drop them.
    if (rawPaletteHexes.length > 0 && paletteHexes.length === 0) {
      return {
        ok: false,
        refused: true,
        reason:
          "paletteHexes must be hex codes like '#0A0A0A' (with or without '#').",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${assetType} brand palette typography mood ${moodKeywords.join(" ")}`.slice(
        0,
        400,
      ),
      k: 4,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — fall back to safe defaults: high-contrast palette, geometric sans for headlines, humanist sans for body)";

    const assetSpecHint = (() => {
      switch (assetType) {
        case "instagram_post":
          return "1080 × 1080, JPG/PNG, max 4 MB.";
        case "instagram_story":
          return "1080 × 1920, JPG/PNG, max 4 MB, keep critical content in central 1080 × 1440 safe area.";
        case "instagram_carousel":
          return "1080 × 1350 per card, JPG/PNG, 2-10 cards.";
        case "facebook_feed":
          return "1200 × 630 (1.91:1), JPG/PNG, max 5 MB.";
        case "email_header":
          return "600 × 250 (typical), PNG (transparent OK), <100 KB.";
        case "web_banner":
          return "1920 × 480 hero or 728 × 90 leaderboard depending on placement.";
        case "ad_creative":
          return "Multi-platform set: 1:1, 4:5, 9:16, 1.91:1. Provide variants.";
        case "product_photo_retouch":
          return "Match source file dimensions; output PNG 16-bit when retouching skin / cloth.";
        default:
          return "Spec to confirm with operator.";
      }
    })();

    const systemPrompt = [
      "You are producing a creative brief for the operator's designer.",
      "Output STRICT JSON: { concept, keyMessage, layout, palette, typography, copyHierarchy, accessibility, dosAndDonts, assetSpec, referenceImageQueries }.",
      "concept: 1-2 sentences describing the creative idea.",
      "keyMessage: ≤12 words.",
      "layout: 1-3 sentences on composition (focal point, hierarchy, negative space).",
      "palette: 3-5 hex codes, each '#RRGGBB'. Prefer the operator-supplied palette and Brand Bible cues; fill with high-contrast neutrals as needed.",
      "typography: { primary, secondary }. Honour operator-supplied fonts; otherwise pick from Brand Bible.",
      "copyHierarchy: { headline, subhead, cta }. headline ≤8 words, subhead ≤15 words, cta ≤4 words.",
      "accessibility: array of 2-4 notes (contrast ratio ≥ 4.5:1, alt-text suggestion, font-size minimums).",
      "dosAndDonts: { dos: string[], donts: string[] }. 2-4 entries each. Pull constraints from Brand Bible when present.",
      `assetSpec: 1 line of dimension/format guidance. Use this as a baseline: ${assetSpecHint}`,
      "referenceImageQueries: 1-3 search queries the operator can use to source moodboard refs (Unsplash / Pexels / internal library).",
      "ABSOLUTE RULES:",
      "  - NEVER specify AI-generated faces / people unless the Brand Bible explicitly allows it.",
      "  - NEVER invent metrics about audience, brand performance, or product.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userParts = [
      `assetType: ${assetType}`,
      paletteHexes.length > 0 ? `paletteHexes: ${paletteHexes.join(", ")}` : "",
      primaryFont ? `primaryFont: ${primaryFont}` : "",
      secondaryFont ? `secondaryFont: ${secondaryFont}` : "",
      moodKeywords.length > 0 ? `moodKeywords: ${moodKeywords.join(", ")}` : "",
      "",
      "Campaign:",
      campaign,
    ].filter(Boolean);

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts.join("\n") },
        ],
        max_tokens: 1100,
        temperature: 0.35,
        response_format: { type: "json_object" },
      });

      await recordAiUsage({
        tenantId: ctx.tenantId,
        workerId: ctx.workerId,
        conversationId: ctx.conversationId,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - t0,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      await logSecurityEvent({
        kind: "design.brief.created",
        tenantId: ctx.tenantId,
        payload: {
          subject: "design.brief.created",
          assetType,
          paletteCount: paletteHexes.length,
          moodCount: moodKeywords.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          assetType,
          concept: typeof parsed.concept === "string" ? parsed.concept : "",
          keyMessage: typeof parsed.keyMessage === "string" ? parsed.keyMessage : "",
          layout: typeof parsed.layout === "string" ? parsed.layout : "",
          palette: Array.isArray(parsed.palette) ? (parsed.palette as string[]) : paletteHexes,
          typography:
            typeof parsed.typography === "object" && parsed.typography !== null
              ? (parsed.typography as Record<string, unknown>)
              : { primary: primaryFont, secondary: secondaryFont },
          copyHierarchy:
            typeof parsed.copyHierarchy === "object" && parsed.copyHierarchy !== null
              ? (parsed.copyHierarchy as Record<string, unknown>)
              : {},
          accessibility: Array.isArray(parsed.accessibility)
            ? (parsed.accessibility as string[])
            : [],
          dosAndDonts:
            typeof parsed.dosAndDonts === "object" && parsed.dosAndDonts !== null
              ? (parsed.dosAndDonts as Record<string, unknown>)
              : { dos: [], donts: [] },
          assetSpec:
            typeof parsed.assetSpec === "string" ? parsed.assetSpec : assetSpecHint,
          referenceImageQueries: Array.isArray(parsed.referenceImageQueries)
            ? (parsed.referenceImageQueries as string[]).slice(0, 3)
            : [],
          notForDistribution:
            "Brief only. No images produced. Operator approval required before the designer ships.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Design brief failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
