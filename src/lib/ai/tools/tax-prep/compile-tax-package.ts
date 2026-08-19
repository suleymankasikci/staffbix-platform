import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compile_tax_package_summary — region-aware package summary for the
 * accountant. Pure arithmetic + region-specific section presence; no
 * LLM call. Output:
 *   - periodLabel, region, currencyCode
 *   - totals: { incomeCents, expenseCents, netCents, vatCollectedCents,
 *     vatPaidCents }
 *   - byCategory: array of { category, cents, count }
 *   - missingDataChecks: array of strings (e.g., 'no income rows', 'X
 *     uncategorized lines')
 *   - regionSections: which packet sections to prepare
 *   - notFiledDisclaimer
 */

const REGIONS = ["US", "UK", "EU", "TR", "OTHER"] as const;

const MAX_ROWS = 5000;

const REGION_SECTIONS: Record<(typeof REGIONS)[number], string[]> = {
  US: ["1040 Schedule C", "1099 contractor summary", "State filing TBD"],
  UK: ["Self Assessment (SA100)", "VAT return", "PAYE summary"],
  EU: ["VAT return", "Country-of-residence corporate filing", "Intrastat (if cross-border)"],
  TR: ["KDV beyannamesi", "Muhtasar/Stopaj", "Gelir vergisi/Kurumlar vergisi"],
  OTHER: ["Generic profit/loss statement", "VAT summary if applicable"],
};

export const compileTaxPackageSummaryTool: Tool = {
  name: "compile_tax_package_summary",
  description:
    "Compile a region-aware tax package summary for the operator's accountant. Pure arithmetic — never files anything, never advises on deductibility.",
  parameters: {
    type: "object",
    properties: {
      region: { type: "string", enum: REGIONS },
      periodLabel: { type: "string" },
      currencyCode: {
        type: "string",
        description: "ISO 4217 currency code. Default 'USD'.",
      },
      rows: {
        type: "array",
        description: "≤5000 ledger rows: { entryType ('income'|'expense'), amountCents, category, vatCents? }.",
        items: { type: "object" },
      },
    },
    required: ["region", "periodLabel", "rows"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const region = String(args.region);
    const periodLabel = String(args.periodLabel).trim().slice(0, 40);
    // Validate raw — never truncate to 3 chars silently.
    const currencyCode = args.currencyCode
      ? String(args.currencyCode).trim().toUpperCase()
      : "USD";
    const rawRows = Array.isArray(args.rows)
      ? (args.rows as Array<Record<string, unknown>>)
      : [];

    if (!(REGIONS as readonly string[]).includes(region)) {
      return {
        ok: false,
        refused: true,
        reason: `region must be one of: ${REGIONS.join(", ")}`,
      };
    }
    if (periodLabel.length < 2) {
      return { ok: false, refused: true, reason: "periodLabel too short." };
    }
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      return {
        ok: false,
        refused: true,
        reason: "currencyCode must be a 3-letter ISO code.",
      };
    }
    if (rawRows.length === 0) {
      return { ok: false, refused: true, reason: "rows required." };
    }
    if (rawRows.length > MAX_ROWS) {
      return {
        ok: false,
        refused: true,
        reason: `rows too many (max ${MAX_ROWS}).`,
      };
    }

    let incomeCents = 0;
    let expenseCents = 0;
    let vatCollectedCents = 0;
    let vatPaidCents = 0;
    const byCategoryMap: Record<string, { cents: number; count: number }> = {};
    let uncategorizedCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      const entryType = String(r.entryType ?? "");
      const amountCents = Math.max(0, Math.round(Number(r.amountCents ?? 0)));
      const category = (typeof r.category === "string" ? r.category : "")
        .trim()
        .slice(0, 80);
      const vatCents = Math.max(0, Math.round(Number(r.vatCents ?? 0)));

      if (entryType !== "income" && entryType !== "expense") {
        return {
          ok: false,
          refused: true,
          reason: `rows[${i}].entryType must be 'income' or 'expense'.`,
        };
      }
      if (amountCents === 0) {
        return {
          ok: false,
          refused: true,
          reason: `rows[${i}].amountCents must be > 0.`,
        };
      }

      if (entryType === "income") {
        incomeCents += amountCents;
        vatCollectedCents += vatCents;
      } else {
        expenseCents += amountCents;
        vatPaidCents += vatCents;
      }

      const catKey = category.length > 0 ? category : "uncategorized";
      if (catKey === "uncategorized") uncategorizedCount++;
      const entry = byCategoryMap[catKey] ?? { cents: 0, count: 0 };
      entry.cents += amountCents;
      entry.count += 1;
      byCategoryMap[catKey] = entry;
    }

    const byCategory = Object.entries(byCategoryMap)
      .map(([category, v]) => ({ category, cents: v.cents, count: v.count }))
      .sort((a, b) => b.cents - a.cents);

    const missingDataChecks: string[] = [];
    if (incomeCents === 0) missingDataChecks.push("No income rows in this period.");
    if (expenseCents === 0)
      missingDataChecks.push("No expense rows in this period.");
    if (uncategorizedCount > 0)
      missingDataChecks.push(
        `${uncategorizedCount} uncategorized line(s) — assign categories before sending.`,
      );
    if (region === "EU" && vatCollectedCents === 0 && incomeCents > 0)
      missingDataChecks.push(
        "EU region with income but zero VAT collected — confirm reverse-charge / exempt status.",
      );

    const netCents = incomeCents - expenseCents;
    const regionSections = REGION_SECTIONS[region as (typeof REGIONS)[number]];

    await logSecurityEvent({
      kind: "tax.package.compiled",
      tenantId: ctx.tenantId,
      payload: {
        subject: "tax.package.compiled",
        region,
        periodLabel,
        currencyCode,
        rowsCount: rawRows.length,
        incomeCents,
        expenseCents,
        uncategorizedCount,
        missingDataChecksCount: missingDataChecks.length,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        region,
        periodLabel,
        currencyCode,
        rowsCount: rawRows.length,
        totals: {
          incomeCents,
          expenseCents,
          netCents,
          vatCollectedCents,
          vatPaidCents,
        },
        byCategory,
        missingDataChecks,
        regionSections,
        notFiledDisclaimer:
          "Summary only. Nothing filed. Accountant verifies + submits under jurisdiction.",
      },
    };
  },
};
