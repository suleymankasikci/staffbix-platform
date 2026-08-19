import { and, eq } from "drizzle-orm";
import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * create_affiliate_code — assign a discount code + commission terms to
 * an affiliate partner whose lead row already exists. The code is
 * stored on the lead's metadata.affiliate field; the audit log records
 * the commission terms so an operator can later run payouts.
 *
 * Real provider integrations (Sprint 50+):
 *   - Refersion / Tapfiliate (auto-generate codes + tracking)
 *   - Stripe Promotion Codes (apply to checkout)
 *   - Shopify Discount Codes
 *
 * Today this tool only RECORDS the terms — Stripe Promotion Code
 * creation lands in the dedicated affiliate-ops sprint. The benefit
 * even today: structured agreements end up in the leads.metadata so
 * the operator can review + apply at payout time.
 */

const MAX_CODE_LEN = 32;
const MIN_COMMISSION_PCT = 1;
const MAX_COMMISSION_PCT = 50;

export const createAffiliateCodeTool: Tool = {
  name: "create_affiliate_code",
  description:
    "Assign a discount-code + commission percentage to an affiliate partner. The lead must already exist (use create_outreach_lead first). Codes must be A-Z / 0-9 / hyphens, ≤32 chars. Commission % must be 1-50. Records the agreement in lead.metadata for operator payout review.",
  parameters: {
    type: "object",
    properties: {
      partnerEmail: {
        type: "string",
        description: "Email of the partner — must match a leads row.",
      },
      codeName: {
        type: "string",
        description: "The discount code customers will use at checkout. Uppercase letters + digits + hyphens.",
      },
      commissionPercent: {
        type: "number",
        description: "What share of net revenue the affiliate earns. 1-50.",
        minimum: MIN_COMMISSION_PCT,
        maximum: MAX_COMMISSION_PCT,
      },
      customerDiscountPercent: {
        type: "number",
        description:
          "What discount the code gives the customer (0 = no discount, just tracking). 0-50.",
        minimum: 0,
        maximum: 50,
      },
      validUntil: {
        type: "string",
        description: "ISO 8601 date the code expires. Optional — omit for evergreen.",
      },
    },
    required: ["partnerEmail", "codeName", "commissionPercent", "customerDiscountPercent"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const partnerEmail = String(args.partnerEmail).trim().toLowerCase();
    const codeName = String(args.codeName).trim().toUpperCase();
    const commissionPercent = Number(args.commissionPercent);
    const customerDiscountPercent = Number(args.customerDiscountPercent);
    const validUntil = args.validUntil ? String(args.validUntil) : null;

    if (!partnerEmail.includes("@")) {
      return { ok: false, refused: true, reason: "partnerEmail malformed." };
    }
    if (!/^[A-Z0-9-]+$/.test(codeName)) {
      return {
        ok: false,
        refused: true,
        reason: "codeName must be uppercase A-Z, 0-9, and hyphens only.",
      };
    }
    if (codeName.length > MAX_CODE_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `codeName too long (>${MAX_CODE_LEN} chars).`,
      };
    }
    if (commissionPercent < MIN_COMMISSION_PCT || commissionPercent > MAX_COMMISSION_PCT) {
      return {
        ok: false,
        refused: true,
        reason: `commissionPercent must be ${MIN_COMMISSION_PCT}-${MAX_COMMISSION_PCT}.`,
      };
    }
    if (customerDiscountPercent < 0 || customerDiscountPercent > 50) {
      return {
        ok: false,
        refused: true,
        reason: "customerDiscountPercent must be 0-50.",
      };
    }
    if (validUntil && !Number.isFinite(Date.parse(validUntil))) {
      return { ok: false, refused: true, reason: "validUntil is not a valid ISO date." };
    }

    const [lead] = await db
      .select({ id: leads.id, metadata: leads.metadata })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenantId), eq(leads.email, partnerEmail)))
      .limit(1);

    if (!lead) {
      return {
        ok: false,
        refused: true,
        reason: "No matching partner lead — call create_outreach_lead first.",
      };
    }

    try {
      const meta = (lead.metadata as Record<string, unknown>) ?? {};
      const existing = Array.isArray(meta.affiliateCodes)
        ? (meta.affiliateCodes as unknown[])
        : [];
      const conflict = existing.find(
        (c) => (c as { codeName?: string }).codeName === codeName,
      );
      if (conflict) {
        return {
          ok: false,
          refused: true,
          reason: `Code '${codeName}' already exists for this partner.`,
        };
      }
      existing.push({
        codeName,
        commissionPercent,
        customerDiscountPercent,
        validUntil,
        createdByWorkerId: ctx.workerId,
        createdAt: new Date().toISOString(),
      });
      await db
        .update(leads)
        .set({
          status: "contacted",
          metadata: { ...meta, affiliateCodes: existing },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      await logSecurityEvent({
        kind: "affiliate.code.created",
        tenantId: ctx.tenantId,
        payload: {
          subject: "affiliate.code.created",
          leadId: lead.id,
          partnerEmail,
          codeName,
          commissionPercent,
          customerDiscountPercent,
          validUntil,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          leadId: lead.id,
          codeName,
          commissionPercent,
          customerDiscountPercent,
          validUntil,
          appliedNote:
            "Code recorded on the lead. Stripe Promotion Code + checkout enforcement land in Sprint 50.",
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't persist affiliate code: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
