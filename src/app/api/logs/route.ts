import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { db } from "@/lib/db/client";
import { securityEvents, users, workerActions, workers } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/logs
 *
 * Returns a flat, time-sorted feed for the /app/logs page. Merges two
 * sources:
 *   - security_events (auth/admin/system kinds)
 *   - worker_actions  (ai-action/approval kinds — drafted/approved/sent)
 *
 * Query params:
 *   ?range=today|last7|last30|all   (default last7)
 *   ?type=auth|ai-action|admin|approval|system|all  (default all)
 *   ?limit=N        (1..500, default 200)
 *
 * The shape mirrors `LogEntry` (src/lib/audit-logs.ts) so the page can
 * render with no transformer in the middle.
 */

type LogType = "auth" | "ai-action" | "admin" | "approval" | "system";
type LogResult = "success" | "blocked" | "failed";

interface LogEntryDTO {
  id: string;
  at: string;
  type: LogType;
  actorKind: "human" | "ai" | "system";
  actorName: string;
  actorMeta?: string;
  action: string;
  target?: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  flag: string;
  device: string;
  browser: string;
  language: string;
  result: LogResult;
}

function kindToType(kind: string): { type: LogType; result: LogResult; verb: string } {
  // Auth kinds
  if (kind === "user.login.password_ok") return { type: "auth", result: "success", verb: "Logged in" };
  if (kind === "user.login.password_fail") return { type: "auth", result: "failed", verb: "Failed login" };
  if (kind === "user.login.locked") return { type: "auth", result: "blocked", verb: "Login locked" };
  if (kind === "user.signup") return { type: "auth", result: "success", verb: "Signed up" };
  if (kind === "user.email_verified") return { type: "auth", result: "success", verb: "Email verified" };
  if (kind === "user.otp.issued") return { type: "auth", result: "success", verb: "OTP issued" };
  if (kind === "user.otp.ok") return { type: "auth", result: "success", verb: "OTP accepted" };
  if (kind === "user.otp.fail") return { type: "auth", result: "failed", verb: "OTP failed" };
  if (kind === "user.otp.exhausted") return { type: "auth", result: "blocked", verb: "OTP exhausted" };
  if (kind === "user.password.reset_requested") return { type: "auth", result: "success", verb: "Password reset requested" };
  if (kind === "user.password.reset_completed") return { type: "auth", result: "success", verb: "Password reset" };
  if (kind === "user.password.changed") return { type: "auth", result: "success", verb: "Password changed" };
  if (kind === "user.session.created") return { type: "auth", result: "success", verb: "Session created" };
  if (kind === "user.session.revoked") return { type: "auth", result: "success", verb: "Session revoked" };
  if (kind === "user.new_device") return { type: "auth", result: "success", verb: "New device signed in" };
  if (kind === "user.totp.enrolled") return { type: "auth", result: "success", verb: "TOTP enrolled" };
  if (kind === "user.totp.ok") return { type: "auth", result: "success", verb: "TOTP accepted" };
  if (kind === "user.totp.fail") return { type: "auth", result: "failed", verb: "TOTP failed" };
  // Admin / tenant kinds
  if (kind === "user.banned") return { type: "admin", result: "success", verb: "User banned" };
  if (kind === "user.unbanned") return { type: "admin", result: "success", verb: "User unbanned" };
  if (kind === "user.profile.updated") return { type: "admin", result: "success", verb: "Profile updated" };
  if (kind === "user.locale.changed") return { type: "admin", result: "success", verb: "Locale changed" };
  if (kind === "tenant.created") return { type: "admin", result: "success", verb: "Tenant created" };
  if (kind === "tenant.suspended") return { type: "admin", result: "blocked", verb: "Tenant suspended" };
  if (kind === "tenant.reactivated") return { type: "admin", result: "success", verb: "Tenant reactivated" };
  if (kind === "tenant.invitation.created") return { type: "admin", result: "success", verb: "Invitation created" };
  if (kind === "tenant.invitation.revoked") return { type: "admin", result: "success", verb: "Invitation revoked" };
  if (kind === "tenant.invitation.accepted") return { type: "admin", result: "success", verb: "Invitation accepted" };
  if (kind === "staff.impersonate.start") return { type: "admin", result: "success", verb: "Impersonation started" };
  if (kind === "staff.impersonate.end") return { type: "admin", result: "success", verb: "Impersonation ended" };
  // Fallback bucket
  return { type: "system", result: "success", verb: kind };
}

