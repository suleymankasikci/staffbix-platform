import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { supportTickets } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * create_it_ticket — register an internal IT-support request. Uses the
 * existing `support_tickets` table with channel='in_app'. The IT Helper
 * role assigns priority based on the reported impact + scope.
 *
 * Priority guidance the model gets via tool description:
 *   - critical: production down for many users, security incident
 *   - high: degraded but workable, OR critical risk for one VIP user
 *   - normal: single user can't work, no broader impact
 *   - low: cosmetic, eventual fix
 */

const CATEGORIES = [
  "access",
  "device_hardware",
  "software_install",
  "vpn_network",
  "email_calendar",
  "security_incident",
  "data_recovery",
  "other",
] as const;

const PRIORITIES = ["critical", "high", "normal", "low"] as const;

export const createItTicketTool: Tool = {
  name: "create_it_ticket",
  description:
    "Open an internal IT support ticket. Use this when an employee reports a problem you can't immediately solve in chat (broken laptop, locked account, security incident). Returns the ticket code so you can reference it in the reply.",
  parameters: {
    type: "object",
    properties: {
      reporterEmail: {
        type: "string",
        description: "Employee's email — the person reporting the issue.",
      },
      reporterName: {
        type: "string",
        description: "Employee's name.",
      },
      category: {
        type: "string",
        enum: CATEGORIES,
        description: "Which IT category does this fall under?",
      },
      priority: {
        type: "string",
        enum: PRIORITIES,
        description:
          "critical (production-impacting / security), high (degraded but workable / VIP), normal (single-user can't work), low (cosmetic).",
      },
      subject: {
        type: "string",
        description: "1-line summary the IT team sees in their queue.",
      },
      description: {
        type: "string",
        description:
          "Full description: what the employee tried, error messages, when it started, urgency.",
      },
    },
    required: ["reporterEmail", "reporterName", "category", "priority", "subject", "description"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const reporterEmail = String(args.reporterEmail).trim().toLowerCase();
    const reporterName = String(args.reporterName).trim();
    const category = String(args.category);
    const priority = String(args.priority);
    const subject = String(args.subject).trim();
    const description = String(args.description).trim();

    if (!reporterEmail.includes("@")) {
      return { ok: false, refused: true, reason: "reporterEmail malformed." };
    }
    if (!(CATEGORIES as readonly string[]).includes(category)) {
      return {
        ok: false,
        refused: true,
        reason: `category must be one of: ${CATEGORIES.join(", ")}`,
      };
    }
    if (!(PRIORITIES as readonly string[]).includes(priority)) {
      return {
        ok: false,
        refused: true,
        reason: `priority must be one of: ${PRIORITIES.join(", ")}`,
      };
    }
    if (subject.length < 5) {
      return { ok: false, refused: true, reason: "subject too short." };
    }
    if (description.length < 15) {
      return {
        ok: false,
        refused: true,
        reason: "description too short — IT needs context to triage.",
      };
    }

    // Build a pretty code: TKT-<timestamp-based 6-digit> — collision
    // risk is negligible for the per-tenant volume we expect; if it
    // does collide the unique-index retry surfaces as a Postgres error
    // the model can read.
    const code = `IT-${Date.now().toString().slice(-8)}`;

    try {
      const [row] = await db
        .insert(supportTickets)
        .values({
          tenantId: ctx.tenantId,
          code,
          subject,
          bodyPreview: description.slice(0, 400),
          channel: "in_app",
          priority: priority as (typeof PRIORITIES)[number],
          status: "open",
          reporterEmail,
          reporterName,
          triage: {
            createdByWorkerId: ctx.workerId,
            createdViaTool: "create_it_ticket",
            itCategory: category,
            fullDescription: description,
          },
        })
        .returning({ id: supportTickets.id, code: supportTickets.code });

      await logSecurityEvent({
        kind: "it.ticket.opened",
        tenantId: ctx.tenantId,
        payload: {
          subject: "it.ticket.opened",
          ticketId: row.id,
          ticketCode: row.code,
          itCategory: category,
          priority,
          reporterEmail,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          ticketId: row.id,
          ticketCode: row.code,
          status: "open",
          priority,
          reporterEmail,
          confirmationToUser: `I've opened ${row.code} — IT will follow up via email shortly. Priority: ${priority}.`,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't create ticket: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
