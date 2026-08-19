import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * record_bookkeeping_entry — log a single financial line item to the
 * audit trail. Co-opts `security_events` as a lightweight ledger
 * (subject='bookkeeping.entry') until Sprint 70+ migrates these to a
 * dedicated `bookkeeping_entries` table with proper indexes for P&L
 * queries.
 *
 * Why security_events: every row is immutable + tenant-scoped + has
 * created_at, which is exactly what a single-tenant ledger needs.
 * Sprint 70's migration is mechanical (copy rows where subject=
 * 'bookkeeping.entry' into the new table).
 *
 * Real provider integrations (Sprint 70+):
 *   - QuickBooks Online API (US, AU, UK, CA)
 *   - Xero (UK + AU)
 *   - Stripe Connect for direct revenue capture
 */

const ENTRY_TYPES = ["income", "expense", "transfer", "adjustment"] as const;

const EXPENSE_CATEGORIES = [
  "advertising",
  "rent",
  "salaries",
  "utilities",
  "software",
  "professional_fees",
  "office_supplies",
  "travel",
  "meals",
  "shipping",
  "taxes",
  "merchant_fees",
  "other",
] as const;

const INCOME_CATEGORIES = [
  "sales",
  "subscription_revenue",
  "consulting",
  "interest",
  "refund",
  "other_income",
] as const;

export const recordBookkeepingEntryTool: Tool = {
  name: "record_bookkeeping_entry",
  description:
    "Log a single income / expense / transfer / adjustment line item for the tenant's books. Amounts are in cents (avoids float rounding). Category must match the type — income categories for income, expense categories for expense. Date is ISO YYYY-MM-DD.",
  parameters: {
    type: "object",
    properties: {
      entryType: {
        type: "string",
        enum: ENTRY_TYPES,
        description: "income, expense, transfer (account-to-account), or adjustment.",
      },
      amountCents: {
        type: "integer",
        description: "Amount in cents (USD). Use positive integers; entryType conveys sign.",
        minimum: 1,
      },
      category: {
        type: "string",
        description:
          "Category. Use one of the standard income / expense categories. 'other' / 'other_income' / 'transfer_internal' / 'adjustment_internal' are valid.",
      },
      description: {
        type: "string",
        description:
          "One-line description visible to the bookkeeper. Include vendor / source if applicable.",
      },
      dateIso: {
        type: "string",
        description: "Transaction date as ISO YYYY-MM-DD.",
      },
      reference: {
        type: "string",
        description: "Optional reference id (invoice number, receipt id, Stripe payment_intent).",
      },
    },
    required: ["entryType", "amountCents", "category", "description", "dateIso"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const entryType = String(args.entryType);
    const rawAmount = Number(args.amountCents);
    if (!Number.isFinite(rawAmount) || rawAmount < 1) {
      return {
        ok: false,
        refused: true,
        reason: "amountCents must be a positive integer ≥ 1.",
      };
    }
    const amountCents = rawAmount;
    const category = String(args.category).trim();
    const description = String(args.description).trim();
    const dateIso = String(args.dateIso).trim();
    const reference = args.reference ? String(args.reference).trim() : null;

    if (!(ENTRY_TYPES as readonly string[]).includes(entryType)) {
      return {
        ok: false,
        refused: true,
        reason: `entryType must be one of: ${ENTRY_TYPES.join(", ")}`,
      };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return {
        ok: false,
        refused: true,
        reason: "dateIso must be YYYY-MM-DD.",
      };
    }
    if (description.length < 3) {
      return { ok: false, refused: true, reason: "description too short." };
    }

    // Category vs type cross-check (warning, not refusal — operators
    // sometimes use custom categories the AI doesn't know about).
    const knownExpense = (EXPENSE_CATEGORIES as readonly string[]).includes(category);
    const knownIncome = (INCOME_CATEGORIES as readonly string[]).includes(category);
    let categoryWarning: string | null = null;
    if (entryType === "income" && !knownIncome && category !== "other_income") {
      categoryWarning = `Category '${category}' isn't a standard income category. Allowed: ${INCOME_CATEGORIES.join(", ")}.`;
    } else if (entryType === "expense" && !knownExpense && category !== "other") {
      categoryWarning = `Category '${category}' isn't a standard expense category. Allowed: ${EXPENSE_CATEGORIES.join(", ")}.`;
    }

    try {
      await logSecurityEvent({
        kind: "bookkeeping.entry",
        tenantId: ctx.tenantId,
        payload: {
          subject: "bookkeeping.entry",
          entryType,
          amountCents,
          category,
          description,
          dateIso,
          reference,
          workerId: ctx.workerId,
        },
      });
      return {
        ok: true,
        data: {
          recorded: true,
          entryType,
          amountCents,
          category,
          dateIso,
          categoryWarning,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't write ledger entry: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
