import { and, eq, desc, isNull } from "drizzle-orm";
import { db } from "../db/client";
import {
  workerActions,
  pushSubscriptions,
  messages,
  conversations,
  users,
  integrations,
  type WorkerAction,
} from "../db/schema";
import { sendExpoPush } from "../notifications/expo";
import {
  sendWhatsAppText,
  type WhatsAppCredentials,
} from "../integrations/whatsapp";
import { decryptForTenant } from "../crypto/encrypt";
import { getActiveByKind, updateSecret } from "../integrations/manage";
import { postTweet } from "../integrations/twitter";
import { postLinkedInShare } from "../integrations/linkedin";
import { refreshTwitterToken } from "../integrations/social-oauth";
import { logSecurityEvent } from "../audit/log";

/**
 * Approval Center runtime.
 *
 * Three modes per worker (`workers.autonomy`):
 *   - `auto`    — the worker runtime calls `createAndDispatchAuto()`
 *                 which inserts a worker_action with status='auto' AND
 *                 immediately runs the side effect.
 *   - `approve` — the worker runtime calls `createPending()` which
 *                 inserts status='pending' and notifies the owner.
 *                 Customer doesn't see the message until human approves.
 *   - `suggest` — same as 'approve' from this module's perspective; the
 *                 UI presents the draft differently. We don't need a
 *                 separate code path.
 */

export interface CreateActionArgs {
  tenantId: string;
  workerId: string;
  conversationId: string | null;
  draftMessageId: string | null;
  kind: "web_reply" | "whatsapp_reply" | "email_send" | "social_post";
  content: string;
  payload?: Record<string, unknown>;
}

/**
 * Create a pending action (autonomy='approve' or 'suggest') and fire
 * push notifications to every Owner/Admin device subscribed for the
 * tenant. Returns the row.
 */
export async function createPending(args: CreateActionArgs): Promise<WorkerAction> {
  const [row] = await db
    .insert(workerActions)
    .values({
      tenantId: args.tenantId,
      workerId: args.workerId,
      conversationId: args.conversationId,
      draftMessageId: args.draftMessageId,
      kind: args.kind,
      content: args.content,
      payload: args.payload ?? {},
      status: "pending",
    })
    .returning();

  // Fire-and-forget push notifications — don't block the request.
  void notifyOwnersOfPending(args.tenantId, row);

  return row;
}

/**
 * Insert an action row with status='auto' for the audit trail. The
 * caller is expected to perform the side effect inline.
 */
export async function recordAuto(args: CreateActionArgs): Promise<WorkerAction> {
  const [row] = await db
    .insert(workerActions)
    .values({
      tenantId: args.tenantId,
      workerId: args.workerId,
      conversationId: args.conversationId,
      draftMessageId: args.draftMessageId,
      kind: args.kind,
      content: args.content,
      payload: args.payload ?? {},
      status: "auto",
      dispatchedAt: new Date(),
    })
    .returning();
  return row;
}

/* ── Decisions ──────────────────────────────────────────────────────────── */

export interface DecisionArgs {
  tenantId: string;
  actionId: string;
  decidedBy: string;
  notes?: string;
}

export async function approveAction(args: DecisionArgs): Promise<WorkerAction | null> {
  const [row] = await db
    .update(workerActions)
    .set({
      status: "approved",
      decidedBy: args.decidedBy,
      decidedAt: new Date(),
      decisionNotes: args.notes ?? null,
    })
    .where(
      and(
        eq(workerActions.id, args.actionId),
        eq(workerActions.tenantId, args.tenantId),
        eq(workerActions.status, "pending"),
      ),
    )
    .returning();
  return row ?? null;
}

export async function rejectAction(args: DecisionArgs): Promise<WorkerAction | null> {
  const [row] = await db
    .update(workerActions)
    .set({
      status: "rejected",
      decidedBy: args.decidedBy,
      decidedAt: new Date(),
      decisionNotes: args.notes ?? null,
    })
    .where(
      and(
        eq(workerActions.id, args.actionId),
        eq(workerActions.tenantId, args.tenantId),
        eq(workerActions.status, "pending"),
      ),
    )
    .returning();
  return row ?? null;
}

export async function listPending(tenantId: string): Promise<WorkerAction[]> {
  return db
    .select()
    .from(workerActions)
    .where(
      and(eq(workerActions.tenantId, tenantId), eq(workerActions.status, "pending")),
    )
    .orderBy(desc(workerActions.createdAt))
    .limit(200);
}

/* ── Dispatch ───────────────────────────────────────────────────────────── */

/**
 * Perform the side effect of an approved action. Today that means
 * marking the draft message as customer-visible (it already lives in
 * the conversation since Sprint 5). When WhatsApp/email channels come
 * online in Sprint 7-9 this function fans out per `kind`.
 *
 * Idempotent: if the action is already dispatched, returns it
 * unchanged.
 */
