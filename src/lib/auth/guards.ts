import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { staff } from "../db/schema";
import {
  resolveSession,
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  type ResolvedSession,
} from "./session";

/**
 * Server-side session resolution. Returns the verified session or null.
 * Use these inside Route Handlers and Server Components to enforce
 * authentication.
 *
 * `requireApp()` rejects sessions that haven't completed OTP verification.
 * `requireAdmin()` additionally requires the admin cookie and a staff-
 * eligible role.
 */

export async function requireApp(): Promise<ResolvedSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await resolveSession(token);
  if (!s) {
    jar.delete(SESSION_COOKIE);
    return null;
  }
  if (!s.otpVerified) return null;
  return s;
}

export async function requireAdmin(): Promise<ResolvedSession | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await resolveSession(token);
  if (!s) {
    jar.delete(ADMIN_SESSION_COOKIE);
    return null;
  }
  if (!s.otpVerified) return null;

  // Re-check platform staff membership on every request, not just at
  // login. POST /api/auth/login gates admin scope on an active `staff`
  // row, but that check happened once and the cookie lives for 14 days
  // — revoking someone in the staff table left their existing admin
  // session working until it expired. Mirrors the login-time rule,
  // including the dev-only Owner fallback so local dogfooding still
  // works without provisioning a staff row.
  const [staffRow] = await db
    .select({ status: staff.status })
    .from(staff)
    .where(eq(staff.email, s.user.email))
    .limit(1);
  if (staffRow?.status === "active") return s;

  if (process.env.NODE_ENV !== "production" && s.user.role === "Owner") return s;
  return null;
}
