import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * triage_live_qa — score a batch of live Q&A questions and return the
 * top N for the host to answer. Each scored question gets:
 *   - relevance: 0-100 (topic alignment)
 *   - urgency: 'now' | 'later' | 'parking_lot'
 *   - sentiment: 'positive' | 'neutral' | 'frustrated' | 'hostile'
 *   - dedupeOf: index of earlier question if duplicate
 *   - suggestedHostAngle: 1-2 sentence answer cue (NOT the full answer)
 *
 * The model NEVER produces a full answer — its job is triage, not
 * answering. The host owns the spoken response.
 */

const MODEL = "gpt-4o-mini";

const MIN_QA = 1;
const MAX_QA = 50;
const MAX_QUESTION_LEN = 1000;

export const triageLiveQaTool: Tool = {
  name: "triage_live_qa",
  description:
    "Triage a batch of live webinar Q&A: score relevance, classify urgency + sentiment, detect duplicates, and surface top-N with suggested host angles. NEVER drafts the spoken answer — that stays with the host.",
  parameters: {
    type: "object",
    properties: {
      sessionTopic: {
        type: "string",
        description: "1-line topic of the webinar so scoring has a reference.",
      },
      questions: {
        type: "array",
        description: "1-50 question entries as plain strings.",
        items: { type: "string" },
      },
      topN: {
        type: "integer",
        description: "How many questions to surface to the host. 1-10. Default 5.",
        minimum: 1,
        maximum: 10,
      },
    },
    required: ["sessionTopic", "questions"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const sessionTopic = String(args.sessionTopic).trim();
    const rawQuestions = Array.isArray(args.questions)
      ? (args.questions as string[])
      : [];
    const questions = rawQuestions
      .map((q) => (typeof q === "string" ? q.trim() : ""))
      .filter((q) => q.length > 0 && q.length <= MAX_QUESTION_LEN);
    const topN = Math.max(1, Math.min(10, Number(args.topN ?? 5)));

    if (sessionTopic.length < 5) {
      return { ok: false, refused: true, reason: "sessionTopic too short." };
    }
    if (questions.length < MIN_QA || questions.length > MAX_QA) {
      return {
        ok: false,
        refused: true,
        reason: `questions must have ${MIN_QA}-${MAX_QA} entries (and each ≤${MAX_QUESTION_LEN} chars).`,
      };
    }

    const systemPrompt = [
      "You are the Webinar Host's triage assistant during a live session.",
      "Output STRICT JSON: { scored, top }.",
      "scored: array — one entry per input question in input order, { index, relevance, urgency, sentiment, dedupeOf, suggestedHostAngle }.",
      "  index: integer matching input position (0-based).",
      "  relevance: integer 0-100 vs sessionTopic.",
      "  urgency: 'now' | 'later' | 'parking_lot'.",
      "  sentiment: 'positive' | 'neutral' | 'frustrated' | 'hostile'.",
      "  dedupeOf: integer index of an earlier question this duplicates, or -1 if unique.",
      "  suggestedHostAngle: ≤25 words — what direction the host should take. NOT a full answer.",
      `top: array of the top ${topN} most-host-worthy question indexes, in priority order (urgency=now > frustrated > high relevance). Exclude duplicates.`,
      "ABSOLUTE RULES:",
      "  - NEVER draft the full spoken answer.",
      "  - NEVER label a question 'hostile' unless it contains insults / threats.",
      `sessionTopic: ${sessionTopic}`,
    ].join("\n");

    const userContent = questions.map((q, i) => `[${i}] ${q}`).join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1500,
        temperature: 0.2,
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

      const rawScored = Array.isArray(parsed.scored)
        ? (parsed.scored as Array<Record<string, unknown>>)
        : [];
      const scored = rawScored
        .map((s, i) => {
          const idx =
            typeof s.index === "number" && Number.isInteger(s.index)
              ? (s.index as number)
              : i;
          const safeIdx =
            idx >= 0 && idx < questions.length ? idx : -1;
          if (safeIdx < 0) return null;
          return {
            index: safeIdx,
            question: questions[safeIdx],
            relevance: Math.max(
              0,
              Math.min(100, Math.round(Number(s.relevance ?? 0))),
            ),
            urgency:
              typeof s.urgency === "string" &&
              ["now", "later", "parking_lot"].includes(s.urgency as string)
                ? (s.urgency as string)
                : "later",
            sentiment:
              typeof s.sentiment === "string" &&
              ["positive", "neutral", "frustrated", "hostile"].includes(
                s.sentiment as string,
              )
                ? (s.sentiment as string)
                : "neutral",
            dedupeOf:
              typeof s.dedupeOf === "number" && Number.isInteger(s.dedupeOf)
                ? (s.dedupeOf as number)
                : -1,
            suggestedHostAngle:
              typeof s.suggestedHostAngle === "string"
                ? (s.suggestedHostAngle as string)
                : "",
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const rawTop = Array.isArray(parsed.top)
        ? (parsed.top as number[])
        : [];
      const top = rawTop
        .map((n) => (Number.isInteger(n) ? n : -1))
        .filter((n) => n >= 0 && n < questions.length)
        .slice(0, topN);

      await logSecurityEvent({
        kind: "webinar.qa.triaged",
        tenantId: ctx.tenantId,
        payload: {
          subject: "webinar.qa.triaged",
          sessionTopic,
          questionsCount: questions.length,
          topNRequested: topN,
          topNReturned: top.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          sessionTopic,
          questionsCount: questions.length,
          topN,
          scored,
          top,
          topQuestions: top.map((i) => ({
            index: i,
            question: questions[i],
            urgency: scored.find((s) => s.index === i)?.urgency ?? "later",
            sentiment: scored.find((s) => s.index === i)?.sentiment ?? "neutral",
            suggestedHostAngle:
              scored.find((s) => s.index === i)?.suggestedHostAngle ?? "",
          })),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Q&A triage failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
