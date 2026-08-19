import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { securityEvents } from "@/lib/db/schema";

/**
 * monthly_summary — aggregate bookkeeping entries logged this month
 * into income vs expense totals + per-category breakdown. Reads back
 * from security_events (subject='bookkeeping.entry'), which is where
 * record_bookkeeping_entry persists today.
 *
 * Output structure mirrors a simple P&L: net = income − expense, with
 * top-3 categories on each side. The Bookkeeping Assistant uses this
 * to compose end-of-month recap emails to the operator.
 *
 * Real provider (Sprint 70+) replaces the data source with the
 * dedicated `bookkeeping_entries` table + QuickBooks/Xero pulls.
 */

export const monthlySummaryTool: Tool = {
  name: "monthly_summary",
  description:
    "Aggregate ledger entries from the current month (or a specified month) into income vs expense totals + per-category breakdown. Returns amounts in cents. Use this at month-end before composing the recap email.",
  parameters: {
    type: "object",
    properties: {
      monthIso: {
        type: "string",
        description:
          "Month to summarize, YYYY-MM. Omit to use the current month.",
      },
    },
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const monthIso = args.monthIso ? String(args.monthIso).trim() : null;

    let startDate: Date;
    let endDate: Date;
    if (monthIso) {
      if (!/^\d{4}-\d{2}$/.test(monthIso)) {
        return {
          ok: false,
          refused: true,
          reason: "monthIso must be YYYY-MM.",
        };
      }
      const [yStr, mStr] = monthIso.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      startDate = new Date(Date.UTC(y, m - 1, 1));
      endDate = new Date(Date.UTC(y, m, 1));
    } else {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    }

    try {
      // Pull all bookkeeping rows in the window, then aggregate in
      // app code — simpler than fancy jsonb SQL and a month's volume
      // is tiny.
      const rows = await db
        .select({ payload: securityEvents.payload })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.tenantId, ctx.tenantId),
            gte(securityEvents.createdAt, startDate),
            lt(securityEvents.createdAt, endDate),
            sql`(${securityEvents.payload}->>'subject') = 'bookkeeping.entry'`,
          ),
        );

      let totalIncomeCents = 0;
      let totalExpenseCents = 0;
      const incomeByCategory = new Map<string, number>();
      const expenseByCategory = new Map<string, number>();
      let entryCount = 0;

      for (const r of rows) {
        const p = (r.payload ?? {}) as Record<string, unknown>;
        const entryType = String(p.entryType ?? "");
        const amount = Number(p.amountCents ?? 0);
        const category = String(p.category ?? "uncategorized");
        if (!Number.isFinite(amount) || amount <= 0) continue;
        entryCount++;
        if (entryType === "income") {
          totalIncomeCents += amount;
          incomeByCategory.set(
            category,
            (incomeByCategory.get(category) ?? 0) + amount,
          );
        } else if (entryType === "expense") {
          totalExpenseCents += amount;
          expenseByCategory.set(
            category,
            (expenseByCategory.get(category) ?? 0) + amount,
          );
        }
      }

      const top3 = (m: Map<string, number>) =>
        [...m.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([category, cents]) => ({ category, cents }));

      return {
        ok: true,
        data: {
          month: monthIso ?? `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")}`,
          totalIncomeCents,
          totalExpenseCents,
          netCents: totalIncomeCents - totalExpenseCents,
          entryCount,
          topIncomeCategories: top3(incomeByCategory),
          topExpenseCategories: top3(expenseByCategory),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't compute summary: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
