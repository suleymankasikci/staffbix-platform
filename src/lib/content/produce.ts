import { eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  contentBriefs,
  workers,
  messages,
  conversations,
  type ContentBrief,
} from "../db/schema";
import { loadCatalogRole } from "../roles-server";
import { chatReply } from "../ai/chat";
import { createPending, recordAuto } from "../approvals/runtime";

/**
 * Content production pipeline.
 *
 * Given a content brief, produce one draft per (channel × variant)
 * combination, persist each as an assistant message, and create a
 * worker_action(kind='social_post') for the Approval Center.
 *
 * The worker's autonomy decides whether the actions land 'pending'
 * (owner must approve before publish) or 'auto' (published as soon
 * as the dispatcher runs).
 *
 * Each variant is its own AI call so the model can specialize the
 * voice + length for the channel (a tweet ≠ a LinkedIn post).
 */

const CHANNEL_HINTS: Record<string, string> = {
  twitter: "Twitter / X. Max 280 characters. One idea per post. No hashtags unless requested.",
  linkedin: "LinkedIn. Professional but human voice. 1-3 short paragraphs. Lead with the insight, not the company.",
  instagram: "Instagram caption. Friendly tone. 1-4 sentences. End with a soft call to action when relevant.",
  facebook: "Facebook post. Conversational, slightly longer than Twitter. 2-4 sentences.",
  threads: "Threads (Meta). Casual, short, conversational. Under 500 characters.",
  blog: "Long-form blog draft. Markdown headings. 600-900 words. Lede + 3-5 sections + closing.",
};

export interface ProduceArgs {
  briefId: string;
  tenantId: string;
}

export interface ProduceResult {
  brief: ContentBrief;
  /** One worker_action id per produced draft. */
  actionIds: string[];
}

/**
 * Run the production pipeline for an existing brief.
 *
 * On any error the brief status flips to 'failed' with error_message
 * set and the function re-throws so the caller (worker or API route)
 * sees it.
 */
