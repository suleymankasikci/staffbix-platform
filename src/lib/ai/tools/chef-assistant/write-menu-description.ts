import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * write_menu_description — produce a menu description for a single
 * dish. Output JSON:
 *   - name, description (≤280 chars)
 *   - ingredients: echoed verbatim from input
 *   - allergenTags: derived ONLY from operator-supplied allergen rules
 *     (EU 14 / US Big-9) — server-side regex scan over ingredients
 *   - veg/vegan/glutenFree flags (best-effort, conservative)
 *   - priceVisibility: 'on_request' (always — never quotes prices)
 *   - openQuestions: 0-3 strings for the chef
 *
 * Hard rules:
 *   - NEVER invents ingredients beyond input.
 *   - NEVER makes health claims ('boosts immunity', 'cures').
 *   - NEVER quotes prices.
 */

const MODEL = "gpt-4o-mini";

const CUISINES = [
  "mediterranean",
  "italian",
  "japanese",
  "mexican",
  "turkish",
  "plant_based",
  "french",
  "other",
] as const;

const ALLERGEN_REGIMES = ["eu14", "us_big9"] as const;

const EU14: Record<string, RegExp[]> = {
  gluten: [
    /\bwheat\b/i,
    /\brye\b/i,
    /\bbarley\b/i,
    /\boats\b/i,
    /\bspelt\b/i,
    /\bkamut\b/i,
    /\bbulgur\b/i,
    /\bcouscous\b/i,
    /\bsemolina\b/i,
    /\bflour\b/i,
    /\bbread\b/i,
    /\bpasta\b/i,
    /\bnoodle\b/i,
    /\bsoy sauce\b/i,
  ],
  // Patterns use optional `s` to catch plurals (clams, eggs, etc.).
  crustaceans: [
    /\bshrimps?\b/i, /\bprawns?\b/i, /\blobsters?\b/i,
    /\bcrabs?\b/i, /\bcrayfish\b/i,
  ],
  eggs: [/\beggs?\b/i, /\baioli\b/i, /\bmayonnaise\b/i],
  fish: [
    /\bfish\b/i, /\bsalmon\b/i, /\btuna\b/i, /\bcod\b/i,
    /\bsea bass\b/i, /\banchov/i,
  ],
  peanuts: [/\bpeanuts?\b/i],
  soybeans: [
    /\bsoy\b/i, /\bsoya\b/i, /\bedamame\b/i, /\btofu\b/i,
    /\bmiso\b/i, /\btempeh\b/i,
  ],
  milk: [
    /\bmilk\b/i, /\bbutter\b/i, /\bcheese\b/i, /\bcream\b/i,
    /\byog(?:h?)urt\b/i, /\bghee\b/i,
  ],
  nuts: [
    /\balmonds?\b/i, /\bhazelnuts?\b/i, /\bwalnuts?\b/i,
    /\bcashews?\b/i, /\bpecans?\b/i, /\bbrazil nuts?\b/i,
    /\bpistachios?\b/i, /\bmacadamias?\b/i,
  ],
  celery: [/\bcelery\b/i, /\bceleriac\b/i],
  mustard: [/\bmustard\b/i],
  sesame: [/\bsesame\b/i, /\btahini\b/i],
  sulphites: [/\bsulphites?\b/i, /\bsulfites?\b/i, /\bwine\b/i],
  lupin: [/\blupin\b/i],
  molluscs: [
    /\boysters?\b/i, /\bmussels?\b/i, /\bsquids?\b/i,
    /\boctopus(?:es)?\b/i, /\bclams?\b/i, /\bscallops?\b/i,
  ],
};

const US_BIG9_EXTRA: Record<string, RegExp[]> = {
  sesame: EU14.sesame,
};

const HEALTH_CLAIMS = [
  /\bboosts? immunity\b/i,
  /\bcures?\b/i,
  /\bclinically proven\b/i,
  /\bfda approved\b/i,
  /\btreats?\b/i,
];

const MIN_NAME_LEN = 2;
const MAX_NAME_LEN = 80;
const MIN_INGREDIENTS = 1;
const MAX_INGREDIENTS = 30;