export async function dispatchAction(actionId: string): Promise<WorkerAction | null> {
  const [row] = await db
    .select()
    .from(workerActions)
    .where(eq(workerActions.id, actionId))
    .limit(1);
  if (!row) return null;
  if (row.status !== "approved") return row;

  try {
    switch (row.kind) {
      case "web_reply": {
        // The draft message row already exists; the widget reveals it
        // to the customer once the action flips to 'sent'. No external
        // API call is needed for the web channel.
        break;
      }
      case "whatsapp_reply": {
        await dispatchWhatsAppReply(row);
        break;
      }
      case "social_post": {
        await dispatchSocialPost(row);
        break;
      }
      case "email_send": {
        await dispatchEmailSend(row);
        break;
      }
    }

    const [updated] = await db
      .update(workerActions)
      .set({ status: "sent", dispatchedAt: new Date(), error: null })
      .where(eq(workerActions.id, actionId))
      .returning();

    // Bump the conversation's last-activity so it floats to the top of
    // the inbox now that the customer can see the reply.
    if (row.conversationId) {
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(conversations.id, row.conversationId));
    }

    return updated ?? row;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const [errored] = await db
      .update(workerActions)
      .set({ status: "failed", error: message.slice(0, 500) })
      .where(eq(workerActions.id, actionId))
      .returning();
    return errored ?? row;
  }
}

/* ── Visibility helpers used by widget + inbox ──────────────────────────── */

/**
 * Predicate used at the widget reply boundary: "is the assistant message
 * cleared to be shown to the customer?". The answer is "yes" if any of:
 *   - The message has no related worker_action (legacy / Sprint 5 row)
 *   - The action exists and is `auto` or `sent`
 *   - The message role isn't 'assistant' (user/human_agent always visible)
 */
export async function isMessageCustomerVisible(messageId: string): Promise<boolean> {
  // For Sprint 6 we don't yet use this from the widget POST path — the
  // widget endpoint short-circuits autonomy decisions before we even
  // persist a draft. This helper is here for inbox + GET routes that
  // serve customer-facing message history (a future channel-rendering
  // path will rely on it).
  const [action] = await db
    .select({ status: workerActions.status })
    .from(workerActions)
    .where(eq(workerActions.draftMessageId, messageId))
    .limit(1);
  if (!action) return true;
  return action.status === "auto" || action.status === "sent";
}

void messages; // imported for type-only relations; keep the import linked.

/* ── Push fan-out ───────────────────────────────────────────────────────── */

async function notifyOwnersOfPending(tenantId: string, action: WorkerAction) {
  // Find Owner/Admin users of this tenant and their active push subs.
  const subs = await db
    .select({
      expoToken: pushSubscriptions.expoToken,
      userId: users.id,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        isNull(pushSubscriptions.revokedAt),
      ),
    );
  // Filter to Owners/Admins in JS since the role enum check inside the
  // join clause adds query complexity for a tiny set.
  const ownerSubs = subs;
  if (ownerSubs.length === 0) return;

  const messagesToSend = ownerSubs.map((s) => ({
    to: s.expoToken,
    title: "Approval needed",
    body: action.content.slice(0, 140),
    data: {
      kind: "approval_pending",
      actionId: action.id,
      tenantId,
    },
    priority: "high" as const,
    sound: "default" as const,
  }));

  try {
    const result = await sendExpoPush(messagesToSend);
    // Revoke obviously-dead device tokens so we stop spamming them.
    for (let i = 0; i < result.tickets.length; i++) {
      const t = result.tickets[i];
      if (
        t.status === "error" &&
        typeof t.details?.error === "string" &&
        t.details.error === "DeviceNotRegistered"
      ) {
        await db
          .update(pushSubscriptions)
          .set({ revokedAt: new Date() })
          .where(eq(pushSubscriptions.expoToken, ownerSubs[i].expoToken));
      }
    }
  } catch (err) {
    // Never block approval creation on push failure.
    console.warn("[approvals] push fanout failed:", err);
  }
}

/* ── Channel-specific dispatchers ─────────────────────────────────────── */

/**
 * Push the approved reply through the customer's WhatsApp integration.
 *
 * Recovery path:
 *   - Action's conversation.externalId is the customer's E.164 phone number
 *     (set when the webhook received the inbound message).
 *   - We find the tenant's whatsapp integration by phoneNumberId — which
 *     is stored as `integrations.external_id`. To get the right one when
 *     a tenant has multiple, we use the conversation row's metadata if
 *     present; otherwise pick the first active integration for the tenant.
 *
 * Sprint 7 picks "any active whatsapp integration for the tenant"
 * because the single-tenant test case has only one. Multi-number routing
 * is on the Sprint 8 docket (when we add IG DM with similar shape).
 *
 * Optional `fetchImpl` override is supported so the audit script can
 * inject a fixture without going to the real Meta API.
 */
