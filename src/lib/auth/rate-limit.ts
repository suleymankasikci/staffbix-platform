import { redis } from "../queue/redis";

/**
 * Sliding-window rate limiter on Redis. The implementation uses sorted
 * sets keyed by the action — each request appends a timestamp, then
 * prunes anything older than the window.
 *
 * Three named buckets we use today:
 *
 * - `otp:{email}`     — PRD §6.1: 5 OTPs per email per 15 minutes.
 * - `login:{email}`   — PRD §6.1: 5 failed login attempts per 15 minutes.
 * - `register:{ip}`   — 10 registrations per IP per hour (anti-abuse).
 *
 * Returns `{ ok: true, remaining, resetAt }` when the action is allowed,
 * or `{ ok: false, retryAfterSec }` when throttled. Callers should map
 * the `false` case to HTTP 429.
 */

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: Date }
  | { ok: false; retryAfterSec: number };

interface Bucket {
  /** Maximum events allowed inside the window. */
  max: number;
  /** Window size in seconds. */
  windowSec: number;
}

export const BUCKETS = {
  otp: { max: 5, windowSec: 15 * 60 },
  login: { max: 5, windowSec: 15 * 60 },
  register: { max: 10, windowSec: 60 * 60 },
  // Sprint 12 — general-purpose API hardening.
  api: { max: 120, windowSec: 60 },
  chat: { max: 30, windowSec: 60 },
  webhook: { max: 1000, windowSec: 60 },
  // Public widget, keyed on the *network origin* rather than the
  // client-supplied sessionId. The `chat` bucket alone is bypassable —
  // sessionId comes from the browser, so an abuser just rotates it and
  // burns our OpenAI budget. This one they cannot rotate without also
  // rotating IPs. Deliberately looser than `chat` so a shared NAT/office
  // egress with a dozen real visitors is not collateral damage.
  widgetIp: { max: 90, windowSec: 60 },
} as const satisfies Record<string, Bucket>;

export type BucketName = keyof typeof BUCKETS;

export async function consume(
  bucket: BucketName,
  identifier: string,
): Promise<RateLimitResult> {
  const conf = BUCKETS[bucket];
  if (!conf) throw new Error(`Unknown rate-limit bucket: ${bucket}`);

  const key = `rl:${bucket}:${identifier.toLowerCase()}`;
  const now = Date.now();
  const windowStart = now - conf.windowSec * 1000;

  // Atomic via MULTI: ZREMRANGEBYSCORE to drop old entries, then ZCARD to
  // read the current count, then ZADD + EXPIRE in the same transaction.
  const pipe = redis.multi();
  pipe.zremrangebyscore(key, 0, windowStart);
  pipe.zcard(key);
  pipe.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 10)}`);
  pipe.expire(key, conf.windowSec);
  const results = await pipe.exec();
  if (!results) {
    // Redis pipeline failure — fail-open so legit users aren't punished
    // for an infra issue, but emit a warning.
    console.warn(`[rate-limit] pipeline returned null for ${key}`);
    return {
      ok: true,
      remaining: conf.max - 1,
      resetAt: new Date(now + conf.windowSec * 1000),
    };
  }

  const countBefore = Number(results[1]?.[1] ?? 0);
  const countAfter = countBefore + 1;

  if (countAfter > conf.max) {
    // We over-shot — remove the entry we just added so the user can
    // retry once the window slides.
    const scores = await redis.zrange(key, 0, 0, "WITHSCORES");
    const oldest = Number(scores?.[1] ?? now);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + conf.windowSec * 1000 - now) / 1000),
    );
    await redis.zpopmax(key); // drop the entry we just added
    return { ok: false, retryAfterSec };
  }

  return {
    ok: true,
    remaining: conf.max - countAfter,
    resetAt: new Date(now + conf.windowSec * 1000),
  };
}
