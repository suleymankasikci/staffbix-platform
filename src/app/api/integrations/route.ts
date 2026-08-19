import { type NextRequest, NextResponse } from "next/server";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";
import {
  createIntegration,
  listIntegrations,
  type IntegrationKind,
} from "@/lib/integrations/manage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  kind?: string;
  displayName?: string;
  externalId?: string | null;
  secret?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const VALID_KINDS: IntegrationKind[] = ["whatsapp", "email_smtp", "instagram"];

/**
 * GET /api/integrations — list (without secret material) for the
 * caller's tenant.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/integrations",
  });
  if (t) return t;
  const rows = await listIntegrations(session.tenantId);
  return NextResponse.json({ integrations: rows });
}

/**
 * POST /api/integrations — register a new integration.
 *
 * Body shape (depends on `kind`):
 *   whatsapp:    { kind, displayName, externalId (phoneNumberId),
 *                  secret: { phoneNumberId, accessToken, appSecret, verifyToken } }
 *   email_smtp:  { kind, displayName, externalId="smtp",
 *                  secret: { host, port, user, pass, fromAddress, useTls? } }
 *   instagram:   { kind, displayName, externalId (pageId),
 *                  secret: { pageId, accessToken, appSecret, verifyToken } }
 *
 * Auth: Owner/Admin only.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner" && session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/integrations",
  });
  if (t) return t;

  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const kind = body.kind as IntegrationKind;
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `kind must be one of ${VALID_KINDS.join(", ")}` },
      { status: 400 },
    );
  }
  if (typeof body.displayName !== "string" || !body.displayName.trim()) {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }
  if (!body.secret || typeof body.secret !== "object") {
    return NextResponse.json({ error: "secret is required" }, { status: 400 });
  }

  // Per-kind shape validation. We're lenient on extra keys (forward-compat)
  // but strict on required ones.
  if (kind === "whatsapp" || kind === "instagram") {
    const required = ["accessToken", "appSecret", "verifyToken"];
    for (const k of required) {
      if (typeof (body.secret as Record<string, unknown>)[k] !== "string") {
        return NextResponse.json(
          { error: `secret.${k} is required` },
          { status: 400 },
        );
      }
    }
  }
  if (kind === "whatsapp") {
    if (typeof (body.secret as Record<string, unknown>).phoneNumberId !== "string") {
      return NextResponse.json(
        { error: "secret.phoneNumberId is required for whatsapp" },
        { status: 400 },
      );
    }
  }
  if (kind === "email_smtp") {
    const required = ["host", "port", "user", "pass", "fromAddress"];
    for (const k of required) {
      if ((body.secret as Record<string, unknown>)[k] == null) {
        return NextResponse.json(
          { error: `secret.${k} is required for email_smtp` },
          { status: 400 },
        );
      }
    }
  }

  try {
    const row = await createIntegration({
      tenantId: session.tenantId,
      kind,
      displayName: body.displayName.trim().slice(0, 120),
      externalId:
        typeof body.externalId === "string" ? body.externalId.slice(0, 200) : null,
      // Type-assert at the boundary — the per-kind shape check above is
      // the validation layer.
      secret: body.secret as never,
      metadata: body.metadata ?? {},
    });
    return NextResponse.json({ ok: true, integration: row });
  } catch (e: unknown) {
    const err = e as { cause?: { code?: string; constraint_name?: string } };
    if (
      err.cause?.code === "23505" &&
      err.cause?.constraint_name === "integrations_kind_external_id_unique"
    ) {
      return NextResponse.json(
        { error: "This external_id is already connected to another tenant." },
        { status: 409 },
      );
    }
    console.error("[integrations] create failed:", e);
    return NextResponse.json({ error: "Could not create integration." }, { status: 500 });
  }
}