export const writeMenuDescriptionTool: Tool = {
  name: "write_menu_description",
  description:
    "Write a menu description for one dish. Allergen tags are derived server-side from a regulator-aligned list (EU 14 / US Big-9). NEVER invents ingredients, NEVER quotes prices, NEVER makes health claims.",
  parameters: {
    type: "object",
    properties: {
      dishName: { type: "string" },
      cuisine: { type: "string", enum: CUISINES },
      ingredients: {
        type: "array",
        description: "1-30 ingredient strings (verbatim — model never invents extras).",
        items: { type: "string" },
      },
      allergenRegime: {
        type: "string",
        enum: ALLERGEN_REGIMES,
        description: "EU 14 or US Big-9 allergen rules. Default 'eu14'.",
      },
      seasonalContext: {
        type: "string",
        description: "Optional 1-line seasonal note (e.g., 'spring 2026 menu').",
      },
      vegFlagsHint: {
        type: "object",
        description:
          "Operator overrides — { isVegetarian, isVegan, isGlutenFree }. If omitted, the tool computes best-effort from ingredients.",
        properties: {
          isVegetarian: { type: "boolean" },
          isVegan: { type: "boolean" },
          isGlutenFree: { type: "boolean" },
        },
      },
    },
    required: ["dishName", "cuisine", "ingredients"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const dishName = String(args.dishName).trim();
    const cuisine = String(args.cuisine);
    const ingredients = Array.isArray(args.ingredients)
      ? (args.ingredients as string[])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
      : [];
    const allergenRegime =
      ((args.allergenRegime as string | undefined) ?? "eu14").toLowerCase();
    const seasonalContext = args.seasonalContext
      ? String(args.seasonalContext).trim().slice(0, 200)
      : "";
    const vegHintRaw =
      typeof args.vegFlagsHint === "object" && args.vegFlagsHint !== null
        ? (args.vegFlagsHint as Record<string, unknown>)
        : {};

    if (!(CUISINES as readonly string[]).includes(cuisine)) {
      return {
        ok: false,
        refused: true,
        reason: `cuisine must be one of: ${CUISINES.join(", ")}`,
      };
    }
    if (!(ALLERGEN_REGIMES as readonly string[]).includes(allergenRegime)) {
      return {
        ok: false,
        refused: true,
        reason: `allergenRegime must be one of: ${ALLERGEN_REGIMES.join(", ")}`,
      };
    }
    if (dishName.length < MIN_NAME_LEN || dishName.length > MAX_NAME_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `dishName must be ${MIN_NAME_LEN}-${MAX_NAME_LEN} chars.`,
      };
    }
    if (
      ingredients.length < MIN_INGREDIENTS ||
      ingredients.length > MAX_INGREDIENTS
    ) {
      return {
        ok: false,
        refused: true,
        reason: `ingredients must have ${MIN_INGREDIENTS}-${MAX_INGREDIENTS} entries.`,
      };
    }

    // Server-side allergen derivation.
    const regimeTable = allergenRegime === "eu14" ? EU14 : { ...EU14, ...US_BIG9_EXTRA };
    const ingredientBlob = ingredients.join(" | ").toLowerCase();
    const allergenTags: string[] = [];
    for (const [tag, patterns] of Object.entries(regimeTable)) {
      if (patterns.some((re) => re.test(ingredientBlob))) {
        allergenTags.push(tag);
      }
    }

    // Best-effort veg flags (operator hint wins).
    const meatRe = /\b(chicken|beef|pork|lamb|veal|bacon|ham|sausage|prosciutto|duck|turkey|fish|salmon|tuna|cod|anchov|shrimp|prawn|crab|lobster|oyster|mussel|squid|octopus)\b/i;
    const dairyEggRe = /\b(milk|butter|cheese|cream|yog|ghee|egg|aioli|mayonnaise)\b/i;
    const isVegetarian =
      vegHintRaw.isVegetarian !== undefined
        ? Boolean(vegHintRaw.isVegetarian)
        : !meatRe.test(ingredientBlob);
    const isVegan =
      vegHintRaw.isVegan !== undefined
        ? Boolean(vegHintRaw.isVegan)
        : !meatRe.test(ingredientBlob) && !dairyEggRe.test(ingredientBlob);
    const isGlutenFree =
      vegHintRaw.isGlutenFree !== undefined
        ? Boolean(vegHintRaw.isGlutenFree)
        : !allergenTags.includes("gluten");

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `menu voice ${cuisine}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are writing a menu description for one dish.",
      "Output STRICT JSON: { description, openQuestions, warnings }.",
      "description: ≤280 chars. Inviting but factual. Only mention ingredients that the operator supplied.",
      "openQuestions: 0-3 short strings — questions the chef should answer before publishing.",
      "warnings: 0-3 strings — anything borderline (e.g., 'consider clarifying broth ingredients').",
      "ABSOLUTE RULES:",
      "  - NEVER invent ingredients, sourcing claims ('local farm X'), or chef anecdotes.",
      "  - NEVER make health claims ('boosts immunity', 'cures', 'clinically proven').",
      "  - NEVER quote prices, portion weights, or calorie counts not supplied.",
      `dishName: ${dishName}; cuisine: ${cuisine}.`,
      `ingredients (verbatim only): ${ingredients.join(" | ")}`,
      seasonalContext ? `seasonalContext: ${seasonalContext}` : "",
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
          { role: "user", content: `Write the menu description.` },
        ],
        max_tokens: 400,
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

      let description =
        typeof parsed.description === "string"
          ? (parsed.description as string)
          : "";
      if (description.length > 280) description = description.slice(0, 277) + "...";

      // Server-side health-claim scan.
      const warnings = Array.isArray(parsed.warnings)
        ? (parsed.warnings as string[]).slice(0, 3)
        : [];
      for (const re of HEALTH_CLAIMS) {
        if (re.test(description)) {
          warnings.push(`Description contains health-claim pattern: ${String(re)}.`);
        }
      }
      // Price-leak scan.
      if (/[\$€₺£]\s?\d/.test(description)) {
        warnings.push("Description appears to contain a price — strip before publishing.");
      }

      await logSecurityEvent({
        kind: "chef.menu.described",
        tenantId: ctx.tenantId,
        payload: {
          subject: "chef.menu.described",
          dishName,
          cuisine,
          ingredientsCount: ingredients.length,
          allergenTagsCount: allergenTags.length,
          allergenRegime,
          warningsCount: warnings.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          dishName,
          cuisine,
          ingredients,
          description,
          allergenTags,
          allergenRegime,
          isVegetarian,
          isVegan,
          isGlutenFree,
          priceVisibility: "on_request",
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[]).slice(0, 3)
            : [],
          warnings,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Menu description failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
