import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * RFC 6238 TOTP — Time-Based One-Time Password.
 *
 * Hand-rolled because Sprint 18 carries a "no new dependencies" rule and
 * the algorithm is small enough that a careful native-Node implementation
 * is auditable in one screen. Tested against RFC 6238 Appendix B (SHA-1)
 * vectors — see the audit script.
 *
 * Parameters (matching every authenticator app — Google Authenticator,
 * Authy, 1Password, Bitwarden, Microsoft Authenticator):
 *   digits = 6
 *   period = 30 seconds
 *   algorithm = HMAC-SHA1 (RFC 6238 default)
 *
 * The shared secret is a raw byte string, conventionally 20 bytes.
 * For storage we encode in base32 (RFC 4648, no padding) so it round-
 * trips through QR codes and manual entry.
 */

const DIGITS = 6;
const PERIOD_SEC = 30;

/* ── Base32 (RFC 4648) ─────────────────────────────────────────────── */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode bytes to base32 (RFC 4648, no padding). Uppercase. */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

/**
 * Decode a base32 string (RFC 4648). Padding (`=`) and whitespace are
 * ignored; case-insensitive. Throws on characters outside the alphabet.
 */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx < 0) throw new Error(`invalid base32 character: ${c}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/* ── Secret generation ─────────────────────────────────────────────── */

/**
 * Generate a 20-byte random secret. Returns both the raw bytes (used
 * to compute codes) and the base32 form (handed to the authenticator
 * app via QR / manual entry).
 */
export function generateTotpSecret(): { secret: Buffer; base32: string } {
  const secret = randomBytes(20);
  return { secret, base32: base32Encode(secret) };
}

/* ── otpauth:// URI ────────────────────────────────────────────────── */

/**
 * Build an `otpauth://totp/...` URI per the de-facto Google Authenticator
 * Key URI Format. Authenticator apps consume this from QR codes.
 *
 * Example:
 *   otpauth://totp/Staffbix:user@example.com
 *     ?secret=JBSWY3DPEHPK3PXP&issuer=Staffbix&algorithm=SHA1
 *     &digits=6&period=30
 */
export function totpUri(args: {
  secret: string; // base32, no padding
  account: string; // user-readable label (typically the email)
  issuer: string; // brand label
}): string {
  const label = encodeURIComponent(`${args.issuer}:${args.account}`);
  const params = new URLSearchParams({
    secret: args.secret,
    issuer: args.issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SEC),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ── HOTP / TOTP core ──────────────────────────────────────────────── */

/**
 * RFC 4226 HOTP — produces a 6-digit code for a single counter value.
 * Used internally by `totpCode` and exposed for the audit script that
 * checks RFC 6238 test vectors.
 */
export function hotpCode(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter. JS bitwise ops are 32-bit so we split.
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac("sha1", secret).update(buf).digest();
  // Dynamic truncation (RFC 4226 §5.3).
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** DIGITS;
  return String(code % mod).padStart(DIGITS, "0");
}

/**
 * Compute the current TOTP for `secret` at `whenMs` (defaults to now).
 * `whenMs` is in milliseconds-since-epoch to match `Date.now()`; we
 * convert to seconds and divide by the 30-second period internally.
 */
export function totpCode(secret: Buffer, whenMs: number = Date.now()): string {
  const counter = Math.floor(whenMs / 1000 / PERIOD_SEC);
  return hotpCode(secret, counter);
}

/**
 * Verify a 6-digit user-submitted code against the secret with a
 * ±1 step tolerance (90-second window). Constant-time comparison.
 */
export function verifyTotp(
  secret: Buffer,
  code: string,
  whenMs: number = Date.now(),
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(whenMs / 1000 / PERIOD_SEC);
  for (const step of [-1, 0, 1]) {
    const candidate = hotpCode(secret, counter + step);
    if (
      candidate.length === code.length &&
      timingSafeEqual(Buffer.from(candidate), Buffer.from(code))
    ) {
      return true;
    }
  }
  return false;
}

/* ── Recovery codes ────────────────────────────────────────────────── */

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const RECOVERY_LENGTH = 10;
const RECOVERY_COUNT = 10;

/**
 * Generate 10 single-use recovery codes. Returns both the plaintext
 * codes (shown to the user once during enrolment) and their SHA-256
 * hex hashes (what we persist alongside the user row).
 */
export function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < RECOVERY_COUNT; i++) {
    const bytes = randomBytes(RECOVERY_LENGTH);
    let code = "";
    for (let j = 0; j < RECOVERY_LENGTH; j++) {
      code += RECOVERY_ALPHABET[bytes[j] % RECOVERY_ALPHABET.length];
    }
    plain.push(code);
    hashed.push(hashRecoveryCode(code));
  }
  return { plain, hashed };
}

/** SHA-256 hex of the recovery code (no salt — single-use, 50-bit entropy). */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
