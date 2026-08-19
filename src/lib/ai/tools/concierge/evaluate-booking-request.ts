import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * evaluate_booking_request — decide whether a concierge can book a
 * guest's request automatically or must hand off to the operator.
 * Pure rules.
 *
 * Logic:
 *   - bookingKind=transfer → autoBookAuthorityUsd cap (default 80)
 *   - bookingKind=restaurant_reservation → autoBookAuthorityUsd cap
 *     (default 200), guest count ≤ 8
 *   - bookingKind=activity → autoBookAuthorityUsd cap (default 100),
 *     mustReadCancellationPolicy=true
 *   - bookingKind=medical_or_legal → ALWAYS escalate
 *   - bookingKind=other → ALWAYS escalate
 *
 * Output: { action, reasons, requiresOperatorApproval, cap, allowedCap,
 *   disclosure }
 */

const BOOKING_KINDS = [
  "transfer",
  "restaurant_reservation",
  "activity",
  "medical_or_legal",
  "other",
] as const;

const DEFAULT_CAPS: Record<(typeof BOOKING_KINDS)[number], number> = {
  transfer: 80,
  restaurant_reservation: 200,
  activity: 100,
  medical_or_legal: 0,
  other: 0,
};

const MAX_GUEST_COUNT = 100;

export const evaluateBookingRequestTool: Tool = {
  name: "evaluate_booking_request",
  description:
    "Decide auto-book vs escalate for a concierge booking. Hard-coded caps per booking kind; medical/legal/other ALWAYS escalate.",
  parameters: {
    type: "object",
    properties: {
      bookingKind: { type: "string", enum: BOOKING_KINDS },
      estimatedCostUsd: {
        type: "number",
        description: "Estimated total cost in USD.",
        minimum: 0,
        maximum: 100_000,
      },
      guestCount: {
        type: "integer",
        description: "Party size.",
        minimum: 1,
        maximum: MAX_GUEST_COUNT,
      },
      autoBookAuthorityUsdOverrides: {
        type: "object",
        description: "Optional per-kind authority caps. Falls back to defaults.",
        properties: {
          transfer: { type: "number", minimum: 0 },
          restaurant_reservation: { type: "number", minimum: 0 },
          activity: { type: "number", minimum: 0 },
        },
      },
      hasOperatorPartnerArrangement: { type: "boolean" },
      vendorContact: {
        type: "string",
        description: "Free-form contact (e.g., 'reservations@venue.example' / '+90 555 ...'). Used in disclosure.",
      },
    },
    required: ["bookingKind", "estimatedCostUsd", "guestCount"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const bookingKind = String(args.bookingKind);
    const estimatedCostUsd = Math.max(0, Number(args.estimatedCostUsd));
    const guestCount = Math.max(
      1,
      Math.min(MAX_GUEST_COUNT, Math.round(Number(args.guestCount))),
    );
    const overrides =
      typeof args.autoBookAuthorityUsdOverrides === "object" &&
      args.autoBookAuthorityUsdOverrides !== null
        ? (args.autoBookAuthorityUsdOverrides as Record<string, unknown>)
        : {};
    const hasOperatorPartnerArrangement = Boolean(
      args.hasOperatorPartnerArrangement,
    );
    const vendorContact = args.vendorContact
      ? String(args.vendorContact).slice(0, 200)
      : "";

    if (!(BOOKING_KINDS as readonly string[]).includes(bookingKind)) {
      return {
        ok: false,
        refused: true,
        reason: `bookingKind must be one of: ${BOOKING_KINDS.join(", ")}`,
      };
    }

    const cap =
      bookingKind === "transfer"
        ? Number(overrides.transfer ?? DEFAULT_CAPS.transfer)
        : bookingKind === "restaurant_reservation"
          ? Number(
              overrides.restaurant_reservation ?? DEFAULT_CAPS.restaurant_reservation,
            )
          : bookingKind === "activity"
            ? Number(overrides.activity ?? DEFAULT_CAPS.activity)
            : 0;

    let action:
      | "auto_book"
      | "operator_approval_required"
      | "always_escalate" = "auto_book";
    const reasons: string[] = [];

    if (bookingKind === "medical_or_legal" || bookingKind === "other") {
      action = "always_escalate";
      reasons.push(
        `bookingKind '${bookingKind}' always escalates — concierge never auto-books these.`,
      );
    } else if (estimatedCostUsd > cap) {
      action = "operator_approval_required";
      reasons.push(
        `estimatedCostUsd (${estimatedCostUsd}) > authority cap ($${cap}) for ${bookingKind}.`,
      );
    } else if (bookingKind === "restaurant_reservation" && guestCount > 8) {
      action = "operator_approval_required";
      reasons.push(
        `restaurant_reservation guestCount (${guestCount}) > 8 — operator approval required.`,
      );
    } else {
      action = "auto_book";
      reasons.push(
        `Within ${bookingKind} authority cap ($${cap}) and within guest-count limits.`,
      );
    }

    const disclosure = hasOperatorPartnerArrangement
      ? `Disclose to guest: 'we have a partnership arrangement with this venue'.${vendorContact ? ` Contact: ${vendorContact}.` : ""}`
      : "No partner arrangement on file — no disclosure required beyond standard booking confirmation.";

    await logSecurityEvent({
      kind: "concierge.booking.evaluated",
      tenantId: ctx.tenantId,
      payload: {
        subject: "concierge.booking.evaluated",
        bookingKind,
        estimatedCostUsd,
        guestCount,
        action,
        cap,
        hasOperatorPartnerArrangement,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        bookingKind,
        estimatedCostUsd,
        guestCount,
        action,
        requiresOperatorApproval: action !== "auto_book",
        reasons,
        cap,
        disclosure,
      },
    };
  },
};
