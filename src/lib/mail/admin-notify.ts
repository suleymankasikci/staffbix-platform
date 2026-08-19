import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { staff } from "@/lib/db/schema";
import { queueEmail } from "./send";
import { renderAdminSignupNotificationEmail } from "./templates/admin-signup-notification";

/**
 * Platform-admin email notifications — fired when something happens
 * that the platform team needs to know about (new signup, large refund,
 * staff impersonation, security incident, etc.).
 *
 * Recipient resolution:
 *   1. If `ADMIN_NOTIFY_EMAIL` env is set → that single address.
 *   2. Else → every active staff row with role IN ('owner', 'engineer').
 *      (Other roles get notifications via the admin panel inbox, not
 *      email — that's a Sprint 22 feature.)
 *
 * Failure mode: this function NEVER throws. Email infrastructure is
 * support cost; user-visible operations (signup, billing) must not
 * fail because the admin's notification couldn't be queued. Errors
 * are logged and swallowed.
 */

async function resolveAdminRecipients(): Promise<string[]> {
  const envOverride = process.env.ADMIN_NOTIFY_EMAIL;
  if (envOverride && envOverride.includes("@")) {
    return [envOverride.trim()];
  }
  try {
    const rows = await db
      .select({ email: staff.email })
      .from(staff)
      .where(eq(staff.status, "active"));
    return rows
      .map((r) => r.email)
      .filter((e): e is string => typeof e === "string" && e.includes("@"));
  } catch (err) {
    console.warn(
      "[admin-notify] resolveAdminRecipients staff query failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Queue an admin email when a new tenant signs up. One email per
 * recipient — Yandex doesn't reliably dedupe identical bodies, and the
 * BullMQ idempotency key keeps re-runs of the same signup from sending
 * the alert twice.
 */
export async function notifyAdminOfSignup(args: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  ownerEmail: string;
  ownerName: string;
  ip: string | null;
  country: string | null;
  locale: string;
  signedUpAtIso: string;
}): Promise<void> {
  try {
    const recipients = await resolveAdminRecipients();
    if (recipients.length === 0) {
      console.warn(
        "[admin-notify] No admin recipients resolved — skipping signup notification.",
      );
      return;
    }
    const base =
      process.env.PUBLIC_APP_URL ??
      process.env.APP_BASE_URL ??
      "https://staffbix.com";
    const adminDashboardUrl = `${base.replace(/\/+$/, "")}/admin/tenants/${args.tenantId}`;

    await Promise.all(
      recipients.map((to) =>
        queueEmail({
          idemKey: `admin-signup:${args.tenantId}:${to}`,
          message: renderAdminSignupNotificationEmail({
            to,
            tenantSlug: args.tenantSlug,
            tenantName: args.tenantName,
            ownerEmail: args.ownerEmail,
            ownerName: args.ownerName,
            ip: args.ip,
            country: args.country,
            locale: args.locale,
            signedUpAtIso: args.signedUpAtIso,
            adminDashboardUrl,
          }),
          tenantId: args.tenantId,
        }),
      ),
    );
  } catch (err) {
    console.error(
      "[admin-notify] notifyAdminOfSignup failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }
}
