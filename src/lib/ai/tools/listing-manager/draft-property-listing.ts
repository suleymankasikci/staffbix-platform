import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_property_listing — produce a structured real-estate listing
 * from explicit property attributes. Output JSON:
 *   - title, headline (hook), bodyParagraphs[]
 *   - featureBullets[] (4-8)
 *   - virtualTourCopy
 *   - locationCallouts[] (operator-supplied location anchors)
 *   - priceVisibility: 'on_request' (ALWAYS — never the actual price)
 *   - complianceFlags (Fair Housing / discrimination patterns)
 *
 * Hard rules baked into the prompt:
 *   - NEVER quote the final asking price in body copy — always
 *     "Price on request" / "Contact agent".
 *   - NEVER reference protected characteristics (race, religion,
 *     family status, disability, national origin) — Fair Housing Act
 *     in the US; equivalent rules in EU/UK/TR.
 */

const MODEL = "gpt-4o-mini";

const PROPERTY_TYPES = [
  "apartment",
  "house",
  "condo",
  "townhouse",
  "land",
  "commercial",
  "vacation_rental",
] as const;

const CONDITIONS = [
  "new_build",
  "renovated",
  "move_in_ready",
  "needs_work",
  "shell",
] as const;

const MIN_HIGHLIGHTS_LEN = 20;
const MAX_HIGHLIGHTS_LEN = 2000;

// Protected-characteristic phrases we hard-flag if they appear in
// the output. Fair Housing Act + EU/UK/TR anti-discrimination basics.
const FAIR_HOUSING_BANNED = [
  /\bchristian\b/i,
  /\bmuslim\b/i,
  /\bjewish\b/i,
  /\bno children\b/i,
  /\bchild(?:ren)?\s+not\s+welcome\b/i,
  /\bperfect for (?:a\s+)?couple\b/i,
  /\bideal for a single\b/i,
  /\bmale only\b/i,
  /\bfemale only\b/i,
  /\bwhites?\s+only\b/i,
  /\bno\s+(?:section\s*8|housing\s+vouchers?)\b/i,
];

