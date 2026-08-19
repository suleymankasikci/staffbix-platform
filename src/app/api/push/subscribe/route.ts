import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { isExpoPushToken } from "@/lib/notifications/expo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  expoToken?: string;
  deviceLabel?: string;
}

/**
 * POST /api/push/subscribe
 *
 * Registers an Expo push token for the calling user. Idempotent: if
 * the same token is posted again it's just refreshed (revokedAt
 * cleared, lastSeenAt bumped). Used by the mobile app on launch.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/push/subscribe",
  });
  if (t) return t;

  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (!isExpoPushToken(body.expoToken)) {
    return NextResponse.json(
      { error: "expoToken must look like 'ExponentPushToken[…]'" },
      { status: 400 },
    );
  }

  const deviceLabel =
    typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 80) : null;

  // Look up by token (unique). Different users can never register the
  // same physical-device token; Expo guarantees uniqueness per install.
  const existing = await db
    .select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.expoToken, body.expoToken!))
    .limit(1);

  if (existing[0]) {
    // Token already registered. Either same user (refresh) or different
    // user (device handoff — old owner signed out, new owner signed in).
    await db
      .update(pushSubscriptions)
      .set({
        userId: session.userId,
        tenantId: session.tenantId,
        deviceLabel,
        lastSeenAt: new Date(),
        revokedAt: null,
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
    return NextResponse.json({ ok: true, refreshed: true });
  }

  const [row] = await db
    .insert(pushSubscriptions)
    .values({
      tenantId: session.tenantId,
      userId: session.userId,
      expoToken: body.expoToken!,
      deviceLabel,
    })
    .returning({ id: pushSubscriptions.id });

  return NextResponse.json({ ok: true, subscriptionId: row.id });
}
