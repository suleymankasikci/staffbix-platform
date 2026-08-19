import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * check_allergen_disclosure — verify every menu item declares all
 * allergens detectable from its ingredient list. Pure rules.
 *
 * Output:
 *   - perItem: [{ name, ingredients, declaredAllergens, detectedAllergens,
 *     missing, extraneous, status }]
 *     status ∈ 'ok' | 'missing_declarations' | 'unrecognised_declared'
 *   - summary: { totalItems, itemsWithMissing, itemsClean }
 *   - regulatoryNote
 */

const ALLERGEN_REGIMES = ["eu14", "us_big9"] as const;

const EU14: Record<string, RegExp[]> = {
  gluten: [
    /\bwheat\b/i, /\brye\b/i, /\bbarley\b/i, /\boats\b/i, /\bspelt\b/i,
    /\bkamut\b/i, /\bbulgur\b/i, /\bcouscous\b/i, /\bsemolina\b/i, /\bflour\b/i,
    /\bbread\b/i, /\bpasta\b/i, /\bnoodle\b/i, /\bsoy sauce\b/i,
  ],
  // Plural-tolerant patterns matching write-menu-description.ts.
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

const MAX_ITEMS = 60;

export const checkAllergenDisclosureTool: Tool = {
  name: "check_allergen_disclosure",
  description:
    "Verify every menu item declares all allergens detectable from its ingredient list. Pure rules. Returns per-item status + missing-declaration counts.",
  parameters: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "1-60 menu items: { name, ingredients[], declaredAllergens[] }.",
        items: { type: "object" },
      },
      allergenRegime: {
        type: "string",
        enum: ALLERGEN_REGIMES,
        description: "Default 'eu14'.",
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rawItems = Array.isArray(args.items)
      ? (args.items as Array<Record<string, unknown>>)
      : [];
    const allergenRegime =
      ((args.allergenRegime as string | undefined) ?? "eu14").toLowerCase();

    if (rawItems.length === 0 || rawItems.length > MAX_ITEMS) {
      return {
        ok: false,
        refused: true,
        reason: `items must have 1-${MAX_ITEMS} entries.`,
      };
    }
    if (!(ALLERGEN_REGIMES as readonly string[]).includes(allergenRegime)) {
      return {
        ok: false,
        refused: true,
        reason: `allergenRegime must be one of: ${ALLERGEN_REGIMES.join(", ")}`,
      };
    }

    const knownAllergens = Object.keys(EU14);
    const regimeTable = EU14;

    type PerItem = {
      name: string;
      ingredients: string[];
      declaredAllergens: string[];
      detectedAllergens: string[];
      missing: string[];
      extraneous: string[];
      status: "ok" | "missing_declarations" | "unrecognised_declared";
    };

    const perItem: PerItem[] = [];
    let itemsWithMissing = 0;
    let itemsClean = 0;

    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const name = String(it.name ?? "").trim();
      const ingredients = Array.isArray(it.ingredients)
        ? (it.ingredients as string[]).filter(
            (s) => typeof s === "string" && s.length > 0,
          )
        : [];
      const declaredAllergens = Array.isArray(it.declaredAllergens)
        ? (it.declaredAllergens as string[])
            .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
            .filter((s) => s.length > 0)
        : [];

      if (name.length < 1) {
        return {
          ok: false,
          refused: true,
          reason: `items[${i}].name required.`,
        };
      }
      if (ingredients.length < 1) {
        return {
          ok: false,
          refused: true,
          reason: `items[${i}].ingredients required (at least one).`,
        };
      }

      const blob = ingredients.join(" | ").toLowerCase();
      const detected: string[] = [];
      for (const [tag, patterns] of Object.entries(regimeTable)) {
        if (patterns.some((re) => re.test(blob))) detected.push(tag);
      }

      const declaredSet = new Set(declaredAllergens);
      const detectedSet = new Set(detected);
      const missing = detected.filter((t) => !declaredSet.has(t));
      const extraneous = declaredAllergens.filter(
        (t) => !knownAllergens.includes(t),
      );
      const undetectedDeclared = declaredAllergens.filter(
        (t) => knownAllergens.includes(t) && !detectedSet.has(t),
      );

      let status: PerItem["status"] = "ok";
      if (missing.length > 0) {
        status = "missing_declarations";
        itemsWithMissing += 1;
      } else if (extraneous.length > 0 || undetectedDeclared.length > 0) {
        status = "unrecognised_declared";
      } else {
        itemsClean += 1;
      }

      perItem.push({
        name,
        ingredients,
        declaredAllergens,
        detectedAllergens: detected,
        missing,
        extraneous: [...extraneous, ...undetectedDeclared.filter((t) => !extraneous.includes(t))],
        status,
      });
    }

    await logSecurityEvent({
      kind: "chef.allergens.checked",
      tenantId: ctx.tenantId,
      payload: {
        subject: "chef.allergens.checked",
        allergenRegime,
        itemsTotal: rawItems.length,
        itemsWithMissing,
        itemsClean,
        workerId: ctx.workerId,
      },
    });

    const regulatoryNote =
      allergenRegime === "eu14"
        ? "Reference: EU Food Information for Consumers Regulation (EU 1169/2011) — 14 allergens."
        : "Reference: US FDA Big-9 allergens (FALCPA + 2023 sesame addition).";

    return {
      ok: true,
      data: {
        allergenRegime,
        perItem,
        summary: {
          totalItems: rawItems.length,
          itemsWithMissing,
          itemsClean,
        },
        regulatoryNote,
      },
    };
  },
};
