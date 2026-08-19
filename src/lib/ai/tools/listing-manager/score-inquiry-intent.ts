import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_inquiry_intent — given a property inquiry message, classify
 * intent + urgency + extract viewing slots the requester mentioned.
 *
 * Output JSON:
 *   - intent: 'viewing_request' | 'price_question' | 'general' |
 *     'spam' | 'other'
 *   - urgency: 'now' | 'today' | 'this_week' | 'someday'
 *   - language: detected 2-letter code (best effort)
 *   - extractedSlots: [{ rawText, isoStart, isoEnd? }] — only when the
 *     model is confident; otherwise empty.
 *   - extractedContact: { email, phone, name } — only fields the model
 *     can extract verbatim.
 *   - suggestedReplyAngle: ≤25 words (the angle, not the full reply).
 *
 * The tool NEVER drafts the full reply — that stays with the operator
 * (the listing manager defaults to "Approval required").
 */

const MODEL = "gpt-4o-mini";

const MIN_INQUIRY_LEN = 10;
const MAX_INQUIRY_LEN = 4000;

export const scoreInquiryIntentTool: Tool = {
  name: "score_inquiry_intent",
  description:
    "Classify a property-inquiry message: intent, urgency, language, viewing-slot extraction, contact extraction, suggested reply angle. NEVER drafts the full reply.",
  parameters: {
    type: "object",
    properties: {
      inquiryText: { type: "string" },
      receivedAtIso: {
        type: "string",
        description: "When the inquiry was received (ISO). Used to ground 'now' / 'today' urgency.",
      },
      propertyTitle: {
        type: "string",
        description: "Optional: which listing this inquiry refers to.",
      },
    },
    required: ["inquiryText"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const inquiryText = String(args.inquiryText).trim();
    const receivedAtIso = args.receivedAtIso
      ? String(args.receivedAtIso).trim()
      : new Date().toISOString();
    const propertyTitle = args.propertyTitle
      ? String(args.propertyTitle).trim()
      : "";

    if (inquiryText.length < MIN_INQUIRY_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `inquiryText too short (need ≥${MIN_INQUIRY_LEN} chars).`,
      };
    }
    if (inquiryText.length > MAX_INQUIRY_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `inquiryText too long (max ${MAX_INQUIRY_LEN} chars).`,
      };
    }
    if (!Number.isFinite(Date.parse(receivedAtIso))) {
      return {
        ok: false,
        refused: true,
        reason: "receivedAtIso must be a valid ISO 8601 timestamp.",
      };
    }

    const systemPrompt = [
      "You are triaging a property-inquiry message.",
      "Output STRICT JSON: { intent, urgency, language, extractedSlots, extractedContact, suggestedReplyAngle }.",
      "intent: 'viewing_request' | 'price_question' | 'general' | 'spam' | 'other'.",
      "urgency: 'now' | 'today' | 'this_week' | 'someday' — relative to receivedAtIso.",
      "language: best-effort 2-letter language code of the inquiry.",
      "extractedSlots: 0-5 entries of { rawText, isoStart, isoEnd? }. Use ISO 8601. ONLY include slots the inquirer explicitly named (e.g., 'this Friday at 2pm'). Empty array when nothing is specific.",
      "extractedContact: { email, phone, name } — extract verbatim ONLY if explicit in the inquiry. Use empty strings for missing fields.",
      "suggestedReplyAngle: ≤25 words — the angle, not the full reply.",
      "ABSOLUTE RULES:",
      "  - NEVER draft the full reply.",
      "  - NEVER invent contact details, slots, or property facts.",
      `receivedAtIso: ${receivedAtIso}`,
      propertyTitle ? `propertyTitle: ${propertyTitle}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: inquiryText },
        ],
        max_tokens: 700,
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
        ["viewing_request", "price_question", "general", "spam", "other"].includes(
          parsed.intent as string,
        )
          ? (parsed.intent as string)
          : "other";
      const urgency =
        typeof parsed.urgency === "string" &&
        ["now", "today", "this_week", "someday"].includes(
          parsed.urgency as string,
        )
          ? (parsed.urgency as string)
          : "someday";
      const language =
        typeof parsed.language === "string"
          ? (parsed.language as string).toLowerCase().slice(0, 2)
          : "en";

      // Validate extractedSlots ISO timestamps server-side; drop bad entries.
      const rawSlots = Array.isArray(parsed.extractedSlots)
        ? (parsed.extractedSlots as Array<Record<string, unknown>>)
        : [];
      const extractedSlots = rawSlots
        .map((s) => {
          const isoStart =
            typeof s.isoStart === "string" ? (s.isoStart as string) : "";
          const isoEnd = typeof s.isoEnd === "string" ? (s.isoEnd as string) : "";
          if (!Number.isFinite(Date.parse(isoStart))) return null;
          if (isoEnd && !Number.isFinite(Date.parse(isoEnd))) return null;
          return {
            rawText: typeof s.rawText === "string" ? (s.rawText as string) : "",
            isoStart,
            isoEnd: isoEnd || null,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .slice(0, 5);

      const contactRaw =
        typeof parsed.extractedContact === "object" &&
        parsed.extractedContact !== null
          ? (parsed.extractedContact as Record<string, unknown>)
          : {};
      const extractedContact = {
        email: typeof contactRaw.email === "string" ? contactRaw.email : "",
        phone: typeof contactRaw.phone === "string" ? contactRaw.phone : "",
        name: typeof contactRaw.name === "string" ? contactRaw.name : "",
      };

      await logSecurityEvent({
        kind: "listing.inquiry.scored",
        tenantId: ctx.tenantId,
        payload: {
          subject: "listing.inquiry.scored",
          intent,
          urgency,
          language,
          slotsCount: extractedSlots.length,
          hasEmail: extractedContact.email.length > 0,
          hasPhone: extractedContact.phone.length > 0,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          receivedAtIso,
          propertyTitle: propertyTitle || null,
          intent,
          urgency,
          language,
          extractedSlots,
          extractedContact,
          suggestedReplyAngle:
            typeof parsed.suggestedReplyAngle === "string"
              ? (parsed.suggestedReplyAngle as string)
              : "",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Inquiry scoring failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
