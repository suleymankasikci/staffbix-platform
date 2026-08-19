import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * request_supplier_quotes — draft a structured quote-request email
 * per approved supplier. Output:
 *   - perSupplier: [{ supplierName, email, subject, body, deadlineIso }]
 *   - sharedRequirements: object echoing the spec
 *   - threeQuoteRuleSatisfied: true if ≥3 suppliers in the list
 *   - notForSendNote
 *
 * Enforced server-side:
 *   - quoteThresholdUsd: if the item's expected spend >= threshold,
 *     suppliers count MUST be ≥ 3 → refuse otherwise.
 *   - approvedSuppliers only: any supplier not in the operator's list
 *     is silently dropped + flagged in droppedSuppliers.
 */

const MODEL = "gpt-4o-mini";

const PAYMENT_TERM_OPTIONS = ["net_30", "net_60", "prepaid", "on_delivery", "milestone"] as const;

const MIN_SPEC_LEN = 30;
const MAX_SPEC_LEN = 3000;

export const requestSupplierQuotesTool: Tool = {
  name: "request_supplier_quotes",
  description:
    "Draft per-supplier quote-request emails. Enforces the three-quote rule above quoteThresholdUsd and silently drops any supplier not in approvedSuppliers (flagged in droppedSuppliers).",
  parameters: {
    type: "object",
    properties: {
      itemName: { type: "string" },
      quantity: { type: "integer", minimum: 1, maximum: 1_000_000 },
      specText: {
        type: "string",
        description: "Spec for the item being purchased. ≤3000 chars.",
      },
      expectedSpendUsd: {
        type: "number",
        description: "Operator estimate of total spend (USD).",
        minimum: 0,
      },
      quoteThresholdUsd: {
        type: "number",
        description: "Three-quote rule trigger threshold. Default 500.",
        minimum: 0,
      },
      deadlineIso: {
        type: "string",
        description: "ISO date by which quotes are needed.",
      },
      paymentTerms: {
        type: "string",
        enum: PAYMENT_TERM_OPTIONS,
        description: "Preferred payment terms (placeholder if 'on_delivery').",
      },
      supplierShortlist: {
        type: "array",
        description: "1-10 entries of { supplierName, email }.",
        items: { type: "object" },
      },
      approvedSuppliers: {
        type: "array",
        description:
          "Operator approved supplier names (email matched if domain matches). Suppliers not in this list are dropped.",
        items: { type: "string" },
      },
    },
    required: [
      "itemName",
      "quantity",
      "specText",
      "deadlineIso",
      "paymentTerms",
      "supplierShortlist",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const itemName = String(args.itemName).trim();
    const quantity = Math.max(1, Math.round(Number(args.quantity)));
    const specText = String(args.specText).trim();
    const expectedSpendUsd = Math.max(0, Number(args.expectedSpendUsd ?? 0));
    const quoteThresholdUsd = Math.max(
      0,
      Number(args.quoteThresholdUsd ?? 500),
    );
    const deadlineIso = String(args.deadlineIso).trim();
    const paymentTerms = String(args.paymentTerms);
    const supplierShortlistRaw = Array.isArray(args.supplierShortlist)
      ? (args.supplierShortlist as Array<Record<string, unknown>>)
      : [];
    const approvedSuppliers = Array.isArray(args.approvedSuppliers)
      ? (args.approvedSuppliers as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .map((s) => s.trim().toLowerCase())
      : [];

    if (itemName.length < 2) {
      return { ok: false, refused: true, reason: "itemName too short." };
    }
    if (specText.length < MIN_SPEC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `specText too short (need ≥${MIN_SPEC_LEN} chars).`,
      };
    }
    if (specText.length > MAX_SPEC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `specText too long (max ${MAX_SPEC_LEN} chars).`,
      };
    }
    if (!(PAYMENT_TERM_OPTIONS as readonly string[]).includes(paymentTerms)) {
      return {
        ok: false,
        refused: true,
        reason: `paymentTerms must be one of: ${PAYMENT_TERM_OPTIONS.join(", ")}`,
      };
    }
    const deadlineMs = Date.parse(deadlineIso);
    if (!Number.isFinite(deadlineMs) || deadlineMs < Date.now() - 60_000) {
      return {
        ok: false,
        refused: true,
        reason: "deadlineIso must be a valid future ISO timestamp.",
      };
    }
    if (supplierShortlistRaw.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "supplierShortlist required (at least one entry).",
      };
    }

    const shortlist = supplierShortlistRaw
      .map((s) => ({
        supplierName:
          typeof s.supplierName === "string" ? (s.supplierName as string).trim() : "",
        email: typeof s.email === "string" ? (s.email as string).trim() : "",
      }))
      .filter((s) => s.supplierName.length > 0 && /@/.test(s.email))
      .slice(0, 10);

    if (shortlist.length === 0) {
      return {
        ok: false,
        refused: true,
        reason:
          "supplierShortlist entries must each include supplierName + email (with '@').",
      };
    }

    // Approved-supplier filter. If operator supplied a list, drop
    // suppliers not in it; if not, keep everything.
    const acceptedSuppliers: typeof shortlist = [];
    const droppedSuppliers: typeof shortlist = [];
    if (approvedSuppliers.length === 0) {
      acceptedSuppliers.push(...shortlist);
    } else {
      for (const s of shortlist) {
        const matches = approvedSuppliers.some((a) => {
          const lcName = s.supplierName.toLowerCase();
          const lcEmail = s.email.toLowerCase();
          return (
            a === lcName ||
            a === lcEmail ||
            lcEmail.endsWith("@" + a) ||
            lcName.includes(a)
          );
        });
        if (matches) acceptedSuppliers.push(s);
        else droppedSuppliers.push(s);
      }
    }

    const threeQuoteRuleRequired = expectedSpendUsd >= quoteThresholdUsd;
    if (threeQuoteRuleRequired && acceptedSuppliers.length < 3) {
      return {
        ok: false,
        refused: true,
        reason: `Three-quote rule: expectedSpendUsd (${expectedSpendUsd}) is ≥ threshold (${quoteThresholdUsd}); need ≥3 approved suppliers, got ${acceptedSuppliers.length}.`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `purchasing email voice supplier RFQ`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      "You are the Purchasing Agent drafting per-supplier quote-request emails.",
      "Output STRICT JSON: { perSupplier }.",
      "perSupplier: one entry per acceptedSupplier (preserve order). { supplierName, email, subject, body }.",
      "subject: ≤60 chars, formal.",
      "body: ≤180 words. Include item + quantity + spec link / summary + deadline + payment-terms hint.",
      "ABSOLUTE RULES:",
      "  - NEVER name a competitor supplier in a body to another.",
      "  - NEVER commit to a target price.",
      `itemName: ${itemName}`,
      `quantity: ${quantity}`,
      `deadlineIso: ${deadlineIso}`,
      `paymentTerms: ${paymentTerms}`,
      `acceptedSuppliers: ${acceptedSuppliers.map((s) => s.supplierName).join(" | ")}`,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Spec:\n${specText}` },
        ],
        max_tokens: 1500,
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

      const acceptedMap = new Map(
        acceptedSuppliers.map((s) => [s.supplierName.toLowerCase(), s]),
      );
      const rawPer = Array.isArray(parsed.perSupplier)
        ? (parsed.perSupplier as Array<Record<string, unknown>>)
        : [];
      const perSupplier = rawPer
        .map((p) => {
          const name = typeof p.supplierName === "string" ? p.supplierName : "";
          const ref = acceptedMap.get(name.toLowerCase());
          if (!ref) return null;
          return {
            supplierName: ref.supplierName,
            email: ref.email,
            subject: typeof p.subject === "string" ? p.subject : "",
            body: typeof p.body === "string" ? p.body : "",
            deadlineIso,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      await logSecurityEvent({
        kind: "purchasing.quotes.requested",
        tenantId: ctx.tenantId,
        payload: {
          subject: "purchasing.quotes.requested",
          itemName,
          quantity,
          expectedSpendUsd,
          acceptedSuppliersCount: acceptedSuppliers.length,
          droppedSuppliersCount: droppedSuppliers.length,
          threeQuoteRuleRequired,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          itemName,
          quantity,
          expectedSpendUsd,
          quoteThresholdUsd,
          threeQuoteRuleRequired,
          threeQuoteRuleSatisfied:
            !threeQuoteRuleRequired || acceptedSuppliers.length >= 3,
          deadlineIso,
          paymentTerms,
          perSupplier,
          droppedSuppliers,
          sharedRequirements: { itemName, quantity, paymentTerms, deadlineIso },
          notForSend:
            "Drafts only. Operator approves before sending each supplier email.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Quote request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
