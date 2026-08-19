import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * record_onboarding_step — track where a new customer is in the
 * activation journey. Steps are stored as a structured timeline on
 * `leads.metadata.onboardingSteps[]` so the operator (and other
 * workers) can see the customer's progress at a glance.
 *
 * Steps + their status feed into Customer Onboarder + Customer Success
 * playbooks: "customer is stuck at 'first_integration' for >3 days →
 * Customer Success worker reaches out", etc. Sprint 60+ adds the
 * playbook orchestration; today this tool just records the data.
 *
 * Step taxonomy is intentionally generic (works for any SaaS / DTC
 * onboarding); per-product step customization comes via Sprint 50's
 * onboarding-template feature.
 */

const STEP_STATUSES = [
  "started",
  "completed",
  "stuck",
  "skipped",
] as const;

export const recordOnboardingStepTool: Tool = {
  name: "record_onboarding_step",
  description:
    "Record where a customer is in their onboarding journey. Use this when you see explicit progress signals (they say they finished a step, you walked them through one, etc.) or stalls. Step names should be slug-case ('first_integration', 'invited_team', 'sent_first_message').",
  parameters: {
    type: "object",
    properties: {
      customerEmail: {
        type: "string",
        description: "Email of the customer — must match a leads row.",
      },
      stepName: {
        type: "string",
        description:
          "Slug-case step name. Examples: 'account_created', 'brand_bible_uploaded', 'first_worker_hired', 'first_message_sent', 'invited_teammate', 'integration_connected'.",
      },
      status: {
        type: "string",
        enum: STEP_STATUSES,
        description: "Current status of this step.",
      },
      note: {
        type: "string",
        description:
          "Optional 1-line note. For status='stuck', describe what's blocking ('they can't find the API key location'). For 'completed', mention what was accomplished.",
      },
    },
    required: ["customerEmail", "stepName", "status"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const customerEmail = String(args.customerEmail).trim().toLowerCase();
    const stepName = String(args.stepName).trim();
    const status = String(args.status);
    const note = args.note ? String(args.note).trim() : null;

    if (!customerEmail.includes("@")) {
      return { ok: false, refused: true, reason: "customerEmail malformed." };
    }
    if (!/^[a-z0-9_]+$/.test(stepName)) {
      return {
        ok: false,
        refused: true,
        reason: "stepName must be slug-case (lowercase letters, digits, underscores).",
      };
    }
    if (!(STEP_STATUSES as readonly string[]).includes(status)) {
      return {
        ok: false,
        refused: true,
        reason: `status must be one of: ${STEP_STATUSES.join(", ")}`,
      };
    }

    const [lead] = await db
      .select({ id: leads.id, metadata: leads.metadata })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, customerEmail)))
      .limit(1);
    if (!lead) {
      return {
        ok: false,
        refused: true,
        reason: "No matching customer — use create_outreach_lead to register them first.",
      };
    }

    try {
      const meta = (lead.metadata as Record<string, unknown>) ?? {};
      const steps = Array.isArray(meta.onboardingSteps)
        ? (meta.onboardingSteps as Array<{ stepName?: string; status?: string }>)
        : [];

      // Upsert: if a record for this step already exists, update; else append.
      const existingIdx = steps.findIndex((s) => s.stepName === stepName);
      const newEntry = {
        stepName,
        status,
        note,
        recordedByWorkerId: ctx.workerId,
        recordedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        steps[existingIdx] = newEntry;
      } else {
        steps.push(newEntry);
      }

      await db
        .update(leads)
        .set({
          metadata: { ...meta, onboardingSteps: steps },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      await logSecurityEvent({
        kind: "onboarding.step.recorded",
        tenantId: ctx.tenantId,
        payload: {
          subject: "onboarding.step.recorded",
          leadId: lead.id,
          customerEmail,
          stepName,
          status,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          leadId: lead.id,
          stepName,
          status,
          totalStepsRecorded: steps.length,
          completedSteps: steps.filter((s) => s.status === "completed").length,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't persist onboarding step: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
