import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { getClientIp, getUserAgent, readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LocaleBody {
  locale?: string;
}

/**
 * PATCH /api/me/locale
 *
 * Persists the user's chosen locale to both the `users.locale` column
 * (so it sticks across devices) and a cookie (so the proxy middleware
 * can route the next request correctly without hitting the DB).
 *
 * The locale switcher in the UI calls this on change; on success the
 * client navigates to the localized URL.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "PATCH /api/me/locale",
  });
  if (t) return t;

  const body = await readJson<LocaleBody>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const locale = typeof body.locale === "string" ? body.locale : "";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  if (locale === session.user.locale) {
    // Still refresh the cookie so it survives.
    const jar = await cookies();
    jar.set(LOCALE_COOKIE, locale, {
      httpOnly: false, // readable by client for the switcher UI
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
    return NextResponse.json({ ok: true, unchanged: true, locale });
  }

  await db
    .update(users)
    .set({ locale, updatedAt: new Date() })
    .where(eq(users.id, session.userId));

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });

  await logSecurityEvent({
    kind: "user.locale.changed",
    tenantId: session.tenantId,
    userId: session.userId,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    payload: { from: session.user.locale, to: locale },
  });

  return NextResponse.json({ ok: true, locale });
}