export const draftPropertyListingTool: Tool = {
  name: "draft_property_listing",
  description:
    "Draft a structured property listing from explicit attributes. Returns title, headline, body, feature bullets, virtual tour copy, location callouts. NEVER quotes the final price in body copy (priceVisibility is always 'on_request'). Hard-flags Fair Housing violations server-side.",
  parameters: {
    type: "object",
    properties: {
      propertyType: { type: "string", enum: PROPERTY_TYPES },
      bedrooms: { type: "integer", minimum: 0, maximum: 20 },
      bathrooms: { type: "number", minimum: 0, maximum: 20 },
      areaSqm: {
        type: "number",
        description: "Floor area in square meters. 1-10,000.",
        minimum: 1,
        maximum: 10_000,
      },
      condition: { type: "string", enum: CONDITIONS },
      location: {
        type: "string",
        description: "Neighborhood / city / region (e.g., 'Cihangir, Beyoğlu, İstanbul').",
      },
      highlightsText: {
        type: "string",
        description:
          "Operator-supplied highlights (recent renovations, views, transit, amenities). 1-5 sentences.",
      },
      locationCallouts: {
        type: "array",
        description:
          "1-5 nearby anchors (schools, transit stops, parks, shopping). Used verbatim.",
        items: { type: "string" },
      },
      languageHint: {
        type: "string",
        description: "2-letter language code for output. Default 'en'.",
      },
    },
    required: [
      "propertyType",
      "bedrooms",
      "bathrooms",
      "areaSqm",
      "condition",
      "location",
      "highlightsText",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const propertyType = String(args.propertyType);
    const bedrooms = Math.max(0, Math.min(20, Math.round(Number(args.bedrooms))));
    const bathrooms = Math.max(0, Math.min(20, Number(args.bathrooms)));
    const areaSqm = Math.max(1, Math.min(10_000, Number(args.areaSqm)));
    const condition = String(args.condition);
    const location = String(args.location).trim();
    const highlightsText = String(args.highlightsText).trim();
    const locationCallouts = Array.isArray(args.locationCallouts)
      ? (args.locationCallouts as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];
    const languageHint = args.languageHint
      ? String(args.languageHint).trim().toLowerCase().slice(0, 2)
      : "en";

    if (!(PROPERTY_TYPES as readonly string[]).includes(propertyType)) {
      return {
        ok: false,
        refused: true,
        reason: `propertyType must be one of: ${PROPERTY_TYPES.join(", ")}`,
      };
    }
    if (!(CONDITIONS as readonly string[]).includes(condition)) {
      return {
        ok: false,
        refused: true,
        reason: `condition must be one of: ${CONDITIONS.join(", ")}`,
      };
    }
    if (location.length < 3) {
      return { ok: false, refused: true, reason: "location too short." };
    }
    if (highlightsText.length < MIN_HIGHLIGHTS_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `highlightsText too short (need ≥${MIN_HIGHLIGHTS_LEN} chars).`,
      };
    }
    if (highlightsText.length > MAX_HIGHLIGHTS_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `highlightsText too long (max ${MAX_HIGHLIGHTS_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `property listing ${propertyType} voice ${location}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      `You are drafting a property listing in language code '${languageHint}'.`,
      "Output STRICT JSON: { title, headline, bodyParagraphs, featureBullets, virtualTourCopy, complianceFlags }.",
      "title: ≤80 chars. Lead with property type + bedrooms + standout feature.",
      "headline: 1-line hook ≤140 chars.",
      "bodyParagraphs: 3-5 paragraphs (≤80 words each).",
      "featureBullets: 4-8 bullets, each ≤80 chars.",
      "virtualTourCopy: 2-3 sentences describing the tour walkthrough order.",
      "complianceFlags: 0-3 strings — surface anything you wrote that could be borderline.",
      "ABSOLUTE RULES:",
      "  - NEVER quote a price or rental rate. Use 'Price on request' or 'Contact agent for pricing'.",
      "  - NEVER reference race, religion, family status, disability, national origin, gender, sexual orientation. Fair Housing Act + EU/UK equivalents.",
      "  - NEVER use phrases like 'perfect for a couple', 'ideal for a single', 'children not welcome'.",
      `propertyType: ${propertyType}`,
      `bedrooms: ${bedrooms}`,
      `bathrooms: ${bathrooms}`,
      `areaSqm: ${areaSqm}`,
      `condition: ${condition}`,
      `location: ${location}`,
      locationCallouts.length > 0
        ? `locationCallouts (use verbatim where helpful): ${locationCallouts.join(" | ")}`
        : "",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: highlightsText },
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

      // Server-side fair-housing + price scan.
      const blob = [
        parsed.title,
        parsed.headline,
        parsed.virtualTourCopy,
        ...(Array.isArray(parsed.bodyParagraphs)
          ? (parsed.bodyParagraphs as string[])
          : []),
        ...(Array.isArray(parsed.featureBullets)
          ? (parsed.featureBullets as string[])
          : []),
      ]
        .filter((s): s is string => typeof s === "string")
        .join(" \n ");

      const complianceFlags = Array.isArray(parsed.complianceFlags)
        ? (parsed.complianceFlags as string[])
        : [];
      for (const re of FAIR_HOUSING_BANNED) {
        const m = blob.match(re);
        if (m) {
          complianceFlags.push(
            `Fair Housing risk: phrase '${m[0]}' detected in output.`,
          );
        }
      }
      // Price detection: any $X / €X / ₺X / £X numeric pattern in output.
      const priceMatch = blob.match(/[\$€₺£]\s?\d/);
      if (priceMatch) {
        complianceFlags.push(
          `Price-like value detected in output (${priceMatch[0]}). Operator should rewrite as 'Price on request'.`,
        );
      }

      await logSecurityEvent({
        kind: "listing.property.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "listing.property.drafted",
          propertyType,
          bedrooms,
          areaSqm,
          languageHint,
          complianceFlagsCount: complianceFlags.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          propertyType,
          bedrooms,
          bathrooms,
          areaSqm,
          condition,
          location,
          languageHint,
          title: typeof parsed.title === "string" ? parsed.title : "",
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          bodyParagraphs: Array.isArray(parsed.bodyParagraphs)
            ? (parsed.bodyParagraphs as string[])
            : [],
          featureBullets: Array.isArray(parsed.featureBullets)
            ? (parsed.featureBullets as string[])
            : [],
          virtualTourCopy:
            typeof parsed.virtualTourCopy === "string"
              ? parsed.virtualTourCopy
              : "",
          locationCallouts,
          priceVisibility: "on_request",
          complianceFlags,
          notForPublish:
            "Draft only. Operator reviews complianceFlags + adds pricing in the operator-facing layer.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Property listing failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
