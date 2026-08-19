import { and, eq, ilike } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { brandBibleSources, workerActions } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * propose_kb_update — record a proposed change to a Brand Bible
 * source. The KB Editor NEVER edits the source directly: it always
 * routes through the Approval Center where the operator reviews and
 * either accepts (which triggers Sprint 30+ DB write + re-embed) or
 * rejects (which records the rejection rationale).
 *
 * This is the read-only side of the KB role today; the actual
 * mutation of brand_bible_sources.raw_text plus the re-ingest pipeline
 * happens when the operator approves the proposal in the UI. The Tool
 * here just stages the proposal as a worker_action with kind=
 * 'web_reply' and a custom payload describing what the change is.
 *
 * Why 'web_reply' kind: the existing approvals enum doesn't have a
 * 'kb_update' kind yet (Sprint 30 will add it via migration). Until
 * then we co-opt web_reply with a distinguishing payload.replyType so
 * the Approval Center can render the right preview.
 */

const CHANGE_TYPES = [
  "add_section", // adding new content to an existing source
  "replace_section", // overwriting a specific section
  "remove_section", // deleting content
  "rename_source", // changing the source title
  "new_source", // creating a brand-new source
] as const;

export const proposeKbUpdateTool: Tool = {
  name: "propose_kb_update",
  description:
    "Propose a change to the Brand Bible — never edit directly. The operator reviews in the Approval Center; if approved, the change is applied and the source re-embedded. Use this when you spot stale, missing, or contradictory information.",
  parameters: {
    type: "object",
    properties: {
      changeType: {
        type: "string",
        enum: CHANGE_TYPES,
        description: "What kind of change is this?",
      },
      targetSourceTitle: {
        type: "string",
        description:
          "Existing source title to modify, OR the new source title for change_type='new_source'. Match exactly to an existing source for non-new types.",
      },
      proposedContent: {
        type: "string",
        description:
          "The actual proposed text. For 'add_section' / 'replace_section' / 'new_source', this is the new content. For 'remove_section', describe what to remove. For 'rename_source', this is the new title.",
      },
      reason: {
        type: "string",
        description:
          "Why is this change needed? Cite evidence — a contradicting customer message, an outdated price, a missing FAQ.",
      },
    },
    required: ["changeType", "targetSourceTitle", "proposedContent", "reason"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const changeType = String(args.changeType) as (typeof CHANGE_TYPES)[number];
    const targetSourceTitle = String(args.targetSourceTitle).trim();
    const proposedContent = String(args.proposedContent).trim();
    const reason = String(args.reason).trim();

    if (!(CHANGE_TYPES as readonly string[]).includes(changeType)) {
      return {
        ok: false,
        refused: true,
        reason: `changeType must be one of: ${CHANGE_TYPES.join(", ")}`,
      };
    }
    if (!targetSourceTitle) {
      return { ok: false, refused: true, reason: "targetSourceTitle is required." };
    }
    if (proposedContent.length < 10) {
      return {
        ok: false,
        refused: true,
        reason: "proposedContent too short — at least 10 chars.",
      };
    }
    if (reason.length < 10) {
      return { ok: false, refused: true, reason: "reason too short — explain the WHY." };
    }

    // For non-'new_source' types, the target source must exist.
    let targetSourceId: string | null = null;
    if (changeType !== "new_source") {
      const [source] = await db
        .select({ id: brandBibleSources.id, title: brandBibleSources.title })
        .from(brandBibleSources)
        .where(
          and(
            eq(brandBibleSources.tenantId, ctx.tenantId),
            ilike(brandBibleSources.title, targetSourceTitle),
          ),
        )
        .limit(1);
      if (!source) {
        return {
          ok: false,
          refused: true,
          reason: `No Brand Bible source matches title '${targetSourceTitle}'. Use search_brand_bible to find the correct title, or use changeType='new_source' if it should be a new section.`,
        };
      }
      targetSourceId = source.id;
    }

    if (ctx.autonomy === "suggest") {
      return {
        ok: false,
        refused: true,
        reason:
          "Worker is in 'suggest' mode — describe the proposed change inline in your reply instead of queueing.",
      };
    }

    try {
      const [row] = await db
        .insert(workerActions)
        .values({
          tenantId: ctx.tenantId,
          workerId: ctx.workerId,
          conversationId: ctx.conversationId,
          kind: "web_reply", // co-opted until Sprint 30 'kb_update' kind
          status: ctx.autonomy === "auto" ? "auto" : "pending",
          content: proposedContent,
          payload: {
            replyType: "kb_update_proposal",
            changeType,
            targetSourceTitle,
            targetSourceId,
            reason,
            queuedByTool: "propose_kb_update",
          },
        })
        .returning({ id: workerActions.id });

      await logSecurityEvent({
        kind: "kb.update.proposed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "kb.update.proposed",
          actionId: row.id,
          changeType,
          targetSourceTitle,
          targetSourceId,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          actionId: row.id,
          changeType,
          targetSourceTitle,
          status: ctx.autonomy === "auto" ? "auto" : "pending",
          appliedNote:
            ctx.autonomy === "auto"
              ? "Logged for audit; the actual Brand Bible mutation + re-embed is wired in Sprint 30 — for now it remains a proposal record."
              : "Awaiting operator review in the Approval Center.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't record KB update proposal: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
