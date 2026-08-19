import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_vendor_outreach — draft an email to a SaaS vendor for one of
 * three outcomes (renegotiate / downsize / cancel). The data the tool
 * receives is the same shape audit_saas_subscription produces.
 *
 * Output:
 *   - subject, body
 *   - askLine: explicit ask
 *   - cancellationNoticeLine: only when outcome=cancel
 *   - warnings: 0-3 strings
 *
 * Hard rules:
 *   - NEVER threatens (no "we'll bring in lawyers" unless explicitly
 *     in operator's escalationNotes).
 *   - NEVER invents utilization numbers — only echoes those passed in.
 *   - NEVER commits to a specific contract end date — refers to the
 *     supplied contractEndIso verbatim.
 */

const MODEL = "gpt-4o-mini";

const OUTCOMES = ["renegotiate", "downsize", "cancel"] as const;

const MIN_VENDOR_LEN = 2;
const MAX_NOTES_LEN = 1000;

export const draftVendorOutreachTool: Tool = {
  name: "draft_vendor_outreach",
  description:
    "Draft a SaaS-vendor outreach email for one of: renegotiate / downsize / cancel. Uses operator-supplied utilization numbers verbatim; NEVER invents data, NEVER threatens unless operator explicitly allows.",
  parameters: {
    type: "object",
    properties: {
      vendor: { type: "string" },
      outcome: { type: "string", enum: OUTCOMES },
      currentMonthlyCostUsd: {
        type: "number",
        description: "Current monthly spend (USD).",
        minimum: 0,
        maximum: 100_000,
      },
      currentSeats: { type: "integer", minimum: 1, maximum: 10_000 },
      activeUsersLast30d: { type: "integer", minimum: 0, maximum: 10_000 },
      utilizationPct: {
        type: "number",
        description: "0-100. Echoed verbatim; not recomputed.",
        minimum: 0,
        maximum: 100,
      },
      contractEndIso: { type: "string" },
      requestedDiscountPct: {
        type: "number",
        description: "For renegotiate: discount % to ask for. 0-50.",
        minimum: 0,
        maximum: 50,
      },
      requestedSeatCount: {
        type: "integer",
        description: "For downsize: target seat count. 1-N.",
        minimum: 1,
        maximum: 10_000,
      },
      operatorNotes: {
        type: "string",
        description: "Optional free-form notes (e.g., 'CSM owes us a favor', or escalation language). ≤1000 chars.",
      },
    },
    required: [
      "vendor",
      "outcome",
      "currentMonthlyCostUsd",
      "currentSeats",
      "activeUsersLast30d",
      "utilizationPct",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const vendor = String(args.vendor).trim();
    const outcome = String(args.outcome);
    const currentMonthlyCostUsd = Math.max(0, Number(args.currentMonthlyCostUsd));
    const currentSeats = Math.max(1, Math.round(Number(args.currentSeats)));
    const activeUsersLast30d = Math.max(
      0,
      Math.round(Number(args.activeUsersLast30d)),
    );
    const utilizationPct = Math.max(0, Math.min(100, Number(args.utilizationPct)));
    const contractEndIso = args.contractEndIso
      ? String(args.contractEndIso).trim()
      : "";
    const requestedDiscountPct = Math.max(
      0,
      Math.min(50, Number(args.requestedDiscountPct ?? 0)),
    );
    const requestedSeatCount = Math.max(
      1,
      Math.round(Number(args.requestedSeatCount ?? 1)),
    );
    const operatorNotes = args.operatorNotes
      ? String(args.operatorNotes).trim().slice(0, MAX_NOTES_LEN)
      : "";

    if (vendor.length < MIN_VENDOR_LEN) {
      return { ok: false, refused: true, reason: "vendor too short." };
    }
    if (!(OUTCOMES as readonly string[]).includes(outcome)) {
      return {
        ok: false,
        refused: true,
        reason: `outcome must be one of: ${OUTCOMES.join(", ")}`,
      };
    }
    if (activeUsersLast30d > currentSeats) {
      return {
        ok: false,
        refused: true,
        reason: "activeUsersLast30d cannot exceed currentSeats.",
      };
    }
    if (contractEndIso && !/^\d{4}-\d{2}-\d{2}$/.test(contractEndIso)) {
      return {
        ok: false,
        refused: true,
        reason: "contractEndIso must be YYYY-MM-DD.",
      };
    }
    if (outcome === "downsize" && requestedSeatCount >= currentSeats) {
      return {
        ok: false,
        refused: true,
        reason:
          "downsize: requestedSeatCount must be < currentSeats.",
      };
    }

    const outcomeClause: Record<(typeof OUTCOMES)[number], string> = {
      renegotiate: `Tone: cooperative + data-driven. Ask for ${requestedDiscountPct}% discount (or seat-rate reduction) citing utilization ${utilizationPct.toFixed(0)}%.`,
      downsize: `Tone: matter-of-fact. Ask to reduce from ${currentSeats} → ${requestedSeatCount} seats at next renewal cycle. Cite ${activeUsersLast30d} active users / ${utilizationPct.toFixed(0)}%.`,
      cancel: `Tone: respectful + final. Provide notice of non-renewal; ask for offboarding + export window.`,
    };

    const systemPrompt = [
      "You are drafting a SaaS-vendor outreach email for the operator.",
      "Output STRICT JSON: { subject, body, askLine, cancellationNoticeLine, warnings }.",
      "subject: ≤60 chars.",
      "body: ≤220 words. Reference utilization + seat numbers VERBATIM from the input. Honest, professional.",
      "askLine: 1 sentence — the specific ask.",
      "cancellationNoticeLine: only filled when outcome=cancel. Otherwise empty string.",
      "warnings: 0-3 strings — operator nudges (e.g., 'check contract for auto-renew clause').",
      "ABSOLUTE RULES:",
      "  - NEVER invent additional metrics (cost per seat, contract clauses, ARR).",
      "  - NEVER threaten legal action unless explicit in operatorNotes.",
      "  - NEVER promise a competitor switch unless explicit in operatorNotes.",
      outcomeClause[outcome as (typeof OUTCOMES)[number]],
      `vendor: ${vendor}`,
      `currentMonthlyCostUsd: ${currentMonthlyCostUsd}`,
      `currentSeats: ${currentSeats}`,
      `activeUsersLast30d: ${activeUsersLast30d}`,
      `utilizationPct: ${utilizationPct}`,
      contractEndIso ? `contractEndIso: ${contractEndIso}` : "",
      operatorNotes ? `operatorNotes:\n${operatorNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Compose the ${outcome} email.` },
        ],
        max_tokens: 800,
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

      const body = typeof parsed.body === "string" ? parsed.body : "";
      const warnings = Array.isArray(parsed.warnings)
        ? (parsed.warnings as string[]).slice(0, 3)
        : [];

      // Server-side scan: forbid legal threats unless operator allowed.
      const legalAllowed = /\b(lawyer|legal|court|attorney)\b/i.test(operatorNotes);
      if (!legalAllowed && /\b(lawyer|legal action|sue|court)\b/i.test(body)) {
        warnings.push(
          "Body contains legal-threat language but operatorNotes didn't authorise it — operator must approve before sending.",
        );
      }
      // Server-side scan: forbid invented competitor mentions.
      const competitorAllowed = /switch|alternative|competitor/i.test(
        operatorNotes,
      );
      if (
        !competitorAllowed &&
        /\b(we are switching|we will move to|we'?ll switch)\b/i.test(body)
      ) {
        warnings.push(
          "Body implies a competitor switch but operatorNotes didn't authorise it.",
        );
      }

      await logSecurityEvent({
        kind: "procurement.outreach.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "procurement.outreach.drafted",
          vendor,
          outcome,
          currentMonthlyCostUsd,
          utilizationPct,
          warningsCount: warnings.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          vendor,
          outcome,
          currentMonthlyCostUsd,
          currentSeats,
          activeUsersLast30d,
          utilizationPct,
          subject:
            typeof parsed.subject === "string" ? (parsed.subject as string) : "",
          body,
          askLine:
            typeof parsed.askLine === "string" ? (parsed.askLine as string) : "",
          cancellationNoticeLine:
            outcome === "cancel"
              ? typeof parsed.cancellationNoticeLine === "string"
                ? (parsed.cancellationNoticeLine as string)
                : ""
              : "",
          warnings,
          notForSend:
            "Draft only. Operator approves before any send to the vendor.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Vendor outreach draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
