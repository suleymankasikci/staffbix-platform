import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_shipping_update_email — produce a customer-facing email for a
 * given shipment situation. Output:
 *   - subject, body, ctaAngle
 *   - apologyTier: 'none' | 'mild' | 'firm' (firm for lost/exception)
 *   - includesTracking: bool (true iff trackingNumber present and the
 *     operator-supplied trackingUrl is in the body verbatim)
 *
 * Hard rules:
 *   - NEVER invent an ETA the operator didn't supply.
 *   - NEVER invent a tracking URL — only use trackingUrl param.
 *   - NEVER guarantee delivery dates or refund amounts.
 */

const MODEL = "gpt-4o-mini";

const SITUATIONS = [
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delay",
  "exception",
  "lost",
  "returned",
] as const;

const MIN_CONTEXT_LEN = 20;
const MAX_CONTEXT_LEN = 2000;

export const draftShippingUpdateEmailTool: Tool = {
  name: "draft_shipping_update_email",
  description:
    "Draft a customer-facing shipping update email. NEVER invents ETAs / tracking URLs / refund amounts. Apology tier scales with situation severity.",
  parameters: {
    type: "object",
    properties: {
      customerName: { type: "string" },
      situation: { type: "string", enum: SITUATIONS },
      shipmentSummary: {
        type: "string",
        description: "1-3 sentences operator-supplied summary of the situation.",
      },
      trackingNumber: { type: "string" },
      trackingUrl: {
        type: "string",
        description: "Operator-supplied carrier tracking URL. The model uses this verbatim or omits it.",
      },
      promisedEtaIso: {
        type: "string",
        description:
          "Only if the operator has a confirmed ETA. Empty/omit = do not mention any date.",
      },
      offerOption: {
        type: "string",
        description:
          "Optional offer text (e.g., 'free reship', 'store credit'). The model uses this verbatim.",
      },
      languageHint: {
        type: "string",
        description: "2-letter target language. Default 'en'.",
      },
    },
    required: ["customerName", "situation", "shipmentSummary"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const customerName = String(args.customerName).trim();
    const situation = String(args.situation);
    const shipmentSummary = String(args.shipmentSummary).trim();
    const trackingNumber = args.trackingNumber
      ? String(args.trackingNumber).trim()
      : "";
    const trackingUrl = args.trackingUrl ? String(args.trackingUrl).trim() : "";
    const promisedEtaIso = args.promisedEtaIso
      ? String(args.promisedEtaIso).trim()
      : "";
    const offerOption = args.offerOption ? String(args.offerOption).trim() : "";
    const languageHint = args.languageHint
      ? String(args.languageHint).trim().toLowerCase().slice(0, 2)
      : "en";

    if (!(SITUATIONS as readonly string[]).includes(situation)) {
      return {
        ok: false,
        refused: true,
        reason: `situation must be one of: ${SITUATIONS.join(", ")}`,
      };
    }
    if (customerName.length < 1) {
      return { ok: false, refused: true, reason: "customerName required." };
    }
    if (shipmentSummary.length < MIN_CONTEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `shipmentSummary too short (need ≥${MIN_CONTEXT_LEN} chars).`,
      };
    }
    if (shipmentSummary.length > MAX_CONTEXT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `shipmentSummary too long (max ${MAX_CONTEXT_LEN} chars).`,
      };
    }
    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
      return {
        ok: false,
        refused: true,
        reason: "trackingUrl must start with http:// or https://",
      };
    }
    if (promisedEtaIso && !Number.isFinite(Date.parse(promisedEtaIso))) {
      return {
        ok: false,
        refused: true,
        reason: "promisedEtaIso must be a valid ISO 8601 timestamp.",
      };
    }

    const apologyTier =
      situation === "delivered" || situation === "out_for_delivery" || situation === "in_transit"
        ? "none"
        : situation === "delay" || situation === "returned"
          ? "mild"
          : "firm";

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `shipping email voice ${situation}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      `You are drafting a customer-facing shipping email in language '${languageHint}'.`,
      "Output STRICT JSON: { subject, body, ctaAngle, apologyTier, complianceFlags }.",
      "subject: ≤60 chars.",
      "body: ≤180 words. Plain conversational. NEVER references an ETA unless promisedEtaIso is supplied. NEVER invents a tracking URL.",
      "ctaAngle: ≤25 chars (e.g., 'Track package', 'Reply with new address').",
      `apologyTier: '${apologyTier}'. Match the body tone.`,
      "complianceFlags: 0-3 strings — surface anything borderline.",
      "ABSOLUTE RULES:",
      "  - NEVER invent dates, refund amounts, or delivery promises.",
      "  - NEVER invent URLs.",
      "  - NEVER guarantee carrier behavior.",
      trackingNumber
        ? `Tracking number to mention verbatim: ${trackingNumber}`
        : "No tracking number to mention.",
      trackingUrl
        ? `Tracking URL to use verbatim: ${trackingUrl}`
        : "No tracking URL — do NOT invent one.",
      promisedEtaIso
        ? `Confirmed ETA (operator-supplied): ${promisedEtaIso}. Mention it cleanly.`
        : "No ETA supplied — DO NOT mention a delivery date.",
      offerOption ? `Operator-offered remedy: ${offerOption}` : "",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `customerName: ${customerName}\n\nshipmentSummary:\n${shipmentSummary}`,
          },
        ],
        max_tokens: 700,
        temperature: 0.25,
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

      const body = typeof parsed.body === "string" ? parsed.body : "";
      const includesTracking =
        trackingUrl.length > 0 && body.includes(trackingUrl);

      // Server-side: if body contains an http(s) URL that isn't
      // trackingUrl, flag it.
      const complianceFlags = Array.isArray(parsed.complianceFlags)
        ? (parsed.complianceFlags as string[])
        : [];
      const urlMatches = body.match(/https?:\/\/\S+/g) ?? [];
      for (const u of urlMatches) {
        if (u !== trackingUrl) {
          complianceFlags.push(`Body contains unexpected URL: ${u}`);
        }
      }
      // If no ETA was supplied but the body looks like it commits to one.
      if (!promisedEtaIso && /\b(by|on)\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|\d{1,2}\/\d{1,2}|\d{1,2}\s+\w+)/i.test(body)) {
        complianceFlags.push(
          "Body may reference a delivery date despite no promisedEtaIso. Operator should verify.",
        );
      }

      await logSecurityEvent({
        kind: "logistics.email.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "logistics.email.drafted",
          situation,
          apologyTier,
          hasTrackingUrl: Boolean(trackingUrl),
          hasPromisedEta: Boolean(promisedEtaIso),
          complianceFlagsCount: complianceFlags.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          customerName,
          situation,
          apologyTier,
          subject: typeof parsed.subject === "string" ? parsed.subject : "",
          body,
          ctaAngle: typeof parsed.ctaAngle === "string" ? parsed.ctaAngle : "",
          includesTracking,
          complianceFlags,
          notForSend:
            "Draft only. Operator approves before any send to the customer.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Shipping email draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
