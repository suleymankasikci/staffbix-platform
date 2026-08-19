import type { Tool } from "../types";
import { searchBrandBible } from "@/lib/ai/retrieve";

/**
 * search_brand_bible — explicit retrieval over the Brand Bible. The
 * normal chatReply already does this for every turn automatically, but
 * a KB Editor sometimes wants to *interrogate* the index ("show me
 * every chunk that mentions refunds") rather than answer one question.
 * This tool makes that scriptable.
 *
 * Returns the same RetrievalHit shape the AI runtime uses internally
 * so the model can quote chunks back to the operator verbatim with
 * source titles.
 */

export const searchBrandBibleTool: Tool = {
  name: "search_brand_bible",
  description:
    "Search the Brand Bible for chunks matching a query. Returns up to k results with chunk text + source title. Use this to find existing content BEFORE proposing edits — duplicate sections waste tokens and confuse other workers.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural-language search term — what topic / phrase / policy are you looking up?",
      },
      k: {
        type: "integer",
        description: "How many results to return (1-12). Defaults to 6.",
        minimum: 1,
        maximum: 12,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const query = String(args.query).trim();
    const k = Math.max(1, Math.min(12, Number(args.k ?? 6)));

    if (query.length < 2) {
      return { ok: false, refused: true, reason: "query is too short." };
    }

    try {
      const hits = await searchBrandBible({
        tenantId: ctx.tenantId,
        query,
        k,
        workerId: ctx.workerId,
        conversationId: ctx.conversationId,
      });
      return {
        ok: true,
        data: {
          query,
          count: hits.length,
          hits: hits.map((h) => ({
            chunkId: h.chunkId,
            sourceTitle: h.sourceTitle,
            content: h.content,
          })),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Brand Bible search failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
