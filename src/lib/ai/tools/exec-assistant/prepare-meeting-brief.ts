import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * prepare_meeting_brief — generate a short pre-read for an upcoming
 * meeting. Pulls relevant chunks from the Brand Bible + the operator's
 * supplied context to produce: TLDR, 3-5 talking points, 2-3 risks,
 * suggested next step.
 *
 * The exec reads this on their phone walking into the meeting — it
 * should fit on one screen.
 */

const MODEL = "gpt-4o-mini";

export const prepareMeetingBriefTool: Tool = {
  name: "prepare_meeting_brief",
  description:
    "Generate a 1-page pre-read for a meeting. Returns TLDR, talking points, risks, suggested next step. Use this when the operator says 'I have a call with X about Y in an hour, brief me'.",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "What is the meeting about? One line — 'pricing review with Acme', 'team OKRs Q3'.",
      },
      attendees: {
        type: "array",
        description: "Who's in the room (names + roles).",
        items: { type: "string" },
      },
      contextText: {
        type: "string",
        description:
          "Operator-supplied context: prior email thread, prior meeting notes, customer's situation. The model integrates this with what it pulls from Brand Bible.",
      },
      durationMinutes: {
        type: "integer",
        description: "Meeting length, helps shape brief depth.",
        minimum: 5,
        maximum: 240,
      },
    },
    required: ["topic", "attendees", "contextText"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const topic = String(args.topic).trim();
    const attendees = Array.isArray(args.attendees)
      ? (args.attendees as string[]).filter(Boolean)
      : [];
    const contextText = String(args.contextText).trim();
    const durationMinutes = Number(args.durationMinutes ?? 30);

    if (topic.length < 5) {
      return { ok: false, refused: true, reason: "topic too short." };
    }
    if (attendees.length === 0) {
      return { ok: false, refused: true, reason: "attendees required (at least one)." };
    }
    if (contextText.length < 20) {
      return { ok: false, refused: true, reason: "contextText too short — provide some background." };
    }

    // Pull Brand Bible context relevant to the topic.
    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${topic} ${contextText}`.slice(0, 500),
      k: 4,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches found)";

    const systemPrompt = [
      "You are preparing a 1-page pre-read for the operator's meeting.",
      "Output STRICT JSON: { tldr, talkingPoints, risks, suggestedNextStep }.",
      "tldr: 1-2 sentence summary.",
      "talkingPoints: 3-5 bullets, each ≤20 words.",
      "risks: 2-3 things that could go wrong / push-back points.",
      "suggestedNextStep: 1 sentence — what should leave the room as a commitment.",
      "Ground all factual claims in Brand Bible context below. If a claim isn't supported, omit it.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `Topic: ${topic}`,
      `Attendees: ${attendees.join(", ")}`,
      `Duration: ${durationMinutes} min`,
      "",
      "Operator context:",
      contextText,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 800,
        temperature: 0.4,
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
        kind: "meeting.brief.generated",
        tenantId: ctx.tenantId,
        payload: {
          subject: "meeting.brief.generated",
          topic,
          attendeeCount: attendees.length,
          durationMinutes,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          topic,
          attendees,
          durationMinutes,
          tldr: typeof parsed.tldr === "string" ? parsed.tldr : "",
          talkingPoints: Array.isArray(parsed.talkingPoints)
            ? (parsed.talkingPoints as string[])
            : [],
          risks: Array.isArray(parsed.risks) ? (parsed.risks as string[]) : [],
          suggestedNextStep:
            typeof parsed.suggestedNextStep === "string" ? parsed.suggestedNextStep : "",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Brief generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
