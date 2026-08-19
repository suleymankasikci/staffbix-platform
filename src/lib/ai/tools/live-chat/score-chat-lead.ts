import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_chat_lead_intent — classify a chat transcript and surface
 * qualification signals. Output JSON:
 *   - intent: 'browser' | 'researching' | 'ready_to_buy' | 'support' |
 *     'spam' | 'other'
 *   - qualification: { budget, timeline, decisionMaker } — values 'yes'
 *     | 'no' | 'unknown'
 *   - extractedContact: { name, email, phone, company } — verbatim only
 *   - recommendedNextStep: enum
 *   - confidence
 *
 * The model NEVER drafts the actual reply — it only triages the chat.
 */

const MODEL = "gpt-4o-mini";

const NEXT_STEPS = [
  "qualify_more",
  "book_demo",
  "send_pricing_pdf",
  "handoff_to_human",
  "deflect_to_docs",
  "mark_spam",
] as const;

const MIN_TRANSCRIPT_LEN = 10;
const MAX_TRANSCRIPT_LEN = 4000;

export const scoreChatLeadIntentTool: Tool = {
  name: "score_chat_lead_intent",
  description:
    "Classify a web chat transcript: intent, qualification (budget/timeline/decisionMaker), extracted contact, recommended next step. NEVER drafts the reply.",
  parameters: {
    type: "object",
    properties: {
      transcript: {
        type: "string",
        description: "Chat transcript with speaker labels. ≤4000 chars.",
      },
      pageContextSummary: {
        type: "string",
        description: "Optional 1-line page context.",
      },
    },
    required: ["transcript"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const transcript = String(args.transcript).trim();
    const pageContextSummary = args.pageContextSummary
      ? String(args.pageContextSummary).trim().slice(0, 200)
      : "";

    if (transcript.length < MIN_TRANSCRIPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `transcript too short (need ≥${MIN_TRANSCRIPT_LEN} chars).`,
      };
    }
    if (transcript.length > MAX_TRANSCRIPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `transcript too long (max ${MAX_TRANSCRIPT_LEN} chars).`,
      };
    }

    const systemPrompt = [
      "You are triaging a web chat transcript for the live-chat agent.",
      "Output STRICT JSON: { intent, qualification, extractedContact, recommendedNextStep, confidence }.",
      "intent: 'browser' | 'researching' | 'ready_to_buy' | 'support' | 'spam' | 'other'.",
      "qualification: { budget, timeline, decisionMaker } — each 'yes' | 'no' | 'unknown'.",
      "extractedContact: { name, email, phone, company } — verbatim from transcript ONLY; empty strings for missing.",
      `recommendedNextStep: one of: ${NEXT_STEPS.join(", ")}.`,
      "confidence: 'low' | 'medium' | 'high'.",
      "ABSOLUTE RULES:",
      "  - NEVER draft the agent's reply.",
      "  - NEVER invent contact details / budget / timeline values not in transcript.",
      pageContextSummary ? `pageContext: ${pageContextSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        max_tokens: 500,
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

      const intent =
        typeof parsed.intent === "string" &&
        ["browser", "researching", "ready_to_buy", "support", "spam", "other"].includes(
          parsed.intent as string,
        )
          ? (parsed.intent as string)
          : "other";

      const qualRaw =
        typeof parsed.qualification === "object" && parsed.qualification !== null
          ? (parsed.qualification as Record<string, unknown>)
          : {};
      const normTri = (v: unknown): "yes" | "no" | "unknown" =>
        typeof v === "string" && ["yes", "no", "unknown"].includes(v)
          ? (v as "yes" | "no" | "unknown")
          : "unknown";
      const qualification = {
        budget: normTri(qualRaw.budget),
        timeline: normTri(qualRaw.timeline),
        decisionMaker: normTri(qualRaw.decisionMaker),
      };

      const contactRaw =
        typeof parsed.extractedContact === "object" &&
        parsed.extractedContact !== null
          ? (parsed.extractedContact as Record<string, unknown>)
          : {};
      const extractedContact = {
        name: typeof contactRaw.name === "string" ? contactRaw.name : "",
        email: typeof contactRaw.email === "string" ? contactRaw.email : "",
        phone: typeof contactRaw.phone === "string" ? contactRaw.phone : "",
        company:
          typeof contactRaw.company === "string" ? contactRaw.company : "",
      };

      const recommendedNextStep =
        typeof parsed.recommendedNextStep === "string" &&
        (NEXT_STEPS as readonly string[]).includes(
          parsed.recommendedNextStep as string,
        )
          ? (parsed.recommendedNextStep as string)
          : "qualify_more";

      const confidence =
        typeof parsed.confidence === "string" &&
        ["low", "medium", "high"].includes(parsed.confidence as string)
          ? (parsed.confidence as string)
          : "medium";

      await logSecurityEvent({
        kind: "livechat.intent.scored",
        tenantId: ctx.tenantId,
        payload: {
          subject: "livechat.intent.scored",
          intent,
          recommendedNextStep,
          confidence,
          hasEmail: extractedContact.email.length > 0,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          intent,
          qualification,
          extractedContact,
          recommendedNextStep,
          confidence,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Chat scoring failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
