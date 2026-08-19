import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * triage_shipment_status — deterministic rules engine for handling
 * shipment status events. Given a snapshot of a single shipment, the
 * tool returns:
 *   - recommendedAction: 'no_action' | 'send_progress_update' |
 *     'follow_up_with_customer' | 'open_carrier_claim' |
 *     'escalate_to_human'
 *   - reasons: 1-N strings explaining WHY
 *   - urgency: 'low' | 'medium' | 'high' | 'critical'
 *   - hoursStale: integer
 *   - claimThresholdExceeded: bool
 *
 * No LLM call — fast enough to run on every webhook tick.
 */

const STATUSES = [
  "label_created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
  "lost",
  "returned",
] as const;

const STALE_DEFAULT_HOURS = 48;
const CLAIM_DEFAULT_THRESHOLD_USD = 200;

export const triageShipmentStatusTool: Tool = {
  name: "triage_shipment_status",
  description:
    "Decide what to do about a shipment given its current status, last update timestamp, and value. Pure rules — no LLM. Returns recommendedAction + reasons + urgency.",
  parameters: {
    type: "object",
    properties: {
      shipmentId: { type: "string" },
      carrier: { type: "string" },
      trackingNumber: { type: "string" },
      currentStatus: { type: "string", enum: STATUSES },
      lastUpdateIso: {
        type: "string",
        description: "ISO timestamp of the carrier's last status update.",
      },
      shippedAtIso: {
        type: "string",
        description: "ISO timestamp the package was originally shipped.",
      },
      valueUsd: {
        type: "number",
        description: "Declared value of the package.",
        minimum: 0,
      },
      destinationCountry: {
        type: "string",
        description: "ISO 2-letter destination country code.",
      },
      staleThresholdHours: {
        type: "integer",
        description: "Hours of no movement before we treat it as stale. Default 48.",
        minimum: 1,
        maximum: 720,
      },
      claimThresholdUsd: {
        type: "number",
        description: "Value above which lost packages auto-open a claim. Default 200.",
        minimum: 0,
      },
    },
    required: [
      "shipmentId",
      "carrier",
      "trackingNumber",
      "currentStatus",
      "lastUpdateIso",
    ],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const shipmentId = String(args.shipmentId).trim();
    const carrier = String(args.carrier).trim();
    const trackingNumber = String(args.trackingNumber).trim();
    const currentStatus = String(args.currentStatus);
    const lastUpdateIso = String(args.lastUpdateIso).trim();
    const shippedAtIso = args.shippedAtIso
      ? String(args.shippedAtIso).trim()
      : "";
    const valueUsd = Math.max(0, Number(args.valueUsd ?? 0));
    const destinationCountry = args.destinationCountry
      ? String(args.destinationCountry).trim().toUpperCase().slice(0, 2)
      : "";
    const staleThresholdHours = Math.max(
      1,
      Math.min(720, Number(args.staleThresholdHours ?? STALE_DEFAULT_HOURS)),
    );
    const claimThresholdUsd = Math.max(
      0,
      Number(args.claimThresholdUsd ?? CLAIM_DEFAULT_THRESHOLD_USD),
    );

    if (shipmentId.length < 1 || carrier.length < 1 || trackingNumber.length < 1) {
      return {
        ok: false,
        refused: true,
        reason: "shipmentId, carrier, trackingNumber are required.",
      };
    }
    if (!(STATUSES as readonly string[]).includes(currentStatus)) {
      return {
        ok: false,
        refused: true,
        reason: `currentStatus must be one of: ${STATUSES.join(", ")}`,
      };
    }
    const lastUpdateMs = Date.parse(lastUpdateIso);
    if (!Number.isFinite(lastUpdateMs)) {
      return {
        ok: false,
        refused: true,
        reason: "lastUpdateIso must be a valid ISO 8601 timestamp.",
      };
    }
    if (shippedAtIso && !Number.isFinite(Date.parse(shippedAtIso))) {
      return {
        ok: false,
        refused: true,
        reason: "shippedAtIso must be a valid ISO 8601 timestamp.",
      };
    }

    const hoursStale = Math.max(
      0,
      Math.round((Date.now() - lastUpdateMs) / 3_600_000),
    );

    const claimThresholdExceeded = valueUsd >= claimThresholdUsd;
    const isStale = hoursStale >= staleThresholdHours;

    let recommendedAction:
      | "no_action"
      | "send_progress_update"
      | "follow_up_with_customer"
      | "open_carrier_claim"
      | "escalate_to_human" = "no_action";
    let urgency: "low" | "medium" | "high" | "critical" = "low";
    const reasons: string[] = [];

    switch (currentStatus) {
      case "label_created":
      case "picked_up":
      case "in_transit": {
        if (isStale) {
          recommendedAction = "follow_up_with_customer";
          urgency = "medium";
          reasons.push(`No carrier update for ${hoursStale}h (≥${staleThresholdHours}h).`);
        } else {
          recommendedAction = "no_action";
          urgency = "low";
          reasons.push(`In-transit and last update was ${hoursStale}h ago — within tolerance.`);
        }
        break;
      }
      case "out_for_delivery": {
        recommendedAction = "send_progress_update";
        urgency = "low";
        reasons.push("Out for delivery — proactively notify the customer.");
        break;
      }
      case "delivered": {
        recommendedAction = "send_progress_update";
        urgency = "low";
        reasons.push("Delivered — send confirmation + delivery photo if available.");
        break;
      }
      case "exception": {
        recommendedAction = isStale ? "escalate_to_human" : "follow_up_with_customer";
        urgency = isStale ? "high" : "medium";
        reasons.push(
          isStale
            ? `Exception status with no movement for ${hoursStale}h — escalate to a human.`
            : "Exception flagged by carrier — reach out to customer with options.",
        );
        break;
      }
      case "lost": {
        if (claimThresholdExceeded) {
          recommendedAction = "open_carrier_claim";
          urgency = "critical";
          reasons.push(
            `Lost in transit. valueUsd (${valueUsd}) ≥ claimThresholdUsd (${claimThresholdUsd}) — auto-open claim.`,
          );
        } else {
          recommendedAction = "follow_up_with_customer";
          urgency = "high";
          reasons.push(
            `Lost in transit. valueUsd (${valueUsd}) below claimThresholdUsd (${claimThresholdUsd}) — refund / replacement decision.`,
          );
        }
        break;
      }
      case "returned": {
        recommendedAction = "follow_up_with_customer";
        urgency = "medium";
        reasons.push("Package returned to sender — confirm reason + reship intent with customer.");
        break;
      }
    }

    await logSecurityEvent({
      kind: "logistics.shipment.triaged",
      tenantId: ctx.tenantId,
      payload: {
        subject: "logistics.shipment.triaged",
        shipmentId,
        carrier,
        currentStatus,
        hoursStale,
        recommendedAction,
        urgency,
        claimThresholdExceeded,
        destinationCountry: destinationCountry || null,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        shipmentId,
        carrier,
        trackingNumber,
        currentStatus,
        hoursStale,
        staleThresholdHours,
        claimThresholdUsd,
        claimThresholdExceeded,
        valueUsd,
        destinationCountry: destinationCountry || null,
        recommendedAction,
        reasons,
        urgency,
      },
    };
  },
};