function deviceOf(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: "—", browser: "—" };
  const lower = ua.toLowerCase();
  let device = "Desktop";
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
    device = "Mobile";
  } else if (lower.includes("ipad") || lower.includes("tablet")) {
    device = "Tablet";
  } else if (lower.includes("bot") || lower.includes("curl") || lower.includes("node")) {
    device = "Server";
  }
  let browser = "Unknown";
  if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/")) browser = "Chrome";
  else if (lower.includes("safari/")) browser = "Safari";
  return { device, browser };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/logs",
  });
  if (t) return t;

  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ?? "last7") as
    | "today"
    | "last7"
    | "last30"
    | "all";
  const type = (url.searchParams.get("type") ?? "all") as LogType | "all";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 200)));

  let since: Date | null = null;
  if (range === "today") since = new Date(Date.now() - 24 * 3600_000);
  else if (range === "last7") since = new Date(Date.now() - 7 * 24 * 3600_000);
  else if (range === "last30") since = new Date(Date.now() - 30 * 24 * 3600_000);

  // ── security_events ────────────────────────────────────────────────
  const seConditions = [eq(securityEvents.tenantId, session.tenantId)];
  if (since) seConditions.push(gte(securityEvents.createdAt, since));

  const seRows = await db
    .select({
      id: securityEvents.id,
      createdAt: securityEvents.createdAt,
      kind: securityEvents.kind,
      ip: securityEvents.ip,
      userAgent: securityEvents.userAgent,
      payload: securityEvents.payload,
      userId: securityEvents.userId,
      userName: users.name,
      userRole: users.role,
    })
    .from(securityEvents)
    .leftJoin(users, eq(users.id, securityEvents.userId))
    .where(and(...seConditions))
    .orderBy(desc(securityEvents.createdAt))
    .limit(limit);

  const secLogs: LogEntryDTO[] = seRows.map((r) => {
    const t = kindToType(r.kind);
    const ua = deviceOf(r.userAgent);
    const payload = (r.payload as Record<string, unknown> | null) ?? null;
    const target = payload && typeof payload === "object" ? JSON.stringify(payload).slice(0, 160) : undefined;
    return {
      id: r.id,
      at: r.createdAt.toISOString(),
      type: t.type,
      actorKind: r.userName ? "human" : "system",
      actorName: r.userName ?? "system",
      actorMeta: r.userRole ?? undefined,
      action: t.verb,
      target,
      ip: r.ip ? String(r.ip) : "—",
      city: "—",
      region: "—",
      country: "—",
      countryCode: "—",
      flag: "🌐",
      device: ua.device,
      browser: ua.browser,
      language: "—",
      result: t.result,
    };
  });

  // ── worker_actions (approval + ai-action) ──────────────────────────
  const waConditions = [eq(workerActions.tenantId, session.tenantId)];
  if (since) waConditions.push(gte(workerActions.createdAt, since));

  const waRows = await db
    .select({
      id: workerActions.id,
      createdAt: workerActions.createdAt,
      status: workerActions.status,
      kind: workerActions.kind,
      workerName: workers.name,
      workerRole: workers.roleSlug,
      payload: workerActions.payload,
    })
    .from(workerActions)
    .innerJoin(workers, eq(workers.id, workerActions.workerId))
    .where(and(...waConditions))
    .orderBy(desc(workerActions.createdAt))
    .limit(limit);

  const actionLogs: LogEntryDTO[] = waRows.map((r) => {
    const isAuto = r.status === "auto" || r.status === "sent";
    const verbByStatus: Record<string, string> = {
      pending: "Drafted",
      approved: "Approved",
      sent: "Sent",
      rejected: "Rejected",
      auto: "Auto-sent",
      failed: "Failed",
    };
    const verb = verbByStatus[r.status] ?? r.status;
    const payload = (r.payload as Record<string, unknown> | null) ?? null;
    const subj = payload?.subject ? String(payload.subject) : null;
    const to = payload?.to ? String(payload.to) : null;
    const target = [r.kind, subj, to].filter(Boolean).join(" · ").slice(0, 200) || undefined;
    return {
      id: r.id,
      at: r.createdAt.toISOString(),
      type: isAuto ? "ai-action" : "approval",
      actorKind: "ai",
      actorName: r.workerName,
      actorMeta: r.workerRole.replace(/-/g, " "),
      action: verb,
      target,
      ip: "—",
      city: "—",
      region: "—",
      country: "—",
      countryCode: "—",
      flag: "🤖",
      device: "Server",
      browser: "Edge runtime",
      language: "EN",
      result: r.status === "failed" || r.status === "rejected" ? "failed" : "success",
    };
  });

  // ── merge + filter ─────────────────────────────────────────────────
  let merged = [...secLogs, ...actionLogs];
  if (type !== "all") merged = merged.filter((l) => l.type === type);
  merged.sort((a, b) => (a.at < b.at ? 1 : -1));
  if (merged.length > limit) merged = merged.slice(0, limit);

  // ── counts (per type, after range filter) ──────────────────────────
  const allCounted = [...secLogs, ...actionLogs];
  const counts: Record<LogType | "all", number> = {
    all: allCounted.length,
    auth: 0,
    "ai-action": 0,
    admin: 0,
    approval: 0,
    system: 0,
  };
  for (const l of allCounted) counts[l.type]++;

  return NextResponse.json({ logs: merged, counts });
}
