import { NextResponse } from "next/server";
import { BUCKETS, consume, type BucketName } from "./rate-limit";
import { logSecurityEvent } from "../audit/log";

/**
 * Per-route rate-limit gate. Returns a populated 429 NextResponse if the
 * caller is throttled (caller should `return` it as-is); otherwise null
 * and the route handler proceeds.
 *
 * Buckets:
 *   - `api`     — generic authenticated/anonymous JSON endpoints.
 *   - `chat`    — hot-path AI streaming (widget, sdr-outreach, briefs).
 *   - `webhook` — incoming third-party deliveries (Stripe, WhatsApp, email).
 *
 * The identifier is whatever uniquely names the caller for this route.
 * Conventions:
 *   - authed routes:   `tenant:<tenantId>` or `user:<userId>`
 *   - public widget:   `widget:<tenantSlug>:<sessionId>`  or `ip:<ip>`
 *   - webhooks:        `webhook:<source>:<tenantId>` or `webhook:<source>:ip:<ip>`
 *
 * When throttled the helper ALSO writes a `api.rate_limited` security
 * event so the audit feed shows abusive callers without the route
 * handler needing to remember.
 */
export async function rateLimitOr429(
  bucket: BucketName,
  identifier: string,
  audit?: {
    tenantId?: string | null;
    userId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    route?: string;
  },
): Promise<NextResponse | null> {
  if (!identifier) {
    // No way to scope the limit; let the request through rather than
    // making everything 429 because of a missing header.
    return null;
  }
  const r = await consume(bucket, `${bucket}:${identifier}`);
  if (r.ok) return null;

  // Fire-and-forget audit. Use the api.rate_limited kind added in the
  // sprint 12 migration. If the kind isn't present (e.g., audit script
  // ran against a stale DB), the catch in logSecurityEvent swallows it.
  void logSecurityEvent({
    kind: "api.rate_limited",
    tenantId: audit?.tenantId ?? null,
    userId: audit?.userId ?? null,
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
    payload: {
      bucket,
      identifier,
      route: audit?.route ?? null,
      retryAfterSec: r.retryAfterSec,
      limit: BUCKETS[bucket].max,
      windowSec: BUCKETS[bucket].windowSec,
    },
  });

  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(r.retryAfterSec),
        "X-RateLimit-Bucket": bucket,
      },
    },
  );
}
