import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * create_outreach_lead — register a NEW outbound prospect in the leads
 * table so subsequent tool calls (queue_outreach_email) can reference
 * a real lead row.
 *
 * Distinct from Inbound Sales' qualify_lead:
 *   - qualify_lead: prospect WROTE TO US, we score for hot vs cold
 *   - create_outreach_lead: WE FOUND them, we just need a stable row
 *     to attach the outreach drafts to. No scoring — outreach is
 *     volume + relevance, not "qualified inbound".
 *
 * Idempotent by (tenant_id, email).
 */

export const createOutreachLeadTool: Tool = {
  name: "create_outreach_lead",
  description:
    "Register a new outbound prospect in the leads database BEFORE writing them an outreach email. Idempotent — calling twice with the same email just updates the row. Returns leadId you'll pass to queue_outreach_email.",
  parameters: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Prospect work email. Required — outreach without an email goes nowhere.",
      },
      name: { type: "string", description: "Full name." },
      company: { type: "string", description: "Company name." },
      title: { type: "string", description: "Their role at the company." },
      linkedinUrl: { type: "string", description: "LinkedIn profile URL if known." },
      tags: {
        type: "array",
        description: "Segmentation tags ('vc-backed', 'dtc', 'enterprise'). Used for cadence routing.",
        items: { type: "string" },
      },
      notes: {
        type: "string",
        description:
          "Why are we reaching out? What signals did enrich_prospect surface? The model writing the email reads this.",
      },
    },
    required: ["email", "name", "company"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const email = String(args.email).trim().toLowerCase();
    if (!email.includes("@")) {
      return { ok: false, refused: true, reason: "email malformed." };
    }
    const name = String(args.name).trim();
    const company = String(args.company).trim();
    const title = args.title ? String(args.title).trim() : null;
    const linkedinUrl = args.linkedinUrl ? String(args.linkedinUrl).trim() : null;
    const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];
    const notes = args.notes ? String(args.notes).trim() : null;

    try {
      const existing = await db
        .select({ id: leads.id, metadata: leads.metadata })
        .from(leads)
        .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, email)))
        .limit(1);

      let leadId: string;
      let isNew = false;
      if (existing.length > 0) {
        leadId = existing[0].id;
        const meta = (existing[0].metadata as Record<string, unknown>) ?? {};
        await db
          .update(leads)
          .set({
            name,
            company,
            title,
            notes,
            tags,
            metadata: {
              ...meta,
              linkedinUrl: linkedinUrl ?? meta.linkedinUrl ?? null,
              lastEnrichedAt: new Date().toISOString(),
              enrichedByWorkerId: ctx.workerId,
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
            title,
            source: "sdr-outreach",
            notes,
            tags,
            status: "new",
            metadata: {
              linkedinUrl,
              createdByWorkerId: ctx.workerId,
              createdViaTool: "create_outreach_lead",
            },
          })
          .returning({ id: leads.id });
        leadId = row.id;
        isNew = true;
      }

      await logSecurityEvent({
        kind: "lead.created",
        tenantId: ctx.tenantId,
        payload: {
          subject: isNew ? "lead.created.outreach" : "lead.updated.outreach",
          leadId,
          email,
          company,
          source: "sdr-outreach",
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          leadId,
          isNew,
          status: "new",
          recommendedNextStep: "queue_outreach_email",
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
