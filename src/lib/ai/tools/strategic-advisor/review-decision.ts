import { and, eq, desc, sql } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { securityEvents } from "@/lib/db/schema";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * review_decision — Strategic Advisor's signature tool. The operator
 * proposes a decision; the Advisor returns:
 *   - sharpQuestions[]: 3 hard questions to answer BEFORE deciding
 *   - contradictions[]: places this conflicts with past decisions
 *   - alternativePath: one direction the operator likely hasn't
 *     considered
 *   - counterPosition: even if the Advisor agrees, the strongest case
 *     against the proposal
 *   - confidence
 *
 * The Advisor pulls the last 25 logged decisions (via the same
 * ceo.decision.logged event used by CEO Advisor) so contradictions
 * can be grounded in actual history rather than invented.
 */

const MODEL = "gpt-4o-mini";
const MIN_PROPOSAL_LEN = 30;
const MAX_PROPOSAL_LEN = 4000;
const PUSHBACK_LEVELS = ["gentle", "balanced", "blunt"] as const;
const RECENT_DECISIONS_K = 25;

export const reviewDecisionTool: Tool = {
  name: "review_decision",
  description:
    "Strategic Advisor's signature move: take a decision the operator is considering, ask 3 sharp questions, surface any contradictions with past logged decisions, offer one alternative path, and articulate the strongest counter-position. Use this whenever the operator says 'I'm thinking about X — what do you think?'",
  parameters: {
    type: "object",
    properties: {
      proposal: {
        type: "string",
        description:
          "What is the operator considering? Include the decision + the reasoning they're using.",
      },
      focusArea: {
        type: "string",
        description:
          "Optional lens: product, sales, hiring, finance, marketing, operations.",
      },
      pushbackLevel: {
        type: "string",
        description: "How directly to challenge the operator.",
        enum: PUSHBACK_LEVELS,
      },
    },
    required: ["proposal"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const proposal = String(args.proposal).trim();
    const focusArea = args.focusArea ? String(args.focusArea).trim() : "";
    const pushbackLevel = ((args.pushbackLevel as string) ?? "balanced").toLowerCase();

    if (!(PUSHBACK_LEVELS as readonly string[]).includes(pushbackLevel)) {
      return {
        ok: false,
        refused: true,
        reason: `pushbackLevel must be one of: ${PUSHBACK_LEVELS.join(", ")}`,
      };
    }
    if (proposal.length < MIN_PROPOSAL_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `proposal too short (need ≥${MIN_PROPOSAL_LEN} chars).`,
      };
    }
    if (proposal.length > MAX_PROPOSAL_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `proposal too long (max ${MAX_PROPOSAL_LEN} chars).`,
      };
    }

    // Pull recent logged decisions for contradiction grounding.
    const pastRows = await db
      .select({
        createdAt: securityEvents.createdAt,
        payload: securityEvents.payload,
      })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.tenantId, ctx.tenantId),
          sql`(${securityEvents.payload}->>'subject') = 'ceo.decision.logged'`,
        ),
      )
      .orderBy(desc(securityEvents.createdAt))
      .limit(RECENT_DECISIONS_K);

    const pastBlock =
      pastRows.length > 0
        ? pastRows
            .map((r, i) => {
              const p = (r.payload as Record<string, unknown>) ?? {};
              return `[D${i + 1} · ${r.createdAt instanceof Date ? r.createdAt.toISOString().slice(0, 10) : "?"} · ${p.topic ?? ""}]\nDecision: ${p.decision ?? ""}\nRationale: ${p.rationale ?? ""}\nOutcome: ${p.outcome ?? "pending"}`;
            })
            .join("\n\n")
        : "(no past decisions logged — base review on the proposal alone)";

    const bbHits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: proposal.slice(0, 500),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      bbHits.length > 0
        ? bbHits
            .map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`)
            .join("\n\n")
        : "(no Brand Bible matches)";

    const pushbackStyle =
      pushbackLevel === "blunt"
        ? "Be sharp. Question framing, not just options. If the operator is rationalising, name it."
        : pushbackLevel === "gentle"
          ? "Frame challenges as 'have you considered' questions, not assertions."
          : "Challenge respectfully. Identify the strongest objection even if you ultimately agree.";

    const systemPrompt = [
      "You are the Strategic Advisor. You review decisions the operator is considering.",
      "Output STRICT JSON: { sharpQuestions, contradictions, alternativePath, counterPosition, confidence }.",
      "sharpQuestions: exactly 3. Each ≤25 words. The questions the operator should answer BEFORE deciding.",
      "contradictions: 0-3 specific conflicts with past decisions (cite by topic). Empty array if none.",
      "alternativePath: 1-2 sentences describing one direction the operator likely hasn't considered.",
      "counterPosition: 1-2 sentences — the strongest case AGAINST the proposal, even if you agree.",
      "confidence: 'low' | 'medium' | 'high' — how confident you are in your review.",
      `Style: ${pushbackStyle}`,
      "Past decisions (most recent first):",
      pastBlock,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = focusArea
      ? `Focus area: ${focusArea}\n\nProposal:\n${proposal}`
      : `Proposal:\n${proposal}`;

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 900,
        temperature: 0.35,
        response_format: { type: "json_object" },
      });

      await recordAiUsage({
        tenantId: ctx.tenantId,
        workerId: ctx.workerId,
        conversationId: ctx.conversationId,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - t0,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      await logSecurityEvent({
        kind: "sa.review.generated",
        tenantId: ctx.tenantId,
        payload: {
          subject: "sa.review.generated",
          proposalPreview: proposal.slice(0, 160),
          focusArea: focusArea || null,
          pushbackLevel,
          pastDecisionsConsidered: pastRows.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          sharpQuestions: Array.isArray(parsed.sharpQuestions)
            ? (parsed.sharpQuestions as string[])
            : [],
          contradictions: Array.isArray(parsed.contradictions)
            ? (parsed.contradictions as string[])
            : [],
          alternativePath:
            typeof parsed.alternativePath === "string" ? parsed.alternativePath : "",
          counterPosition:
            typeof parsed.counterPosition === "string" ? parsed.counterPosition : "",
          confidence:
            typeof parsed.confidence === "string"
              ? (parsed.confidence as string)
              : "medium",
          pushbackLevel,
          pastDecisionsConsidered: pastRows.length,
          brandBibleChunkIds: bbHits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Decision review failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
