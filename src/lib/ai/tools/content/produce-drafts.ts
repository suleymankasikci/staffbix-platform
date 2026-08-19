import type { Tool } from "../types";
import { produceContentForBrief } from "@/lib/content/produce";

/**
 * produce_drafts — generate one draft per (channel × variant) cell of
 * a content brief. Wraps Sprint 8's `produceContentForBrief` runtime
 * which:
 *
 *   1. Spawns a synthetic conversation tagged channel='manual'
 *      external_id='brief:<id>'
 *   2. For each (channel, variant) makes a chat call with channel-
 *      specific tone hints (twitter ≤ 280, LinkedIn paragraph form,
 *      blog full draft, etc.)
 *   3. Persists each draft as messages.role='assistant'
 *   4. Creates a worker_action(kind='social_post' or 'web_reply'
 *      depending on channel) per draft, autonomy-aware status
 *
 * Suggest mode → tool refuses; the model is asked to inline 1 sample
 * draft per channel in its conversational reply.
 *
 * Calling produce_drafts on a brief that's already produced is a no-op
 * by virtue of the brief.status check inside the runtime.
 */

export const produceDraftsTool: Tool = {
  name: "produce_drafts",
  description:
    "Generate drafts for a content brief — one per (channel × variant). Pass the briefId returned by create_content_brief. Returns the worker_action ids you can reference back to the operator. Refuses in 'suggest' autonomy mode (model should inline a sample draft instead).",
  parameters: {
    type: "object",
    properties: {
      briefId: { type: "string", description: "Brief id from create_content_brief." },
    },
    required: ["briefId"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const briefId = String(args.briefId);

    if (!/^[0-9a-f-]{36}$/.test(briefId)) {
      return { ok: false, refused: true, reason: "briefId is not a UUID." };
    }
    if (ctx.autonomy === "suggest") {
      return {
        ok: false,
        refused: true,
        reason:
          "Worker is in 'suggest' mode — write 1 sample draft per channel inline in your reply instead of generating the full set. The owner picks one and runs the rest manually.",
      };
    }

    try {
      const result = await produceContentForBrief({
        tenantId: ctx.tenantId,
        briefId,
      });
      return {
        ok: true,
        data: {
          briefId,
          briefStatus: result.brief.status,
          actionIds: result.actionIds,
          totalDrafts: result.actionIds.length,
          autonomy: ctx.autonomy,
          willPublish: ctx.autonomy === "auto" ? "immediately" : "after owner approval",
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        refused: true,
        reason: `Couldn't produce drafts: ${msg}`,
      };
    }
  },
};
