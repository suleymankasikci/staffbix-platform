import type { Tool } from "../types";

/**
 * lookup_order — fetch an order by reference (order id, email, or
 * combination). Backed by a tenant's wired-in commerce integration
 * (Shopify, WooCommerce, Magento) via `src/lib/integrations/commerce`.
 *
 * MVP scope: the platform ships a fixture implementation that returns
 * deterministic data so the audit can prove the tool-calling loop
 * works end-to-end. Real integration tap-ins (Shopify GraphQL,
 * WooCommerce REST) plug in here as `commerce/<provider>.ts` modules
 * keyed by `integration.kind` in DB.
 *
 * Why fixture-first:
 *   The integration registry isn't 64-role-wide yet (Sprint 21+ adds
 *   one connector per use case). Shipping the FIXTURE today + the real
 *   Shopify provider in Sprint 22's first wave keeps the API stable
 *   for the model — the tool definition doesn't change when we swap
 *   the backing provider.
 */

export const lookupOrderTool: Tool = {
  name: "lookup_order",
  description:
    "Look up a customer order by order id or by customer email. Returns order status, items, shipping, and last update. Use this BEFORE promising delivery times or initiating refunds.",
  parameters: {
    type: "object",
    properties: {
      orderRef: {
        type: "string",
        description:
          "Order identifier the customer gave you. Either an order number like '#1843' or an email like 'ada@example.com'.",
      },
    },
    required: ["orderRef"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const orderRef = String(args.orderRef).trim();
    if (!orderRef) {
      return { ok: false, refused: true, reason: "orderRef cannot be empty." };
    }

    const provider = await pickCommerceProvider(ctx.tenantId);
    if (provider === null) {
      return {
        ok: true,
        data: {
          found: false,
          reason:
            "This tenant hasn't wired a commerce integration yet — I can't look up orders directly. Please tell the customer you'll check with the team and circle back.",
        },
      };
    }

    try {
      const order = await provider.lookupOrder(orderRef);
      if (!order) {
        return {
          ok: true,
          data: {
            found: false,
            orderRef,
            reason: `No order matching '${orderRef}' was found.`,
          },
        };
      }
      return { ok: true, data: { found: true, order } };
    } catch (err) {
      return {
        ok: true,
        data: {
          found: false,
          orderRef,
          reason: `Commerce lookup failed: ${err instanceof Error ? err.message : String(err)}. The team has been notified.`,
        },
      };
    }
  },
};

/* ── commerce provider plumbing ─────────────────────────────────── */

interface OrderDTO {
  id: string;
  status: "pending" | "paid" | "fulfilled" | "delivered" | "cancelled" | "refunded";
  customerEmail: string;
  totalCents: number;
  currency: string;
  items: { sku: string; name: string; qty: number }[];
  shipping?: {
    carrier: string;
    tracking: string;
    estimatedDelivery: string; // ISO date
  };
  placedAt: string; // ISO
  updatedAt: string;
}

interface CommerceProvider {
  kind: string;
  lookupOrder: (ref: string) => Promise<OrderDTO | null>;
}

async function pickCommerceProvider(
  tenantId: string,
): Promise<CommerceProvider | null> {
  // Test fixture — used by audit-sprint-21 + early tenants without a
  // real commerce integration. Real Shopify/WooCommerce providers
  // override this when the tenant has an `integrations` row with
  // kind='shopify' or kind='woocommerce'.
  if (process.env.COMMERCE_FIXTURE === "1") {
    return makeFixtureProvider();
  }

  // Real-integration probe (Sprint 22+): look up an integrations row
  // for this tenant, decrypt creds, instantiate the matching adapter.
  // For now we return null — the tool reports a graceful "no
  // integration wired" message back to the model, which then tells
  // the customer it'll circle back.
  void tenantId;
  return null;
}

/* ── Test fixture — deterministic, audit-friendly ──────────────── */

const FIXTURE_ORDERS: Record<string, OrderDTO> = {
  "#1843": {
    id: "#1843",
    status: "fulfilled",
    customerEmail: "ada@example.com",
    totalCents: 12000,
    currency: "USD",
    items: [
      { sku: "TOTE-LRG-CAMEL", name: "Camel Leather Tote · L", qty: 1 },
      { sku: "GIFT-WRAP", name: "Gift wrapping", qty: 1 },
    ],
    shipping: {
      carrier: "UPS",
      tracking: "1Z999AA10123456784",
      estimatedDelivery: "2026-05-19",
    },
    placedAt: "2026-05-12T08:14:00Z",
    updatedAt: "2026-05-14T11:22:00Z",
  },
  "#1844": {
    id: "#1844",
    status: "paid",
    customerEmail: "kenji@example.com",
    totalCents: 4500,
    currency: "USD",
    items: [{ sku: "WALLET-BIFOLD-NOIR", name: "Bifold Wallet · Noir", qty: 1 }],
    placedAt: "2026-05-15T16:02:00Z",
    updatedAt: "2026-05-15T16:02:00Z",
  },
};

function makeFixtureProvider(): CommerceProvider {
  return {
    kind: "fixture",
    async lookupOrder(ref) {
      // Match by order id ("#1843") OR by email ("ada@example.com").
      if (FIXTURE_ORDERS[ref]) return FIXTURE_ORDERS[ref];
      const byEmail = Object.values(FIXTURE_ORDERS).find(
        (o) => o.customerEmail.toLowerCase() === ref.toLowerCase(),
      );
      return byEmail ?? null;
    },
  };
}
