import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import { logSecurityEvent } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const ID_RE = /^[a-z0-9_-]{1,64}$/i;

interface UpdateBody {
  isPublic?: boolean;
  name?: string;
  tagline?: string;
  features?: string[];
  sortOrder?: number;
  maxWorkers?: number;
  maxMonthlyAiDollars?: number;
  maxChannelsPerWorker?: number;
  maxTeamSeats?: number;
}

/**
 * PATCH /api/admin/plans/[id]
 *
 * Edit a plan row. Today's primary use is the admin Plans page's
 * "Archive" / "Re-publish" flow which flips `isPublic`. Other editable
 * fields (name, tagline, features, caps) are also accepted so the form
 * modal can submit any subset.
 *
 * Stripe price IDs and the monetary `priceMonthlyCents` are deliberately
 * NOT editable here — those need to be re-keyed by replacing the row
 * (we never edit prices on the same plan id; we deprecate + insert).
 */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = await rateLimitOr429("api", `admin:${session.user.id}`, {
    userId: session.user.id,
    route: "PATCH /api/admin/plans/[id]",
  });
  if (t) return t;

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }

  const body = await readJson<UpdateBody>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const [current] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, id))
    .limit(1);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.isPublic === "boolean") patch.isPublic = body.isPublic;
  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (!v || v.length > 80) {
      return NextResponse.json(
        { error: "name required (max 80 chars)" },
        { status: 400 },
      );
    }
    patch.name = v;
  }
  if (typeof body.tagline === "string") {
    patch.tagline = body.tagline.trim().slice(0, 240);
  }
  if (Array.isArray(body.features)) {
    patch.features = body.features
      .filter((f) => typeof f === "string" && f.length > 0)
      .slice(0, 40);
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    patch.sortOrder = Math.round(body.sortOrder);
  }
  for (const k of [
    "maxWorkers",
    "maxMonthlyAiDollars",
    "maxChannelsPerWorker",
    "maxTeamSeats",
  ] as const) {
    const v = body[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      patch[k] = Math.round(v);
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }
  patch.updatedAt = new Date();

  await db.update(plans).set(patch).where(eq(plans.id, id));

  await logSecurityEvent({
    kind: "plan.updated",
    tenantId: null,
    userId: session.user.id,
    payload: {
      subject: "plan.updated",
      planId: id,
      fieldsChanged: Object.keys(patch).filter((k) => k !== "updatedAt"),
      isPublic: patch.isPublic,
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
