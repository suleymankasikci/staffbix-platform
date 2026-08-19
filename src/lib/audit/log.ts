import { db } from "../db/client";
import { securityEvents } from "../db/schema";
import type { SecurityEvent } from "../db/schema";
import { emitAxiom } from "./axiom";

type Kind = SecurityEvent["kind"];

/**
 * Append a security event. Always succeeds — the table accepts NULL
 * `tenant_id` and `user_id`, and the call is fire-and-forget from the
 * web layer (we await it inside transactions, otherwise from a
 * `.catch(...)` so a logging failure never breaks an auth flow).
 *
 * Sprint 12 also fans the event out to Axiom (best-effort, never blocks
 * or throws). The Postgres row stays the system of record; Axiom is the
 * queryable long-retention mirror.
 */
export async function logSecurityEvent(args: {
  kind: Kind;
  tenantId?: string | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(securityEvents).values({
      kind: args.kind,
      tenantId: args.tenantId ?? null,
      userId: args.userId ?? null,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
      payload: args.payload ?? null,
    });
  } catch (err) {
    // Never let audit-log failures break the request — but be loud.
    console.error("[audit] failed to insert security_event", args.kind, err);
  }

  // Fan-out to Axiom without awaiting. emitAxiom is a no-op when
  // AXIOM_TOKEN is unset, and swallows errors internally.
  void emitAxiom({
    kind: args.kind,
    tenantId: args.tenantId ?? null,
    userId: args.userId ?? null,
    ip: args.ip ?? null,
    userAgent: args.userAgent ?? null,
    payload: args.payload ?? null,
  });
}
