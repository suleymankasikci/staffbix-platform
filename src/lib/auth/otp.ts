import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { oneTimePasswords } from "../db/schema";
import type { OneTimePassword } from "../db/schema";
import {
  generateNumericOtp,
  hashToken,
  constantTimeEqual,
} from "./tokens";

const OTP_TTL_MS = 10 * 60_000; // 10 minutes (PRD §6.1)
const MAX_ATTEMPTS = 5;

export type OtpPurpose = OneTimePassword["purpose"];

/**
 * Issue a fresh OTP for the given (user, purpose). Returns the
 * plaintext code so the caller can email it; the DB only ever holds
 * the SHA-256 hash.
 *
 * `bindSessionIdHash` ties the OTP to the issuing session so it cannot
 * be used to upgrade a different device's session.
 */
export async function issueOtp(args: {
  userId: string;
  purpose: OtpPurpose;
  bindSessionIdHash?: string;
}): Promise<{ code: string; expiresAt: Date }> {
  const code = generateNumericOtp(6);
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.insert(oneTimePasswords).values({
    userId: args.userId,
    purpose: args.purpose,
    codeHash,
    bindSessionIdHash: args.bindSessionIdHash ?? null,
    expiresAt,
  });

  return { code, expiresAt };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "consumed" | "exhausted" | "mismatch" };

/**
 * Verify an OTP code. Marks the most recent matching OTP as consumed on
 * success. Increments `attempts` on mismatch; after `MAX_ATTEMPTS` the
 * OTP is permanently consumed.
 *
 * `expectedSessionIdHash` enforces the per-session binding from
 * `issueOtp`. If the issuing call set a binding, verification must
 * present the same session hash.
 */
export async function verifyOtp(args: {
  userId: string;
  purpose: OtpPurpose;
  code: string;
  expectedSessionIdHash?: string;
}): Promise<OtpVerifyResult> {
  // Latest unconsumed OTP for (user, purpose), still in TTL.
  const rows = await db
    .select()
    .from(oneTimePasswords)
    .where(
      and(
        eq(oneTimePasswords.userId, args.userId),
        eq(oneTimePasswords.purpose, args.purpose),
        isNull(oneTimePasswords.consumedAt),
        gt(oneTimePasswords.expiresAt, new Date()),
      ),
    )
    .orderBy(sql`${oneTimePasswords.createdAt} DESC`)
    .limit(1);

  const otp = rows[0];
  if (!otp) return { ok: false, reason: "not_found" };

  if (otp.attempts >= MAX_ATTEMPTS) {
    await db
      .update(oneTimePasswords)
      .set({ consumedAt: new Date() })
      .where(eq(oneTimePasswords.id, otp.id));
    return { ok: false, reason: "exhausted" };
  }

  // Session binding check first — bumps the attempts counter too.
  if (otp.bindSessionIdHash && otp.bindSessionIdHash !== args.expectedSessionIdHash) {
    await db
      .update(oneTimePasswords)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(oneTimePasswords.id, otp.id));
    return { ok: false, reason: "mismatch" };
  }

  const candidate = hashToken(args.code);
  if (!constantTimeEqual(candidate, otp.codeHash)) {
    await db
      .update(oneTimePasswords)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(oneTimePasswords.id, otp.id));
    return { ok: false, reason: "mismatch" };
  }

  // Success — mark consumed.
  await db
    .update(oneTimePasswords)
    .set({ consumedAt: new Date() })
    .where(eq(oneTimePasswords.id, otp.id));
  return { ok: true };
}
