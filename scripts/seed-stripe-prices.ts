/**
 * Sprint 17 — Seed Stripe Products + Prices for the four Staffbix plans
 * and persist the resulting `price_…` ids into `plans.stripe_price_id`.
 *
 * Why this exists:
 *   `/api/billing/checkout` returns 503 when a plan row has no
 *   `stripe_price_id`. Without this script every fresh environment
 *   (local, staging, prod) starts with NULL price ids and checkout is
 *   broken until somebody hand-builds the products in the Stripe
 *   dashboard. This is the supported, idempotent path.
 *
 * Idempotency strategy:
 *   1. Read `plans.stripe_price_id` from DB. If set AND still active in
 *      Stripe → skip. (A deleted/archived price is treated as missing.)
 *   2. Otherwise find the matching Stripe Product via
 *      `metadata['staffbix_plan_id']` and reuse it, or create a new one.
 *   3. Create a fresh monthly USD price under that product.
 *   4. Update `plans.stripe_price_id` with the new price id.
 *
 *   Stripe prices are immutable — you cannot edit `unit_amount` after
 *   create — so re-running the script never mutates an existing price.
 *   It only ever creates a new one and rewires the DB pointer.
 *
 * Enterprise plan is sales-quoted (no public price) so we never push
 * a Stripe price for it; `checkout` will keep 503'ing for enterprise
 * by design (sales engages the customer manually).
 *
 * Run:
 *   set -a; source .env.local; set +a; npx tsx scripts/seed-stripe-prices.ts
 *
 * Safe to re-run. Touches Stripe — do NOT bind to a CI step that runs
 * unsupervised against a live key.
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { stripe } from "../src/lib/stripe/client";

type SeedPlan = {
  id: "starter" | "growth" | "business" | "enterprise";
  name: string;
  /** Monthly amount in cents. `0` means sales-quoted, no Stripe price. */
  priceCents: number;
};

const PLANS: SeedPlan[] = [
  { id: "starter", name: "Staffbix Starter", priceCents: 4900 },
  { id: "growth", name: "Staffbix Growth", priceCents: 14900 },
  { id: "business", name: "Staffbix Business", priceCents: 49900 },
  { id: "enterprise", name: "Staffbix Enterprise", priceCents: 0 },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sqlClient = postgres(process.env.DATABASE_URL, { max: 2 });
  const db = drizzle(sqlClient, { schema });

  try {
    for (const p of PLANS) {
      const [row] = await db
        .select()
        .from(schema.plans)
        .where(eq(schema.plans.id, p.id))
        .limit(1);

      if (!row) {
        console.error(`Plan ${p.id} not seeded in DB — skipping`);
        continue;
      }

      // Existing price still valid? Skip.
      if (row.stripePriceId) {
        try {
          const existing = await stripe.prices.retrieve(row.stripePriceId);
          if (existing.active) {
            console.log(
              `Plan ${p.id} already has active price ${row.stripePriceId}, skipping`,
            );
            continue;
          }
          console.log(
            `Plan ${p.id} has inactive price ${row.stripePriceId}, recreating`,
          );
        } catch {
          // not found → fall through and recreate
          console.log(
            `Plan ${p.id} has stale price ${row.stripePriceId}, recreating`,
          );
        }
      }

      if (p.priceCents === 0) {
        console.log(`Plan ${p.id} sales-quoted (no Stripe price)`);
        continue;
      }

      // Find-or-create the Product by metadata tag.
      const products = await stripe.products.search({
        query: `metadata['staffbix_plan_id']:'${p.id}'`,
        limit: 1,
      });
      let product = products.data[0];
      if (!product) {
        product = await stripe.products.create({
          name: p.name,
          metadata: { staffbix_plan_id: p.id },
        });
        console.log(`Plan ${p.id} → created product ${product.id}`);
      }

      // Create the Price (monthly USD). Prices are immutable so each run
      // that needs to "update" the amount produces a new price.
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.priceCents,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { staffbix_plan_id: p.id },
      });

      await db
        .update(schema.plans)
        .set({ stripePriceId: price.id })
        .where(eq(schema.plans.id, p.id));

      console.log(`Plan ${p.id} → Stripe price ${price.id}`);
    }

    console.log("Done.");
  } finally {
    await sqlClient.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
