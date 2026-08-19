import { and, eq, gte, sql } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { securityEvents } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compute_cashflow_projection — build a forward-looking cash flow
 * view by combining:
 *
 *   - Historical run-rate from the bookkeeping ledger (last 90 days
 *     of `subject='bookkeeping.entry'` rows in security_events)
 *   - Expected income (Stripe open invoices via list_open_invoices —
 *     out of scope here, the model can pre-fetch and pass totals)
 *   - Expected expenses (caller-supplied recurring expenses if known)
 *
 * Output: monthly net projection for the next N months + a "low cash
 * date" estimate using a simple linear model. Conservative — the role
 * config says "alert at 60 days, not 15", so the model gets enough
 * lead time to warn the operator.
 *
 * Sprint 80+ replaces this with a proper finance engine (multi-account,
 * scenario modeling, AR aging). Today this is the linear-run-rate
 * version: good enough for SMB founders, transparent for audit.
 */

export const computeCashflowProjectionTool: Tool = {
  name: "compute_cashflow_projection",
  description:
    "Compute a forward-looking cash flow projection from the last 90 days of bookkeeping entries. Returns monthly run rates + estimated months of runway given a current cash balance you provide. Use this whenever someone asks about cash position or 'how long can we last'.",
  parameters: {
    type: "object",
    properties: {
      currentCashCents: {
        type: "integer",
        description:
          "Current cash balance in cents (USD). Operator typically provides this; pull from the latest bank statement.",
        minimum: 0,
      },
      monthsAhead: {
        type: "integer",
        description: "How many months to project forward.",
        minimum: 1,
        maximum: 24,
      },
      recurringMonthlyExpenseCents: {
        type: "integer",
        description: "Known recurring expenses per month in cents (rent, salaries, subscriptions). 0 if none extra.",
        minimum: 0,
      },
      recurringMonthlyIncomeCents: {
        type: "integer",
        description: "Known recurring income per month in cents (subscriptions, retainers). 0 if unknown.",
        minimum: 0,
      },
    },
    required: ["currentCashCents", "monthsAhead"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const currentCashCents = Math.max(0, Number(args.currentCashCents));
    const monthsAhead = Math.max(1, Math.min(24, Number(args.monthsAhead)));
    const recurringMonthlyExpenseCents = Math.max(0, Number(args.recurringMonthlyExpenseCents ?? 0));
    const recurringMonthlyIncomeCents = Math.max(0, Number(args.recurringMonthlyIncomeCents ?? 0));

    try {
      // Pull last 90 days of bookkeeping entries.
      const cutoff = new Date(Date.now() - 90 * 86400_000);
      const rows = await db
        .select({ payload: securityEvents.payload, createdAt: securityEvents.createdAt })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.tenantId, ctx.tenantId),
            gte(securityEvents.createdAt, cutoff),
            sql`(${securityEvents.payload}->>'subject') = 'bookkeeping.entry'`,
          ),
        );

      let income90 = 0;
      let expense90 = 0;
      for (const r of rows) {
        const p = (r.payload ?? {}) as Record<string, unknown>;
        const amt = Number(p.amountCents ?? 0);
        if (!Number.isFinite(amt) || amt <= 0) continue;
        if (p.entryType === "income") income90 += amt;
        else if (p.entryType === "expense") expense90 += amt;
      }

      // Monthly run rates (90 days ≈ 3 months).
      const histIncomePerMonth = Math.round(income90 / 3);
      const histExpensePerMonth = Math.round(expense90 / 3);
      const projectedIncomePerMonth = Math.max(
        recurringMonthlyIncomeCents,
        histIncomePerMonth,
      );
      const projectedExpensePerMonth =
        recurringMonthlyExpenseCents > 0
          ? recurringMonthlyExpenseCents + histExpensePerMonth
          : histExpensePerMonth;
      const netPerMonth = projectedIncomePerMonth - projectedExpensePerMonth;

      // Month-by-month projection.
      const months: Array<{
        monthOffset: number;
        endingCashCents: number;
        netCents: number;
        warning?: string;
      }> = [];
      let cash = currentCashCents;
      let runwayMonths: number | null = null;
      for (let i = 1; i <= monthsAhead; i++) {
        cash += netPerMonth;
        const warning =
          cash < 0
            ? "negative cash — insolvent at this pace"
            : cash < 10 * histExpensePerMonth
              ? "cash falling below 10× monthly expenses"
              : undefined;
        months.push({ monthOffset: i, endingCashCents: cash, netCents: netPerMonth, warning });
        if (runwayMonths === null && cash <= 0) runwayMonths = i;
      }
      if (runwayMonths === null && netPerMonth < 0) {
        // Project beyond the window for runway estimate.
        runwayMonths = Math.ceil(currentCashCents / -netPerMonth);
      }

      const summary = {
        currentCashCents,
        histIncomePerMonth,
        histExpensePerMonth,
        projectedIncomePerMonth,
        projectedExpensePerMonth,
        netPerMonth,
        monthsAhead,
        finalEndingCashCents: months[months.length - 1]?.endingCashCents ?? currentCashCents,
        runwayMonths,
        burnRate: netPerMonth < 0 ? -netPerMonth : 0,
        months,
      };

      await logSecurityEvent({
        kind: "cashflow.projection",
        tenantId: ctx.tenantId,
        payload: {
          subject: "cashflow.projection",
          currentCashCents,
          netPerMonth,
          runwayMonths,
          monthsAhead,
          workerId: ctx.workerId,
        },
      });

      return { ok: true, data: summary };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't compute projection: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
