import { type NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/client";
import {
  supportTickets,
  conversations,
  messages,
  workers,
  tenants,
} from "@/lib/db/schema";
import { normalizeEmail } from "@/lib/auth/request";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { classifyTicket } from "@/lib/support/triage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ tenantId: string }>;
}

const ID_RE = /^[0-9a-f-]{36}$/;

/**
 * Verify the HMAC-SHA256 signature on an inbound-email POST. The tenant's
 * forwarder (Mailgun / SendGrid / Postmark / custom) is expected to sign
 * the raw request body with the secret stored on
 * `tenants.inbound_email_secret` and send the hex digest in
 * `x-inbound-signature`. The header may be the bare hex digest or the
 * `sha256=<hex>` form. Constant-time comparison.
 */
function verifyInboundSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!args.signatureHeader) return false;
  const trimmed = args.signatureHeader.trim();
  const m = /^(?:sha256=)?([a-f0-9]{64})$/i.exec(trimmed);
  if (!m) return false;
  const expected = createHmac("sha256", args.secret)
    .update(args.rawBody, "utf8")
    .digest();
  const provided = Buffer.from(m[1], "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Inbound email envelope shape — designed to match what email-receiving
 * services (Mailgun, SendGrid Inbound Parse, Postmark) send when they
 * forward a customer's email to our webhook.
 *
 * The tenant configures their forwarder (or MX) to POST here when an
 * email lands on their support address. We don't host inbound email
 * directly — same BYOI philosophy as outbound.
 */
interface InboundEmailBody {
  /** From: addr — required. */
  from?: string;
  fromName?: string;
  /** Recipient address that received the mail; informational. */
  to?: string;
  subject?: string;
  /** Plain-text body. HTML fallback in `html`. */
  text?: string;
  html?: string;
  /** RFC 5322 Message-ID for this email. Used for dedup + threading. */
  messageId?: string;
  /** In-Reply-To header — Message-ID of the email this replies to. */
  inReplyTo?: string;
  /** References chain — list of Message-IDs. */
  references?: string[];
}

/**
 * POST /api/webhooks/inbound-email/[tenantId]
 *
 * Public endpoint. Auth via HMAC-SHA256 over the raw request body using
 * the tenant's `inbound_email_secret`. Forwarders send the digest in
 * `x-inbound-signature` (bare hex OR `sha256=<hex>`). If the tenant has
 * no secret configured the endpoint refuses with 401 — there is no
 * unauthenticated fallback path anymore.
 *
 * Threading logic:
 *   1. If `inReplyTo` matches a worker_action.payload.messageId we've
 *      already sent, OR a supportTickets.externalThreadId we've stored,
 *      append the inbound as a user message to the existing
 *      conversation. Set ticket.status='open' (reopen if resolved).
 *   2. Otherwise create a fresh ticket. Triage classifier sets the
 *      initial priority + tags. Find a worker on the 'email' channel
 *      and create a conversation + assistant draft via dispatchInbound
 *      (so the existing approval gate applies — the AI's reply needs
 *      human approval before going back out).
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { tenantId } = await ctx.params;
  if (!ID_RE.test(tenantId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const throttled = await rateLimitOr429("webhook", `inbound-email:${tenantId}`, {
    tenantId,
    route: "POST /api/webhooks/inbound-email/[tenantId]",
  });
  if (throttled) return throttled;
  // Confirm the tenant exists + is in a state that accepts traffic.
  const [tenant] = await db
    .select({
      id: tenants.id,
      status: tenants.status,
      inboundEmailSecret: tenants.inboundEmailSecret,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tenant.status !== "trialing" && tenant.status !== "active") {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (!tenant.inboundEmailSecret) {
    // Tenant has not enabled inbound email yet. Don't leak the
    // difference between "no tenant" and "no secret"; respond 401 so
    // probes can't enumerate tenants either.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read raw body bytes BEFORE JSON.parse — HMAC must be over the exact
  // bytes the forwarder signed.
  const rawBody = await req.text();
  const signatureOk = verifyInboundSignature({
    rawBody,
    signatureHeader: req.headers.get("x-inbound-signature"),
    secret: tenant.inboundEmailSecret,
  });
  if (!signatureOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: InboundEmailBody | null;
  try {
    body = JSON.parse(rawBody) as InboundEmailBody;
  } catch {
    body = null;
  }
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const from = normalizeEmail(body.from);
  if (!from) return NextResponse.json({ error: "from is required" }, { status: 400 });
  const subject = typeof body.subject === "string" ? body.subject.slice(0, 240) : "(no subject)";
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });

  const inReplyTo =
    typeof body.inReplyTo === "string" && body.inReplyTo.trim()
      ? body.inReplyTo.trim()
      : null;

  /* ── Threading: does this match an existing ticket? ────────────────── */
  let existingTicketId: string | null = null;
  let existingConversationId: string | null = null;

  if (inReplyTo) {
    // Match against ticket external_thread_id OR a prior outbound
    // action's stored messageId.
    const matchByThread = await db
      .select({
        id: supportTickets.id,
        conversationId: supportTickets.conversationId,
      })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.tenantId, tenantId),
          eq(supportTickets.externalThreadId, inReplyTo),
        ),
      )
      .limit(1);
    if (matchByThread[0]) {
      existingTicketId = matchByThread[0].id;
      existingConversationId = matchByThread[0].conversationId;
    } else {
      // Look at worker_actions.payload->>messageId
      const matchByAction = await db.execute<{
        id: string;
        conversation_id: string | null;
      }>(sql`
        SELECT t.id, t.conversation_id
        FROM ${supportTickets} t
        INNER JOIN worker_actions wa
          ON wa.conversation_id = t.conversation_id
        WHERE t.tenant_id = ${tenantId}
          AND wa.payload->>'messageId' = ${inReplyTo}
        LIMIT 1
      `);
      if (matchByAction[0]) {
        existingTicketId = matchByAction[0].id;
        existingConversationId = matchByAction[0].conversation_id;
      }
    }
  }

  if (existingTicketId && existingConversationId) {
    // Append to existing thread
    await db.insert(messages).values({
      tenantId,
      conversationId: existingConversationId,
      role: "user",
      content: text,
    });
    await db
      .update(supportTickets)
      .set({
        status: "open", // reopen if resolved
        bodyPreview: text.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, existingTicketId));
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, existingConversationId));
    return NextResponse.json({
      ok: true,
      threaded: true,
      ticketId: existingTicketId,
    });
  }

  /* ── New ticket path ────────────────────────────────────────────────── */
  // Find a worker on the 'email' channel
  const tenantWorkers = await db
    .select()
    .from(workers)
    .where(and(eq(workers.tenantId, tenantId), eq(workers.status, "active")));
  const targetWorker =
    tenantWorkers.find((w) =>
      w.channels.map((c) => c.toLowerCase()).includes("email"),
    ) ?? tenantWorkers[0];
  // Allow tickets to land even with no worker — they queue for human
  // triage. (No worker = no AI draft path, but the row is still useful.)

  const triage = await classifyTicket({
    tenantId,
    workerId: targetWorker?.id ?? null,
    ticketId: null,
    subject,
    body: text,
  });

  // Create the conversation tied to this ticket. channel='email'.
  let conversationId: string | null = null;
  if (targetWorker) {
    const [convo] = await db
      .insert(conversations)
      .values({
        tenantId,
        workerId: targetWorker.id,
        channel: "email",
        externalId: from,
        status: "open",
        customer: { name: body.fromName, email: from },
      })
      .returning();
    conversationId = convo.id;
    // First message in the thread = the customer's inbound
    await db.insert(messages).values({
      tenantId,
      conversationId: convo.id,
      role: "user",
      content: text,
    });
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, convo.id));
  }

  // Issue a short ticket code: TKT-XXXXXX based on a monotonic-ish
  // count of the tenant's tickets. For MVP this is good enough — Sprint
  // 12 will switch to a per-tenant sequence to avoid the count() race.
  const codeCountRows = await db.execute<{ c: number }>(sql`
    SELECT COUNT(*)::int AS c FROM ${supportTickets} WHERE tenant_id = ${tenantId}
  `);
  const codeNum = (codeCountRows[0]?.c ?? 0) + 1;
  const code = `TKT-${String(codeNum).padStart(6, "0")}`;

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      tenantId,
      code,
      subject,
      bodyPreview: text.slice(0, 500),
      channel: "email",
      priority: triage.priority,
      status: "open",
      reporterEmail: from,
      reporterName: body.fromName?.slice(0, 120),
      assignedWorkerId: targetWorker?.id ?? null,
      conversationId,
      externalThreadId: body.messageId ?? inReplyTo ?? null,
      triage: triage as unknown as Record<string, unknown>,
    })
    .returning();

  return NextResponse.json({ ok: true, ticket });
}
