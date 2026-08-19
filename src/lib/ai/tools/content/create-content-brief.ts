import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { contentBriefs } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * create_content_brief — register a new content brief in DB. The model
 * structures the request (title + scope + target channels + tone /
 * audience parameters) before any draft is produced, so an operator
 * can audit "what was the AI asked to write?" before seeing the actual
 * output.
 *
 * Brief ↔ draft separation matches Sprint 8's pipeline: a brief is the
 * INSTRUCTION; drafts are the OUTPUT. One brief → many drafts (variant
 * count + channel count).
 */

const CHANNELS = [
  "blog",
  "landing",
  "twitter",
  "linkedin",
  "facebook",
  "instagram",
  "email",
  // Community channels (Sprint 27): the brief shape is the same — a
  // post body the operator will publish into Discord / Slack /
  // Discourse. produce.ts has channel-tone hints; community channels
  // fall back to the default prompt for now.
  "discord",
  "slack",
  "discourse",
] as const;

export const createContentBriefTool: Tool = {
  name: "create_content_brief",
  description:
    "Register a content brief in the database BEFORE drafting anything. Captures what the operator wants written (title, scope, channels, tone, audience). Returns briefId you'll pass to produce_drafts.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "1-line operator-facing label for the brief ('Spring sale launch posts').",
      },
      briefText: {
        type: "string",
        description:
          "The actual writing brief — what's the topic, what's the angle, what action should the reader take? Be specific; this feeds the drafting prompt.",
      },
      targetChannels: {
        type: "array",
        description: "Which channels to produce drafts for.",
        items: { type: "string", enum: CHANNELS },
      },
      variantsPerChannel: {
        type: "integer",
        description: "How many alternative drafts per channel.",
        minimum: 1,
        maximum: 5,
      },
      tone: {
        type: "string",
        description: "Tone descriptor ('warm + factual', 'playful', 'authoritative'). Persisted in parameters.",
      },
      audience: {
        type: "string",
        description: "Who is the reader? Industry / role / company size hint.",
      },
      restrictedTopics: {
        type: "array",
        description: "Topics the worker must NOT mention (competitor names, pending features, regulated claims).",
        items: { type: "string" },
      },
    },
    required: ["title", "briefText", "targetChannels", "variantsPerChannel"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const title = String(args.title).trim();
    const briefText = String(args.briefText).trim();
    const targetChannels = Array.isArray(args.targetChannels)
      ? (args.targetChannels as string[]).filter((c) =>
          (CHANNELS as readonly string[]).includes(c),
        )
      : [];
    const variantsPerChannel = Math.max(
      1,
      Math.min(5, Number(args.variantsPerChannel ?? 1)),
    );
    const tone = args.tone ? String(args.tone) : null;
    const audience = args.audience ? String(args.audience) : null;
    const restrictedTopics = Array.isArray(args.restrictedTopics)
      ? (args.restrictedTopics as string[])
      : [];

    if (title.length === 0) return { ok: false, refused: true, reason: "title is required." };
    if (briefText.length < 20)
      return { ok: false, refused: true, reason: "briefText too short — need ≥20 chars." };
    if (targetChannels.length === 0)
      return {
        ok: false,
        refused: true,
        reason: `targetChannels is empty or has invalid values. Allowed: ${CHANNELS.join(", ")}`,
      };

    try {
      const [row] = await db
        .insert(contentBriefs)
        .values({
          tenantId: ctx.tenantId,
          workerId: ctx.workerId,
          title,
          briefText,
          targetChannels,
          variantsPerChannel,
          status: "drafting",
          parameters: {
            tone,
            audience,
            restrictedTopics,
            createdViaTool: "create_content_brief",
            conversationId: ctx.conversationId,
          },
        })
        .returning({ id: contentBriefs.id });

      await logSecurityEvent({
        kind: "content.brief.created",
        tenantId: ctx.tenantId,
        payload: {
          subject: "content.brief.created",
          briefId: row.id,
          title,
          targetChannels,
          variantsPerChannel,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          briefId: row.id,
          status: "drafting",
          recommendedNextStep: "produce_drafts",
          totalDrafts: targetChannels.length * variantsPerChannel,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't persist the brief: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
