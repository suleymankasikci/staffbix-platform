import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * optimize_listing — rewrite a marketplace listing's title + bullets
 * + description for clarity, keyword coverage, and policy compliance.
 * Output JSON:
 *   - title (≤80 chars Amazon-safe, ≤120 chars eBay/Etsy)
 *   - bullets[] (3-5 entries, each ≤200 chars)
 *   - description (markdown, ≤2000 chars)
 *   - includedKeywords[] (which of the operator's target keywords made it)
 *   - missedKeywords[] (target keywords not included)
 *   - complianceFlags[] (banned-word warnings, claim issues)
 */

const MODEL = "gpt-4o-mini";

const MARKETPLACES = ["amazon", "ebay", "etsy", "walmart", "mercado_libre"] as const;

const TITLE_LIMIT: Record<(typeof MARKETPLACES)[number], number> = {
  amazon: 200,
  ebay: 80,
  etsy: 140,
  walmart: 200,
  mercado_libre: 60,
};

const BANNED_PHRASES = [
  "100% guaranteed",
  "miracle cure",
  "lose 10 pounds",
  "cures cancer",
  "fda approved", // unless actually FDA approved
];

const MIN_INPUT_LEN = 20;
const MAX_INPUT_LEN = 4000;

export const optimizeListingTool: Tool = {
  name: "optimize_listing",
  description:
    "Rewrite a marketplace listing's title + bullets + description for the target marketplace. Returns optimized strings, keyword coverage, and policy compliance flags. NEVER invents performance claims (kg lost, % improvement) and flags any banned-word patterns.",
  parameters: {
    type: "object",
    properties: {
      marketplace: { type: "string", enum: MARKETPLACES },
      currentTitle: { type: "string", description: "Current listing title." },
      currentBullets: {
        type: "array",
        description: "Current bullet points (1-10 strings).",
        items: { type: "string" },
      },
      currentDescription: {
        type: "string",
        description: "Current description.",
      },
      targetKeywords: {
        type: "array",
        description: "1-10 keywords/phrases to prioritise.",
        items: { type: "string" },
      },
    },
    required: ["marketplace", "currentTitle", "currentBullets", "currentDescription", "targetKeywords"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const marketplace = String(args.marketplace);
    const currentTitle = String(args.currentTitle).trim();
    const currentBullets = Array.isArray(args.currentBullets)
      ? (args.currentBullets as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];
    const currentDescription = String(args.currentDescription).trim();
    const targetKeywords = Array.isArray(args.targetKeywords)
      ? (args.targetKeywords as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];

    if (!(MARKETPLACES as readonly string[]).includes(marketplace)) {
      return {
        ok: false,
        refused: true,
        reason: `marketplace must be one of: ${MARKETPLACES.join(", ")}`,
      };
    }
    if (currentTitle.length < 3) {
      return { ok: false, refused: true, reason: "currentTitle too short." };
    }
    if (currentBullets.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "currentBullets required (at least one).",
      };
    }
    if (
      currentDescription.length < MIN_INPUT_LEN ||
      currentDescription.length > MAX_INPUT_LEN
    ) {
      return {
        ok: false,
        refused: true,
        reason: `currentDescription must be ${MIN_INPUT_LEN}-${MAX_INPUT_LEN} chars.`,
      };
    }
    if (targetKeywords.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "targetKeywords required (at least one).",
      };
    }

    const titleLimit = TITLE_LIMIT[marketplace as (typeof MARKETPLACES)[number]];

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${marketplace} listing voice claims compliance ${targetKeywords.join(" ")}`.slice(
        0,
        300,
      ),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — apply marketplace-standard voice)";

    const systemPrompt = [
      `You are optimising a ${marketplace} listing.`,
      "Output STRICT JSON: { title, bullets, description, includedKeywords, missedKeywords, complianceFlags }.",
      `title: ≤${titleLimit} chars. Front-load primary keyword. NO ALL CAPS spam.`,
      "bullets: 3-5 strings, each ≤200 chars. Benefit-led, not feature-list.",
      "description: markdown, ≤2000 chars. Clear sections (Overview / Features / Usage).",
      "includedKeywords: subset of targetKeywords actually present in your output.",
      "missedKeywords: subset of targetKeywords you couldn't fit naturally.",
      "complianceFlags: 0-5 strings — banned-word / unsubstantiated-claim warnings.",
      "ABSOLUTE RULES:",
      "  - NEVER invent performance metrics (lbs lost, % improvement, customer counts).",
      "  - NEVER use absolute medical / cure claims.",
      "  - NEVER claim certifications (FDA, USDA, ISO) unless they appear in the source text.",
      `Banned phrases to flag if encountered: ${BANNED_PHRASES.join(" | ")}`,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `marketplace: ${marketplace}`,
      `targetKeywords: ${targetKeywords.join(", ")}`,
      "",
      `currentTitle: ${currentTitle}`,
      `currentBullets:`,
      ...currentBullets.map((b) => `  - ${b}`),
      "",
      "currentDescription:",
      currentDescription,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1400,
        temperature: 0.3,
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

      const title = typeof parsed.title === "string" ? parsed.title : "";
      const bullets = Array.isArray(parsed.bullets)
        ? (parsed.bullets as string[])
        : [];
      const description =
        typeof parsed.description === "string" ? parsed.description : "";

      // Post-check banned phrases in the OUTPUT and surface them.
      const complianceFlags = Array.isArray(parsed.complianceFlags)
        ? (parsed.complianceFlags as string[])
        : [];
      const checkBlob = [title, ...bullets, description].join(" \n ").toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        if (checkBlob.includes(phrase.toLowerCase())) {
          complianceFlags.push(`Output contains banned phrase: '${phrase}'`);
        }
      }

      await logSecurityEvent({
        kind: "marketplace.listing.optimized",
        tenantId: ctx.tenantId,
        payload: {
          subject: "marketplace.listing.optimized",
          marketplace,
          titleLen: title.length,
          bulletCount: bullets.length,
          keywordsRequested: targetKeywords.length,
          complianceFlagsCount: complianceFlags.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          marketplace,
          titleLimit,
          title,
          titleLength: title.length,
          titleWithinLimit: title.length <= titleLimit,
          bullets,
          description,
          includedKeywords: Array.isArray(parsed.includedKeywords)
            ? (parsed.includedKeywords as string[])
            : [],
          missedKeywords: Array.isArray(parsed.missedKeywords)
            ? (parsed.missedKeywords as string[])
            : [],
          complianceFlags,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Listing optimisation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
