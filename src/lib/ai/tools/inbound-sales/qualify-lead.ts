import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * qualify_lead — score an inbound prospect against the worker's ICP
 * (Ideal Customer Profile) thresholds and persist the lead in the
 * `leads` table. Returns a 0-100 score the model uses to decide its
 * next move:
 *
 *   ≥ leadScore threshold (default 60) → call book_meeting next
 *   < threshold                        → call send_followup_email
 *                                        (nurture / drip)
 *
 * Scoring is deliberately transparent + tunable, not opaque ML:
 *
 *   - budgetUSD             40% (annual contract value)
 *   - timeline ∈ now/quarter 25%
 *   - decisionMakerYes      20%
 *   - fitWithICP            15%
 *
 * Tenants can tune the weights via worker.settings.weights (Sprint 23+
 * adds the UI for this); today we use the defaults. The transparent
 * scoring also keeps the audit log human-readable: an operator
 * disputing a score can trace exactly which signal pushed it.
 */

const DEFAULT_THRESHOLD = 60;

export const qualifyLeadTool: Tool = {
  name: "qualify_lead",
  description:
    "Score an inbound prospect 0-100 against the ICP and persist them in the leads table. Returns a numeric score AND a recommended next action ('book_meeting' if hot, 'send_followup_email' if needs nurturing). Call this on the FIRST message of any sales conversation, BEFORE pitching anything.",
  parameters: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Prospect's email — used as the dedupe key on the leads table.",
      },
      name: { type: "string", description: "Prospect's name." },
      company: { type: "string", description: "Company name." },
      title: { type: "string", description: "Prospect's role title (CEO, Head of Ops, etc.)." },
      budgetUSD: {
        type: "number",
        description: "Stated or implied annual budget in USD. Use 0 if the prospect hasn't given a signal.",
        minimum: 0,
      },
      timeline: {
        type: "string",
        description:
          "When the prospect plans to buy. Use 'next_year' or 'no_timeline' when they're vague ('sometime later', 'just browsing').",
        enum: [
          "now",
          "this_quarter",
          "next_quarter",
          "this_year",
          "next_year",
          "no_timeline",
        ],
      },
      decisionMaker: {
        type: "boolean",
        description: "Did the prospect confirm they are the decision-maker?",
      },
      fitWithIcp: {
        type: "integer",
        description:
          "Your subjective 0-10 score of how well this prospect fits the brand bible's ICP (industry, company size, use case).",
        minimum: 0,
        maximum: 10,
      },
      notes: {
        type: "string",
        description: "Any specific notes (pain points, integrations they need, competitor mention).",
      },
    },
    required: ["email", "name", "company", "timeline", "decisionMaker", "fitWithIcp"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const email = String(args.email).trim().toLowerCase();
    if (!email.includes("@")) {
      return { ok: false, refused: true, reason: "email is malformed." };
    }
    const name = String(args.name).trim();
    const company = String(args.company).trim();
    const title = (args.title ? String(args.title) : "").trim();
    const budgetUSD = Math.max(0, Number(args.budgetUSD ?? 0));
    const timeline = String(args.timeline) as
      | "now"
      | "this_quarter"
      | "next_quarter"
      | "this_year"
      | "next_year"
      | "no_timeline";
    const decisionMaker = Boolean(args.decisionMaker);
    const fitWithIcp = Math.max(0, Math.min(10, Number(args.fitWithIcp)));
    const notes = (args.notes ? String(args.notes) : "").trim();

    /* ── scoring ────────────────────────────────────────────────── */
    // Budget: 0 → 0pts, $5k → 20pts, $50k+ → 40pts (clamped log scale).
    const budgetScore = budgetUSD <= 0 ? 0 : Math.min(40, 40 * (Math.log10(budgetUSD + 1) / Math.log10(50_001)));
    // Timeline:
    const timelineScore =
      timeline === "now"
        ? 25
        : timeline === "this_quarter"
          ? 20
          : timeline === "next_quarter"
            ? 12
            : timeline === "this_year"
              ? 8
              : timeline === "next_year"
                ? 2 // far enough away to be effectively dormant
                : 0;
    const decisionMakerScore = decisionMaker ? 20 : 5;
    const fitScore = (fitWithIcp / 10) * 15;
    const totalScore = Math.round(budgetScore + timelineScore + decisionMakerScore + fitScore);

    /* ── lead persistence ──────────────────────────────────────── */
    const thresholdRaw = ctx.workerSettings?.leadScore;
    const threshold = typeof thresholdRaw === "number" ? thresholdRaw : DEFAULT_THRESHOLD;
    const status: "new" | "queued" | "contacted" =
      totalScore >= threshold ? "queued" : "new";
    const recommendedNextStep = totalScore >= threshold ? "book_meeting" : "send_followup_email";

    const breakdown = {
      budgetScore: Math.round(budgetScore),
      timelineScore,
      decisionMakerScore,
      fitScore: Math.round(fitScore),
      threshold,
    };

    try {
      // Upsert by (tenantId, email).
      const existing = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, email)))
        .limit(1);

      let leadId: string;
      if (existing.length > 0) {
        leadId = existing[0].id;
        await db
          .update(leads)
          .set({
            name,
            company,
            title: title || null,
            notes: notes || null,
            status,
            metadata: {
              qualificationScore: totalScore,
              breakdown,
              budgetUSD,
              timeline,
              decisionMaker,
              fitWithIcp,
              qualifiedAt: new Date().toISOString(),
              qualifiedByWorkerId: ctx.workerId,
            },
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
      } else {
        const [row] = await db
          .insert(leads)
          .values({
            tenantId: ctx.tenantId,
            email,
            name,
            company,
            title: title || null,
            source: ctx.channel,
            notes: notes || null,
            status,
            metadata: {
              qualificationScore: totalScore,
              breakdown,
              budgetUSD,
              timeline,
              decisionMaker,
              fitWithIcp,
              qualifiedAt: new Date().toISOString(),
              qualifiedByWorkerId: ctx.workerId,
            },
          })
          .returning({ id: leads.id });
        leadId = row.id;
      }

      await logSecurityEvent({
        kind: "lead.qualified",
        tenantId: ctx.tenantId,
        payload: {
          subject: "lead.qualified",
          leadId,
          email,
          score: totalScore,
          status,
          breakdown,
        },
      });

      return {
        ok: true,
        data: {
          leadId,
          score: totalScore,
          status,
          recommendedNextStep,
          breakdown,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't persist the lead: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
