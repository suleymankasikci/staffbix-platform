import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  expoToken?: string;
}

/**
 * POST /api/push/unsubscribe
 *
 * Marks a push subscription revoked (we don't hard-delete so the
 * history is preserved for audit + abuse investigation). Idempotent —
 * unsubscribing an already-revoked token is a no-op.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/push/unsubscribe",
  });
  if (t) return t;

  const body = await readJson<Body>(req);
  if (!body || typeof body.expoToken !== "string") {
    return NextResponse.json({ error: "expoToken is required" }, { status: 400 });
  }

  await db
    .update(pushSubscriptions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(pushSubscriptions.expoToken, body.expoToken),
        eq(pushSubscriptions.userId, session.userId),
      ),
    );

  return NextResponse.json({ ok: true });
}
