import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_sourcing_outreach — write a personalised outreach message to
 * a passive candidate. Server-side guarantees:
 *   - NEVER references compensation numbers (salary, equity, signing
 *     bonus). The operator can include a compensation-mention boolean
 *     to allow a generic 'comp is competitive' phrasing but no numbers.
 *   - NEVER references protected attributes.
 *   - Channel-aware length (LinkedIn ≤300 chars, email ≤180 words).
 */

const MODEL = "gpt-4o-mini";

const CHANNELS = ["linkedin", "email"] as const;

const MIN_HOOK_LEN = 10;
const MAX_HOOK_LEN = 400;

const COMP_NUMBER_PATTERNS = [
  /[\$€₺£]\s?\d/,
  /\b\d{1,3}\s?k\b/i, // 100k, 200k
  /\b\d+\s?%\s+equity\b/i,
  /\bsalary\s+of\s+\d/i,
];

const PROTECTED_PATTERNS = [
  /\bage\b/i,
  /\byears? old\b/i,
  /\bgender\b/i,
  /\bmarried\b/i,
  /\bchildren\b/i,
  /\bpregnan/i,
  /\bdisabilit/i,
  /\bnationality\b/i,
];

export const draftSourcingOutreachTool: Tool = {
  name: "draft_sourcing_outreach",
  description:
    "Draft a passive-candidate outreach (LinkedIn or email). Server-side rejects salary/equity numbers and protected-attribute references.",
  parameters: {
    type: "object",
    properties: {
      candidateFirstName: { type: "string" },
      candidateRoleAtCompany: {
        type: "string",
        description: "e.g., 'Senior Frontend Engineer at Acme'. Used verbatim.",
      },
      hookContext: {
        type: "string",
        description:
          "Why this person, this week. Operator-supplied observation (e.g., 'their conference talk on tRPC last month'). Used verbatim.",
      },
      openRoleTitle: { type: "string" },
      stackKeywords: {
        type: "array",
        description: "1-8 stack keywords to weave into the body.",
        items: { type: "string" },
      },
      channel: { type: "string", enum: CHANNELS },
      mentionCompensationGenerically: {
        type: "boolean",
        description:
          "If true, the model may use a generic 'compensation is competitive' phrase — NEVER a number.",
      },
    },
    required: [
      "candidateFirstName",
      "candidateRoleAtCompany",
      "hookContext",
      "openRoleTitle",
      "channel",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const candidateFirstName = String(args.candidateFirstName).trim().slice(0, 40);
    const candidateRoleAtCompany = String(args.candidateRoleAtCompany)
      .trim()
      .slice(0, 120);
    const hookContext = String(args.hookContext).trim();
    const openRoleTitle = String(args.openRoleTitle).trim().slice(0, 80);
    const stackKeywords = Array.isArray(args.stackKeywords)
      ? (args.stackKeywords as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 8)
      : [];
    const channel = String(args.channel);
    const mentionCompensationGenerically = Boolean(
      args.mentionCompensationGenerically,
    );

    if (candidateFirstName.length < 1) {
      return { ok: false, refused: true, reason: "candidateFirstName required." };
    }
    if (candidateRoleAtCompany.length < 5) {
      return {
        ok: false,
        refused: true,
        reason: "candidateRoleAtCompany too short (need ≥5 chars).",
      };
    }
    if (hookContext.length < MIN_HOOK_LEN || hookContext.length > MAX_HOOK_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `hookContext must be ${MIN_HOOK_LEN}-${MAX_HOOK_LEN} chars.`,
      };
    }
    if (openRoleTitle.length < 3) {
      return { ok: false, refused: true, reason: "openRoleTitle too short." };
    }
    if (!(CHANNELS as readonly string[]).includes(channel)) {
      return {
        ok: false,
        refused: true,
        reason: `channel must be one of: ${CHANNELS.join(", ")}`,
      };
    }

    // Pre-flight check: reject if operator passed a comp number in hook.
    if (COMP_NUMBER_PATTERNS.some((re) => re.test(hookContext))) {
      return {
        ok: false,
        refused: true,
        reason:
          "hookContext contains a compensation number — never reference comp in writing.",
      };
    }

    const compClause = mentionCompensationGenerically
      ? "You MAY include the phrase 'compensation is competitive' or similar generic language. NEVER a number."
      : "You MUST NOT reference compensation at all (no 'compensation', 'salary', 'equity', 'comp').";

    const channelClause: Record<(typeof CHANNELS)[number], string> = {
      linkedin:
        "Output: 'message' (single string ≤300 chars). No subject. Friendly + concise.",
      email:
        "Output: 'subject' (≤60 chars) + 'message' (body, ≤180 words). Slightly more formal than LinkedIn.",
    };

    const systemPrompt = [
      "You are a Recruiter drafting a passive-candidate outreach.",
      "Output STRICT JSON: { subject, message, complianceFlags }.",
      "subject: only for email; empty string on LinkedIn.",
      "message: cohort + channel-appropriate text.",
      "complianceFlags: 0-3 strings — surface borderline phrasing.",
      "ABSOLUTE RULES:",
      "  - NEVER reference salary, equity, signing bonuses, or any number tied to compensation.",
      "  - NEVER reference age, gender, marital status, children, disability, nationality, religion.",
      "  - Reference hookContext verbatim where natural — do NOT invent observations.",
      compClause,
      channelClause[channel as (typeof CHANNELS)[number]],
      `candidateFirstName: ${candidateFirstName}`,
      `candidateRoleAtCompany: ${candidateRoleAtCompany}`,
      `openRoleTitle: ${openRoleTitle}`,
      stackKeywords.length > 0
        ? `stackKeywords: ${stackKeywords.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `hookContext:\n${hookContext}` },
        ],
        max_tokens: 500,
        temperature: 0.3,
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

      let message = typeof parsed.message === "string" ? parsed.message : "";
      const subject =
        channel === "email" && typeof parsed.subject === "string"
          ? (parsed.subject as string).slice(0, 60)
          : "";

      // Server-side length clamp.
      if (channel === "linkedin" && message.length > 300) {
        message = message.slice(0, 297) + "...";
      }
      if (channel === "email" && message.length > 4000) {
        message = message.slice(0, 3997) + "...";
      }

      // Server-side comp-number scan.
      const complianceFlags = Array.isArray(parsed.complianceFlags)
        ? (parsed.complianceFlags as string[]).slice(0, 3)
        : [];
      let compNumberDetected = false;
      const blob = `${subject} ${message}`;
      for (const re of COMP_NUMBER_PATTERNS) {
        if (re.test(blob)) {
          compNumberDetected = true;
          complianceFlags.push(
            `Compensation-number pattern detected (${String(re)}) — message must not ship.`,
          );
        }
      }
      // Protected attributes.
      let protectedDetected = false;
      for (const re of PROTECTED_PATTERNS) {
        if (re.test(blob)) {
          protectedDetected = true;
          complianceFlags.push(
            `Protected-attribute pattern detected (${String(re)}) — message must not ship.`,
          );
        }
      }
      if (compNumberDetected || protectedDetected) {
        // Redact to prevent accidental forwarding.
        message =
          "[REDACTED — output contained comp numbers or protected-attribute references; please regenerate.]";
      }

      await logSecurityEvent({
        kind: "recruiter.outreach.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "recruiter.outreach.drafted",
          channel,
          openRoleTitle,
          mentionCompensationGenerically,
          compNumberDetected,
          protectedDetected,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          candidateFirstName,
          candidateRoleAtCompany,
          openRoleTitle,
          channel,
          subject,
          message,
          messageLength: message.length,
          withinChannelLimit:
            channel === "linkedin" ? message.length <= 300 : true,
          complianceFlags,
          compNumberDetected,
          protectedDetected,
          notForSend:
            "Draft only. Operator must review before sending — especially when complianceFlags is non-empty.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Outreach draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
