import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Helpers for extracting fingerprinting + locale info from an incoming
 * request. Centralized so every auth route handles them identically.
 */

/**
 * Shared secret proving a request actually traversed our edge.
 *
 * `cf-connecting-ip` and `x-forwarded-for` are just request headers —
 * any client can set them. That only matters if the origin is reachable
 * without going through Cloudflare, which it is: Railway hands every
 * service a `*.up.railway.app` hostname that bypasses the proxy. An
 * attacker hitting that hostname directly can forge a fresh IP per
 * request and walk straight through every IP-scoped rate limit
 * (login throttle, widget budget cap).
 *
 * Set TRUSTED_PROXY_SECRET and add a Cloudflare Transform Rule that
 * injects `x-edge-proof: <same value>` on every request. Requests
 * without the proof are then treated as direct-to-origin and get no
 * client IP at all, so they fall into the shared "unknown" rate-limit
 * bucket instead of an attacker-chosen one.
 *
 * Opt-in on purpose: when the variable is unset, behaviour is unchanged,
 * so a misconfigured Transform Rule can never lock out real users.
 */
const TRUSTED_PROXY_SECRET = process.env.TRUSTED_PROXY_SECRET;

function hasEdgeProof(req: NextRequest): boolean {
  const provided = req.headers.get("x-edge-proof");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(TRUSTED_PROXY_SECRET!);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getClientIp(req: NextRequest): string | null {
  // Cloudflare → x-forwarded-for or cf-connecting-ip. Railway sits behind
  // CF in prod; in dev the request comes straight in.
  if (TRUSTED_PROXY_SECRET && !hasEdgeProof(req)) return null;
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return null;
}

export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent");
}

/**
 * Cheap, opaque device fingerprint. Combines IP + UA hash. Not anti-
 * adversarial — it's used to flag "new device" sign-ins, which a
 * determined attacker can spoof. Good enough as a heuristic for the
 * customer-facing alert email.
 */
export async function getDeviceFingerprint(req: NextRequest): Promise<string | null> {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  if (!ip && !ua) return null;
  const enc = new TextEncoder().encode(`${ip ?? ""}::${ua ?? ""}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** JSON body parser with type-safe failure. */
export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Normalized email: lowercase, trimmed. Empty string → null. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const e = input.trim().toLowerCase();
  if (!e || e.length > 320) return null;
  // RFC 5322-ish — good enough for "is this a syntactically valid email."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}
