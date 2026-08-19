import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token helpers used by sessions, refresh tokens, OTPs, and email/reset links.
 *
 * Two rules underpin everything in this file:
 *
 * 1. The token value that we hand to the client (cookie / URL / OTP code) is
 *    NEVER stored. We store only `sha256(token + pepper)`. A read-only DB
 *    leak is not enough to forge a session or replay an OTP.
 *
 * 2. Equality checks on hashed tokens use `timingSafeEqual` to make timing
 *    attacks against the lookup useless.
 */

function pepper(): Uint8Array {
  const p = process.env.SESSION_HASH_PEPPER;
  if (!p || p.length < 32) {
    throw new Error(
      "SESSION_HASH_PEPPER is missing or too short. Run `openssl rand -hex 32` and add it to .env.",
    );
  }
  return new TextEncoder().encode(p);
}

/**
 * Generate a high-entropy opaque token suitable for session cookies and
 * refresh tokens. 32 bytes → 52-char base32 string. Lowercase, no padding,
 * safe in cookies/URLs.
 */
export function generateSessionToken(): string {
  const bytes = randomBytes(32);
  return encodeBase32LowerCaseNoPadding(new Uint8Array(bytes));
}

/** Returns the hex-encoded SHA-256 of `token + pepper`. Stable across processes. */
export function hashToken(token: string): string {
  const bytes = new TextEncoder().encode(token);
  const pep = pepper();
  const combined = new Uint8Array(bytes.length + pep.length);
  combined.set(bytes, 0);
  combined.set(pep, bytes.length);
  return encodeHexLowerCase(sha256(combined));
}

/** Constant-time string compare. Returns false on length mismatch. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Generate a 6-digit numeric OTP. Uses `crypto.randomBytes` then modulo
 * with rejection sampling to keep the distribution uniform across all
 * 10^6 codes (no bias toward small values).
 */
export function generateNumericOtp(digits = 6): string {
  if (digits < 4 || digits > 10) {
    throw new Error("OTP must be between 4 and 10 digits.");
  }
  const max = 10 ** digits;
  // Largest multiple of `max` that fits in a Uint32 — reject anything above
  // this to remove modulo bias.
  const limit = Math.floor(0xffffffff / max) * max;
  for (;;) {
    const buf = randomBytes(4);
    const n = buf.readUInt32BE(0);
    if (n < limit) {
      return (n % max).toString().padStart(digits, "0");
    }
  }
}

/**
 * Generate a 32-byte token for password-reset/email-verify links.
 * Hex-encoded for URL embedding.
 */
export function generateVerificationToken(): string {
  return encodeHexLowerCase(new Uint8Array(randomBytes(32)));
}
