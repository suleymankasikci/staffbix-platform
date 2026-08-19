import Stripe from "stripe";

/**
 * Singleton Stripe client.
 *
 * Hard rule: **in non-production envs, this module refuses an `sk_live_`
 * key**. The only place a live key may exist is on Railway production,
 * where `NODE_ENV === "production"` and the key is injected via Railway
 * secrets — never via a local `.env`.
 *
 * The check runs at module-load time, so any attempt to import this file
 * with a misconfigured env fails immediately and noisily.
 */

const apiKey = process.env.STRIPE_SECRET_KEY;

if (!apiKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is required. Copy a `sk_test_…` key from Stripe Dashboard → Test mode → Developers → API keys.",
  );
}

const isLiveKey = apiKey.startsWith("sk_live_");
const isProd = process.env.NODE_ENV === "production";

if (isLiveKey && !isProd) {
  throw new Error(
    "Refusing to start with a Stripe LIVE key (sk_live_…) outside of production. " +
      "Use a TEST key (sk_test_…) for development. " +
      "If this is a Railway production deploy, set NODE_ENV=production.",
  );
}

if (!isLiveKey && isProd) {
  // Not a hard error — staging may run a test key — but it should be loud.
  console.warn(
    "[stripe] WARNING: running in production with a TEST key. Real money flows will fail.",
  );
}

export const stripe = new Stripe(apiKey, {
  // Pin the API version we tested against. When we bump, we audit the
  // changelog and update tests in the same PR. This must match the
  // version declared on the Stripe Dashboard webhook endpoint.
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
  appInfo: {
    name: "Staffbix",
    version: "0.1.0",
    url: "https://staffbix.com",
  },
  // Per-tenant tagging belongs at the call site (via Stripe metadata).
});

export const STRIPE_MODE: "test" | "live" = isLiveKey ? "live" : "test";
