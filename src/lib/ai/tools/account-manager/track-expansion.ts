import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * track_expansion_opportunity — record an upsell / cross-sell / renewal
 * signal on an existing account (a leads row with status='won' or
 * 'contacted' representing a paying customer).
 *
 * Account managers don't CLOSE deals through this tool — they
 * surface opportunities for the operator to action. The data ends up
 * in leads.metadata.expansionOpportunities[] so an operator can run
 * a quarterly pipeline review from a single query.
 *
 * Real CRM integration (Sprint 60+): push to Salesforce / HubSpot /
 * Pipedrive as a deal record. Today it stays in the leads table.
 *
 * Why this exists separate from qualify_lead:
 *   qualify_lead is for INCOMING leads being scored for fit.
 *   track_expansion is for EXISTING accounts whose ARR could grow.
 *   The two flows have different lifecycles + different operator
 *   workflows, so they're kept as separate tools.
 */

const OPPORTUNITY_TYPES = [
  "upsell", // bigger plan
  "cross_sell", // additional product
  "expansion_seat", // more users / seats
  "renewal", // contract renewal coming up
  "winback", // churned customer showing interest again
] as const;

const PROBABILITY_BANDS = ["low", "medium", "high"] as const;

export const trackExpansionOpportunityTool: Tool = {
  name: "track_expansion_opportunity",
  description:
    "Record an upsell, cross-sell, expansion-seat, renewal, or winback signal on an existing customer account. Use this when you spot ANY signal that the account could grow — explicit interest, usage hitting a plan limit, contract renewal date approaching, etc. The operator runs payouts/handoffs from these records.",
  parameters: {
    type: "object",
    properties: {
      accountEmail: {
        type: "string",
        description: "Email of the customer contact — must match a leads row.",
      },
      opportunityType: {
        type: "string",
        enum: OPPORTUNITY_TYPES,
        description: "Kind of expansion this represents.",
      },
      estimatedArrUsd: {
        type: "number",
        description:
          "Estimated annual recurring revenue uplift in USD if the opportunity closes. 0 if unknown.",
        minimum: 0,
      },
      probability: {
        type: "string",
        enum: PROBABILITY_BANDS,
        description: "Confidence the deal closes — operator triages high before low.",
      },
      evidenceQuote: {
        type: "string",
        description:
          "1-3 sentences of evidence. Quote the customer's exact words if possible — 'I wish we could add another 5 users', 'our contract is up in March'.",
      },
      nextStep: {
        type: "string",
        description:
          "What action the operator should take next: 'send pricing for Growth plan', 'book a renewal call', 'connect with their procurement contact'.",
      },
    },
    required: [
      "accountEmail",
      "opportunityType",
      "probability",
      "evidenceQuote",
      "nextStep",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const accountEmail = String(args.accountEmail).trim().toLowerCase();
    const opportunityType = String(args.opportunityType);
    const estimatedArrUsd = Math.max(0, Number(args.estimatedArrUsd ?? 0));
    const probability = String(args.probability);
    const evidenceQuote = String(args.evidenceQuote).trim();
    const nextStep = String(args.nextStep).trim();

    if (!accountEmail.includes("@")) {
      return { ok: false, refused: true, reason: "accountEmail is malformed." };
    }
    if (!(OPPORTUNITY_TYPES as readonly string[]).includes(opportunityType)) {
      return {
        ok: false,
        refused: true,
        reason: `opportunityType must be one of: ${OPPORTUNITY_TYPES.join(", ")}`,
      };
    }
    if (!(PROBABILITY_BANDS as readonly string[]).includes(probability)) {
      return {
        ok: false,
        refused: true,
        reason: `probability must be one of: ${PROBABILITY_BANDS.join(", ")}`,
      };
    }
    if (evidenceQuote.length < 10) {
      return { ok: false, refused: true, reason: "evidenceQuote too short — quote real evidence." };
    }
    if (nextStep.length < 10) {
      return { ok: false, refused: true, reason: "nextStep too short — operator needs an actionable hint." };
    }

    const [lead] = await db
      .select({ id: leads.id, metadata: leads.metadata })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, accountEmail)))
      .limit(1);

    if (!lead) {
      return {
        ok: false,
        refused: true,
        reason: "No matching account — account managers work on EXISTING leads. Use create_outreach_lead first if this is a brand-new contact.",
      };
    }

    try {
      const meta = (lead.metadata as Record<string, unknown>) ?? {};
      const opportunities = Array.isArray(meta.expansionOpportunities)
        ? (meta.expansionOpportunities as unknown[])
        : [];
      opportunities.push({
        opportunityType,
        estimatedArrUsd,
        probability,
        evidenceQuote,
        nextStep,
        recordedByWorkerId: ctx.workerId,
        recordedAt: new Date().toISOString(),
      });
      await db
        .update(leads)
        .set({
          metadata: { ...meta, expansionOpportunities: opportunities },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      await logSecurityEvent({
        kind: "account.expansion.tracked",
        tenantId: ctx.tenantId,
        payload: {
          subject: "account.expansion.tracked",
          leadId: lead.id,
          accountEmail,
          opportunityType,
          estimatedArrUsd,
          probability,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          leadId: lead.id,
          opportunityType,
          probability,
          estimatedArrUsd,
          totalOpportunities: opportunities.length,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't persist expansion record: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