export async function produceContentForBrief(
  args: ProduceArgs,
): Promise<ProduceResult> {
  const [brief] = await db
    .select()
    .from(contentBriefs)
    .where(eq(contentBriefs.id, args.briefId))
    .limit(1);
  if (!brief) throw new Error(`brief ${args.briefId} not found`);
  if (brief.tenantId !== args.tenantId) {
    throw new Error("tenant mismatch on brief");
  }

  // Load the worker for autonomy + role context.
  const [worker] = await db
    .select()
    .from(workers)
    .where(eq(workers.id, brief.workerId))
    .limit(1);
  if (!worker) throw new Error("worker for brief not found");
  if (worker.status !== "active") {
    throw new Error(`worker is ${worker.status}`);
  }

  // We need a conversation row to anchor the assistant messages — even
  // though "content production" isn't a back-and-forth conversation, the
  // messages table requires conversationId. Use a synthetic per-brief
  // conversation tagged channel='manual'.
  const [convo] = await db
    .insert(conversations)
    .values({
      tenantId: brief.tenantId,
      workerId: brief.workerId,
      channel: "manual",
      externalId: `brief:${brief.id}`,
      status: "open",
      customer: { source: "content_brief", briefId: brief.id },
    })
    .returning();

  // Generate one assistant draft per (channel, variant) cell.
  const role = await loadCatalogRole(worker.roleSlug);
  const variants = Math.max(1, Math.min(10, brief.variantsPerChannel ?? 1));
  const channels = brief.targetChannels.map((c) => c.toLowerCase());
  if (channels.length === 0) {
    throw new Error("brief has no target channels");
  }

  const actionIds: string[] = [];

  try {
    for (const channel of channels) {
      const channelHint = CHANNEL_HINTS[channel] ?? `Channel: ${channel}.`;
      for (let v = 0; v < variants; v++) {
        // The "user message" is a synthetic one we manufacture from
        // the brief — chatReply will treat it as a normal Brand-Bible-
        // grounded turn and produce a fitting draft.
        const userMessage = buildPrompt({
          briefTitle: brief.title,
          briefText: brief.briefText,
          channel,
          channelHint,
          variantIndex: v,
          totalVariants: variants,
          roleTitle: role?.title ?? worker.roleSlug,
          parameters: brief.parameters as Record<string, unknown>,
        });

        const result = await chatReply({
          context: {
            tenantId: brief.tenantId,
            workerId: worker.id,
            workerName: worker.name,
            roleSlug: worker.roleSlug,
            customInstructions: worker.customInstructions,
            conversationId: convo.id,
            modelPin: worker.modelPin,
          },
          history: [],
          userMessage,
        });

        const [msgRow] = await db
          .insert(messages)
          .values({
            tenantId: brief.tenantId,
            conversationId: convo.id,
            role: "assistant",
            content: result.text,
            citedChunkIds: result.citedChunkIds,
            model: result.model,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            latencyMs: result.latencyMs,
          })
          .returning();

        const actionInput = {
          tenantId: brief.tenantId,
          workerId: worker.id,
          conversationId: convo.id,
          draftMessageId: msgRow.id,
          kind: "social_post" as const,
          content: result.text,
          payload: {
            channel,
            variantIndex: v,
            briefId: brief.id,
          },
        };
        const action =
          worker.autonomy === "auto"
            ? await recordAuto(actionInput)
            : await createPending(actionInput);
        actionIds.push(action.id);
      }
    }

    const [updated] = await db
      .update(contentBriefs)
      .set({
        status: "ready",
        actionIds,
        updatedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(contentBriefs.id, brief.id))
      .returning();

    return { brief: updated, actionIds };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(contentBriefs)
      .set({
        status: "failed",
        errorMessage: msg.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(contentBriefs.id, brief.id));
    throw err;
  }
}

/**
 * Per-variant "angle" hints. Rotating these makes variants distinct
 * by construction — even at temperature 0 the model would diverge
 * because the system prompt is different.
 */
const VARIANT_ANGLES = [
  "Lead with a concrete customer benefit, not the brand or product name.",
  "Lead with a single specific detail (material, color, price, hours) — show, don't tell.",
  "Lead with a question or invitation that pulls the reader in.",
  "Lead with the founder's perspective or origin-story angle.",
  "Lead with a contrast: what makes this different from alternatives.",
];

function buildPrompt(args: {
  briefTitle: string;
  briefText: string;
  channel: string;
  channelHint: string;
  variantIndex: number;
  totalVariants: number;
  roleTitle: string;
  parameters: Record<string, unknown>;
}): string {
  let variantLine = "";
  if (args.totalVariants > 1) {
    const angle = VARIANT_ANGLES[args.variantIndex % VARIANT_ANGLES.length];
    variantLine = `\nVariant ${args.variantIndex + 1} of ${args.totalVariants}.
Angle for THIS variant: ${angle}
This variant MUST be materially different from any other variant of this brief — different lede, different framing, do not paraphrase yourself.`;
  }

  const paramLines: string[] = [];
  if (typeof args.parameters.tone === "string") {
    paramLines.push(`Tone: ${args.parameters.tone}`);
  }
  if (typeof args.parameters.audience === "string") {
    paramLines.push(`Audience: ${args.parameters.audience}`);
  }
  if (Array.isArray(args.parameters.must_mention)) {
    paramLines.push(
      `Must mention: ${(args.parameters.must_mention as string[]).join(", ")}`,
    );
  }
  if (Array.isArray(args.parameters.avoid)) {
    paramLines.push(`Avoid: ${(args.parameters.avoid as string[]).join(", ")}`);
  }
  const paramBlock = paramLines.length > 0 ? `\n\n${paramLines.join("\n")}` : "";

  return `Brief: ${args.briefTitle}

${args.briefText}${paramBlock}

Channel guidance:
${args.channelHint}${variantLine}

Write the post. The Brand Bible above is the source of facts (products, prices, hours, tone rules). If the brief names a specific product or feature, mention it by name somewhere in the post. Return ONLY the post text — no quotes, no preamble, no "Here is a draft:". Begin with the first word of the post.`;
}
