import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { logSecurityEvent } from "@/lib/audit/log";
import { getClientIp, getUserAgent } from "@/lib/auth/request";
import { UUID_RE } from "@/lib/admin-routes";
import { rotateTenantDek } from "@/lib/crypto/dek";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/tenants/[id]/rotate-dek
 *
 * Sprint 18 — rotates the tenant's DEK and re-encrypts every
 * tenant-scoped ciphertext column (integrations.secret_blob,
 * users.totp_secret_blob) atomically under the new key.
 *
 * Auth: platform admin only. Rate-limited under the same `admin:<id>`
 * bucket as every other admin write so an automated tool can't burn
 * through tenants in a loop. Emits one `tenant.dek_rotated` audit event
 * with the affected-row counts in the payload.
 *
 * Safe to retry — `rotateTenantDek` is wrapped in a transaction. If a
 * row is mid-rotation when the request crashes, the wrapped DEK swap
 * never lands and every row remains decryptable under the prior DEK.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "POST /api/admin/tenants/[id]/rotate-dek",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  try {
    const [tenantRow] = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    if (!tenantRow) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const result = await rotateTenantDek(id);

    await logSecurityEvent({
      kind: "tenant.dek_rotated",
      tenantId: id,
      userId: session.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      payload: {
        actorUserId: session.user.id,
        tenantName: tenantRow.name,
        newVersion: result.newVersion,
        integrationsReencrypted: result.integrations,
        userTotpReencrypted: result.userTotp,
        totalRowsReencrypted: result.rotated,
      },
    });

    return NextResponse.json({
      ok: true,
      newVersion: result.newVersion,
      rotated: result.rotated,
      integrations: result.integrations,
      userTotp: result.userTotp,
    });
  } catch (err) {
    console.error("[admin.tenants.rotate-dek] failed", err);
    return NextResponse.json(
      { error: "Could not rotate tenant DEK." },
      { status: 500 },
    );
  }
}
