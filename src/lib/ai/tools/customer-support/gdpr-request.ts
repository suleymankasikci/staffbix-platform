import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { conversations } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * gdpr_data_request — record a GDPR Article 15-17 request (data access,
 * rectification, erasure / "right to be forgotten") in the audit log
 * and pause the conversation pending human review.
 *
 * Why this is a separate tool from `escalate_to_human`:
 *   GDPR has a STATUTORY 30-day deadline + a structured response
 *   format. The customer's request has to be *recorded with timestamp
 *   and verifiable identifier* — escalation alone isn't enough. This
 *   tool writes a dedicated audit row whose timestamp starts the
 *   30-day clock the platform team can query later.
 *
 *   The AI must NEVER attempt the request itself (e.g. trying to
 *   delete a customer record). Even in `auto` mode this tool only
 *   records + pauses. Sprint 22 adds the operator workflow that
 *   actions the request manually with a checklist.
 */

const GDPR_REQUEST_KINDS = [
  "access",           // Article 15 — "send me a copy of my data"
  "rectification",    // Article 16 — "fix incorrect data about me"
  "erasure",          // Article 17 — "delete me / right to be forgotten"
  "portability",      // Article 20 — "give me my data in machine-readable form"
  "objection",        // Article 21 — "stop processing my data for X"
  "restriction",      // Article 18 — "freeze processing pending dispute"
] as const;

export const gdprRequestTool: Tool = {
  name: "gdpr_data_request",
  description:
    "Record a GDPR data-subject request (access, rectification, erasure, portability, objection, restriction). Call this whenever the customer asks for any of: a copy of their data, deletion of their account, correction of incorrect data, or restriction on data use. NEVER attempt to delete or modify data yourself — this tool only records the request and pauses the conversation for human review (legally required under GDPR).",
  parameters: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        description: "GDPR article this request maps to.",
        enum: GDPR_REQUEST_KINDS,
      },
      customerEmail: {
        type: "string",
        description:
          "Email address the customer gave for verifying identity. If they haven't given one, ask before calling this tool.",
      },
      requestDetails: {
        type: "string",
        description:
          "Verbatim quote or close paraphrase of what the customer is asking for. The legal team reads this — be accurate, not friendly.",
      },
    },
    required: ["kind", "customerEmail", "requestDetails"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const kind = String(args.kind);
    const customerEmail = String(args.customerEmail).trim().toLowerCase();
    const requestDetails = String(args.requestDetails).trim();

    if (!GDPR_REQUEST_KINDS.includes(kind as (typeof GDPR_REQUEST_KINDS)[number])) {
      return {
        ok: false,
        refused: true,
        reason: `kind must be one of: ${GDPR_REQUEST_KINDS.join(", ")}`,
      };
    }
    if (!customerEmail.includes("@")) {
      return {
        ok: false,
        refused: true,
        reason: "customerEmail looks invalid — ask the customer for their account email before recording.",
      };
    }
    if (requestDetails.length < 10) {
      return {
        ok: false,
        refused: true,
        reason: "requestDetails too short — quote the customer's actual ask.",
      };
    }

    const receivedAt = new Date().toISOString();
    const deadlineAt = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();

    try {
      // Pause the conversation — same effect as escalation. Customer's
      // next message stays in the inbox; AI won't auto-reply.
      await db
        .update(conversations)
        .set({ status: "awaiting_human", updatedAt: new Date() })
        .where(eq(conversations.id, ctx.conversationId));

      await logSecurityEvent({
        kind: "gdpr.request.received",
        tenantId: ctx.tenantId,
        payload: {
          subject: "gdpr.request.received",
          gdprKind: kind,
          customerEmail,
          requestDetails: requestDetails.slice(0, 1000),
          receivedAt,
          statutoryDeadline: deadlineAt,
          conversationId: ctx.conversationId,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          recorded: true,
          gdprKind: kind,
          receivedAt,
          statutoryDeadline: deadlineAt,
          conversationStatus: "awaiting_human",
          confirmationToCustomer:
            `I've recorded your ${kind} request from ${customerEmail}. By law we'll respond within 30 days — a teammate will follow up before ${deadlineAt.slice(0, 10)}.`,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't record the GDPR request: ${err instanceof Error ? err.message : String(err)}. Tell the customer to email security@staffbix.com directly.`,
      };
    }
  },
};
