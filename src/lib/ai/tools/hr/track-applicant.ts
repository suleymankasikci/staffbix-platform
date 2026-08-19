import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * track_applicant — register or update a job applicant in the leads
 * table. We co-opt the leads table as the applicant tracking store
 * (status='new', source='job_application', metadata holds CV
 * extraction + role + pipeline stage). Sprint 85+ migrates to a
 * dedicated applicants table when the role pipeline is mature.
 */

const PIPELINE_STAGES = [
  "received",
  "screening",
  "phone_screen",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export const trackApplicantTool: Tool = {
  name: "track_applicant",
  description:
    "Register or update a job applicant. Pass the applicant's email + role they applied for + pipeline stage. Optionally include parsed CV fields. Idempotent on (tenant, email).",
  parameters: {
    type: "object",
    properties: {
      applicantEmail: {
        type: "string",
        description: "Applicant email.",
      },
      applicantName: {
        type: "string",
        description: "Applicant's full name.",
      },
      roleApplied: {
        type: "string",
        description: "Job title they applied to ('Senior Engineer', 'Marketing Lead').",
      },
      pipelineStage: {
        type: "string",
        enum: PIPELINE_STAGES,
      },
      cvSummary: {
        type: "string",
        description:
          "Optional 1-2 sentence summary of strong points. From parse_cv's notableExperience field if available.",
      },
      keySkills: {
        type: "array",
        description: "Skills extracted from the CV.",
        items: { type: "string" },
      },
    },
    required: ["applicantEmail", "applicantName", "roleApplied", "pipelineStage"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const applicantEmail = String(args.applicantEmail).trim().toLowerCase();
    const applicantName = String(args.applicantName).trim();
    const roleApplied = String(args.roleApplied).trim();
    const pipelineStage = String(args.pipelineStage);
    const cvSummary = args.cvSummary ? String(args.cvSummary).trim() : null;
    const keySkills = Array.isArray(args.keySkills) ? (args.keySkills as string[]) : [];

    if (!applicantEmail.includes("@")) {
      return { ok: false, refused: true, reason: "applicantEmail malformed." };
    }
    if (!(PIPELINE_STAGES as readonly string[]).includes(pipelineStage)) {
      return {
        ok: false,
        refused: true,
        reason: `pipelineStage must be one of: ${PIPELINE_STAGES.join(", ")}`,
      };
    }

    try {
      const existing = await db
        .select({ id: leads.id, metadata: leads.metadata })
        .from(leads)
        .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, applicantEmail)))
        .limit(1);

      let leadId: string;
      const applicantData = {
        roleApplied,
        pipelineStage,
        cvSummary,
        keySkills,
        updatedByWorkerId: ctx.workerId,
        updatedAt: new Date().toISOString(),
      };

      if (existing.length > 0) {
        leadId = existing[0].id;
        const meta = (existing[0].metadata as Record<string, unknown>) ?? {};
        await db
          .update(leads)
          .set({
            name: applicantName,
            tags: ["applicant", roleApplied.toLowerCase().replace(/\s+/g, "_")],
            metadata: { ...meta, applicant: applicantData },
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
      } else {
        const [row] = await db
          .insert(leads)
          .values({
            tenantId: ctx.tenantId,
            email: applicantEmail,
            name: applicantName,
            source: "job_application",
            tags: ["applicant", roleApplied.toLowerCase().replace(/\s+/g, "_")],
            status: "new",
            metadata: {
              applicant: applicantData,
              createdByWorkerId: ctx.workerId,
              createdViaTool: "track_applicant",
            },
          })
          .returning({ id: leads.id });
        leadId = row.id;
      }

      await logSecurityEvent({
        kind: "applicant.tracked",
        tenantId: ctx.tenantId,
        payload: {
          subject: "applicant.tracked",
          leadId,
          applicantEmail,
          roleApplied,
          pipelineStage,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          leadId,
          applicantEmail,
          roleApplied,
          pipelineStage,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't persist applicant: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
