import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * compose_greeting — produce a short context-aware greeting for a web
 * visitor. The greeting:
 *   - references the page they're on (verbatim title only — never
 *     invents pricing / claims)
 *   - is ≤120 chars (mobile-friendly)
 *   - offers a single light-touch CTA (qualify Q, schedule, watch demo)
 *
 * Hard rules: NEVER references the visitor's email/phone/name unless
 * supplied explicitly; NEVER invents pricing or claims.
 */

const MODEL = "gpt-4o-mini";

const PAGE_KINDS = [
  "home",
  "pricing",
  "product_features",
  "blog_post",
  "case_study",
  "docs",
  "signup",
  "checkout",
  "other",
] as const;

const CTA_OPTIONS = [
  "ask_qualifying_question",
  "offer_demo_link",
  "offer_callback",
  "ask_what_brought_you_here",
  "no_cta_just_friendly",
] as const;

const MIN_TITLE_LEN = 3;
const MAX_TITLE_LEN = 200;

export const composeGreetingTool: Tool = {
  name: "compose_greeting",
  description:
    "Compose a short (≤120 chars) context-aware web chat greeting. References the page title verbatim. NEVER invents pricing or claims. Picks one of the operator-allowed CTAs.",
  parameters: {
    type: "object",
    properties: {
      pageKind: { type: "string", enum: PAGE_KINDS },
      pageTitle: { type: "string", description: "Visited page title, used verbatim." },
      timeOnPageSec: {
        type: "integer",
        description: "Seconds the visitor has been on the page.",
        minimum: 0,
        maximum: 86400,
      },
      referrer: {
        type: "string",
        description: "Optional referrer domain (e.g., 'google.com', 'linkedin.com').",
      },
      allowedCtas: {
        type: "array",
        description:
          "CTA options the operator has enabled. Empty = all allowed.",
        items: { type: "string", enum: CTA_OPTIONS },
      },
      visitorLocale: {
        type: "string",
        description: "Optional 2-letter language code. Default 'en'.",
      },
    },
    required: ["pageKind", "pageTitle"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const pageKind = String(args.pageKind);
    const pageTitle = String(args.pageTitle).trim();
    const timeOnPageSec = Math.max(0, Math.round(Number(args.timeOnPageSec ?? 0)));
    const referrer = args.referrer
      ? String(args.referrer).trim().slice(0, 120)
      : "";
    const rawCtas = Array.isArray(args.allowedCtas)
      ? (args.allowedCtas as string[])
      : [];
    const allowedCtas =
      rawCtas.length === 0
        ? (CTA_OPTIONS as readonly string[])
        : rawCtas.filter((c) => (CTA_OPTIONS as readonly string[]).includes(c));
    const visitorLocale = args.visitorLocale
      ? String(args.visitorLocale).trim().toLowerCase().slice(0, 2)
      : "en";

    if (!(PAGE_KINDS as readonly string[]).includes(pageKind)) {
      return {
        ok: false,
        refused: true,
        reason: `pageKind must be one of: ${PAGE_KINDS.join(", ")}`,
      };
    }
    if (pageTitle.length < MIN_TITLE_LEN || pageTitle.length > MAX_TITLE_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `pageTitle must be ${MIN_TITLE_LEN}-${MAX_TITLE_LEN} chars.`,
      };
    }
    if (allowedCtas.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: `allowedCtas must contain at least one of: ${CTA_OPTIONS.join(", ")}`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `chat greeting voice ${pageKind}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      `You are composing a web chat greeting in language code '${visitorLocale}'.`,
      "Output STRICT JSON: { greeting, ctaUsed, charCount, complianceFlags }.",
      "greeting: ≤120 chars total. Friendly, NOT sales-pushy. Reference pageTitle verbatim where natural.",
      "ctaUsed: one of the allowedCtas — pick the one that best fits the page + dwell time.",
      "charCount: integer length of greeting.",
      "complianceFlags: 0-3 strings — surface any borderline phrasing.",
      "ABSOLUTE RULES:",
      "  - NEVER invent pricing, free trial terms, or product capabilities.",
      "  - NEVER claim to know the visitor's name, email, company, or intent.",
      "  - NEVER use 'limited time' / countdown urgency.",
      `allowedCtas: ${allowedCtas.join(", ")}`,
      `pageKind: ${pageKind}`,
      referrer ? `referrer: ${referrer}` : "",
      `timeOnPageSec: ${timeOnPageSec}`,
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
          { role: "user", content: `pageTitle: ${pageTitle}` },
        ],
        max_tokens: 300,
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

      let greeting = typeof parsed.greeting === "string" ? parsed.greeting : "";
      if (greeting.length > 120) {
        greeting = greeting.slice(0, 117) + "...";
      }
      let ctaUsed =
        typeof parsed.ctaUsed === "string" ? (parsed.ctaUsed as string) : "";
      if (!allowedCtas.includes(ctaUsed)) {
        ctaUsed = "no_cta_just_friendly";
      }
      const complianceFlags = Array.isArray(parsed.complianceFlags)
        ? (parsed.complianceFlags as string[])
        : [];

      await logSecurityEvent({
        kind: "livechat.greeting.composed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "livechat.greeting.composed",
          pageKind,
          ctaUsed,
          charCount: greeting.length,
          referrer: referrer || null,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          pageKind,
          pageTitle,
          referrer: referrer || null,
          visitorLocale,
          greeting,
          charCount: greeting.length,
          ctaUsed,
          allowedCtas,
          complianceFlags,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Greeting compose failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