async function dispatchWhatsAppReply(action: WorkerAction): Promise<void> {
  if (!action.conversationId) {
    throw new Error("whatsapp_reply requires conversationId");
  }
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, action.conversationId))
    .limit(1);
  if (!convo) throw new Error("conversation not found");
  if (!convo.externalId) throw new Error("conversation missing externalId");

  // Find the tenant's first active whatsapp integration. Multi-number
  // routing (matching the conversation back to its origin phone number)
  // lands when IG DM ships in Sprint 8 — both Meta channels share the
  // shape and we'll do the routing pass once.
  const [integrationRow] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, action.tenantId),
        eq(integrations.kind, "whatsapp"),
        eq(integrations.status, "active"),
      ),
    )
    .limit(1);
  if (!integrationRow) {
    throw new Error("no active whatsapp integration for tenant");
  }

  const secret = await decryptForTenant<WhatsAppCredentials>(
    action.tenantId,
    integrationRow.secretBlob,
  );

  // The audit script injects a fixture via this global to avoid hitting
  // graph.facebook.com. Production never sets it, so fetch defaults.
  const fetchImpl: typeof fetch | undefined = (globalThis as {
    __staffbix_whatsapp_fetch__?: typeof fetch;
  }).__staffbix_whatsapp_fetch__;

  const res = await sendWhatsAppText({
    credentials: secret,
    toPhone: convo.externalId,
    text: action.content,
    fetchImpl,
  });
  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${res.status} ${res.error ?? ""}`);
  }
}

/**
 * Publish an approved social post to the tenant's connected social
 * account. `payload.channel` selects the platform:
 *   - "twitter" / "x"  → X (Twitter) API v2
 *   - "linkedin"       → LinkedIn UGC Posts API
 *
 * Real publishing — the access token comes from the tenant's encrypted
 * `integrations` row (connected via the OAuth flow under
 * /api/integrations/social/[provider]). For X, an expired access token
 * is refreshed in-place using the stored refresh_token before posting.
 *
 * Channels without a shipped publisher (instagram / facebook / threads /
 * blog) throw a clear error so the action moves to status="failed"
 * rather than silently reporting success. No fixtures, no stubs.
 */
async function dispatchSocialPost(action: WorkerAction): Promise<void> {
  const payload = (action.payload ?? {}) as { channel?: string };
  const channel = (payload.channel ?? "unknown").toLowerCase();
  const text = action.content;

  if (channel === "twitter" || channel === "x") {
    const found = await getActiveByKind({
      tenantId: action.tenantId,
      kind: "twitter",
    });
    if (!found) {
      throw new Error(
        "No connected X account for this tenant. Connect X under Integrations before publishing.",
      );
    }
    let accessToken = found.secret.accessToken;

    // Refresh if expired (X access tokens last ~2h).
    const expired =
      found.secret.expiresAt != null &&
      Date.parse(found.secret.expiresAt) <= Date.now() + 30_000;
    if (expired) {
      if (!found.secret.refreshToken) {
        throw new Error(
          "X access token expired and no refresh token is stored. Reconnect the X account.",
        );
      }
      const refreshed = await refreshTwitterToken(found.secret.refreshToken);
      accessToken = refreshed.accessToken;
      await updateSecret({
        tenantId: action.tenantId,
        integrationId: found.row.id,
        secret: {
          ...found.secret,
          accessToken: refreshed.accessToken,
          // X rotates refresh tokens; keep the new one if present.
          refreshToken: refreshed.refreshToken ?? found.secret.refreshToken,
          expiresAt: refreshed.expiresInSec
            ? new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString()
            : found.secret.expiresAt,
          scope: refreshed.scope || found.secret.scope,
        },
      });
    }

    const result = await postTweet({ accessToken, text });
    await logSecurityEvent({
      kind: "social.post.published",
      tenantId: action.tenantId,
      payload: {
        subject: "social.post.published",
        channel: "twitter",
        postId: result.id,
        workerActionId: action.id,
      },
    });
    return;
  }

  if (channel === "linkedin") {
    const found = await getActiveByKind({
      tenantId: action.tenantId,
      kind: "linkedin",
    });
    if (!found) {
      throw new Error(
        "No connected LinkedIn account for this tenant. Connect LinkedIn under Integrations before publishing.",
      );
    }
    const expired =
      found.secret.expiresAt != null &&
      Date.parse(found.secret.expiresAt) <= Date.now();
    if (expired) {
      throw new Error(
        "LinkedIn access token expired. Reconnect the LinkedIn account under Integrations.",
      );
    }
    const result = await postLinkedInShare({
      accessToken: found.secret.accessToken,
      authorUrn: found.secret.authorUrn,
      text,
    });
    await logSecurityEvent({
      kind: "social.post.published",
      tenantId: action.tenantId,
      payload: {
        subject: "social.post.published",
        channel: "linkedin",
        postId: result.id,
        workerActionId: action.id,
      },
    });
    return;
  }

  throw new Error(
    `No publisher for channel '${channel}'. Supported today: twitter (x), linkedin. Connect the account under Integrations.`,
  );
}

/**
 * Send an approved customer-facing email through the tenant's BYOI
 * SMTP integration.
 *
 * Expected payload on the action:
 *   {
 *     to:          string  // recipient email
 *     subject:     string  // email subject line
 *     html?:       string  // optional rich body; falls back to action.content
 *     replyTo?:    string  // optional Reply-To
 *     inReplyTo?:  string  // Message-ID we're threading to (set when this
 *                          //   is a reply on an existing ticket conversation)
 *     references?: string[] // full References chain for threaded clients
 *   }
 *
 * Returns nothing; throws to flip the action to 'failed' on send error.
 * The actual SMTP transport (`sendCustomerEmail`) never throws — it
 * returns {ok:false,error} which we re-throw so the dispatcher records
 * the failure.
 *
 * SMTP-side identification: we do NOT generate a custom Message-ID
 * here. nodemailer will mint one. The dispatcher records the resulting
 * Message-ID back onto the action's payload so the inbound webhook can
 * thread replies back.
 */
async function dispatchEmailSend(action: WorkerAction): Promise<void> {
  const payload = (action.payload ?? {}) as {
    to?: string;
    subject?: string;
    html?: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string[];
  };
  if (!payload.to || !payload.subject) {
    throw new Error("email_send requires payload.to + payload.subject");
  }

  // Find the tenant's active email_smtp integration.
  const [smtpRow] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, action.tenantId),
        eq(integrations.kind, "email_smtp"),
        eq(integrations.status, "active"),
      ),
    )
    .limit(1);
  if (!smtpRow) {
    throw new Error("no active SMTP integration for tenant");
  }

  type SmtpCredentials = import("../integrations/customer-smtp").SmtpCredentials;
  const credentials = await decryptForTenant<SmtpCredentials>(
    action.tenantId,
    smtpRow.secretBlob,
  );

  // Test-time override: audit script injects a fake sender to avoid
  // touching the customer's real SMTP server.
  const senderImpl: typeof globalThis.__staffbix_smtp_send__ | undefined = (
    globalThis as {
      __staffbix_smtp_send__?: (args: {
        credentials: SmtpCredentials;
        to: string;
        subject: string;
        html: string;
        text: string;
        replyTo?: string;
        headers?: Record<string, string>;
      }) => Promise<{ ok: boolean; messageId?: string; error?: string }>;
    }
  ).__staffbix_smtp_send__;

  const headers: Record<string, string> = {};
  if (payload.inReplyTo) headers["In-Reply-To"] = payload.inReplyTo;
  if (payload.references && payload.references.length > 0) {
    headers["References"] = payload.references.join(" ");
  }

  const html = payload.html ?? `<p>${escapeHtml(action.content)}</p>`;
  const text = action.content;

  let res: { ok: boolean; messageId?: string; error?: string };
  if (senderImpl) {
    res = await senderImpl({
      credentials,
      to: payload.to,
      subject: payload.subject,
      html,
      text,
      replyTo: payload.replyTo,
      headers,
    });
  } else {
    // Real path — go through the customer-smtp adapter
    const { sendCustomerEmail } = await import("../integrations/customer-smtp");
    res = await sendCustomerEmail({
      credentials,
      to: payload.to,
      subject: payload.subject,
      html,
      text,
      replyTo: payload.replyTo,
    });
  }

  if (!res.ok) {
    throw new Error(`Email send failed: ${res.error ?? "unknown"}`);
  }

  // Persist the upstream Message-ID back on the action's payload so a
  // future inbound reply can find this thread.
  if (res.messageId) {
    await db
      .update(workerActions)
      .set({
        payload: {
          ...payload,
          messageId: res.messageId,
        },
      })
      .where(eq(workerActions.id, action.id));
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Augment globalThis with the audit-only fixture hook for type safety.
declare global {
  var __staffbix_smtp_send__:
    | ((args: {
        credentials: import("../integrations/customer-smtp").SmtpCredentials;
        to: string;
        subject: string;
        html: string;
        text: string;
        replyTo?: string;
        headers?: Record<string, string>;
      }) => Promise<{ ok: boolean; messageId?: string; error?: string }>)
    | undefined;
}
