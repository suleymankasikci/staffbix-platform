import { type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { decryptForTenant } from "@/lib/crypto/encrypt";
import {
  verifyMetaSignature,
  answerWebhookChallenge,
  parseInboundEvent,
  type WhatsAppCredentials,
} from "@/lib/integrations/whatsapp";
import { dispatchInbound } from "@/lib/workers/runtime";
import { workers } from "@/lib/db/schema";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ tenantId: string }>;
}

const ID_RE = /^[0-9a-f-]{36}$/;

/**
 * GET /api/webhooks/whatsapp/[tenantId]
 *
 * Meta's initial subscription verification. Meta sends:
 *   ?hub.mode=subscribe&hub.challenge=<int>&hub.verify_token=<configured>
 * We look up the tenant's WhatsApp integration, compare the verify
 * token, and echo `hub.challenge` back as plaintext on match.
 */
export async function GET(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { tenantId } = await ctx.params;
  if (!ID_RE.test(tenantId)) {
    return new Response("not found", { status: 404 });
  }
  const throttled = await rateLimitOr429("webhook", `whatsapp-verify:${tenantId}`, {
    tenantId,
    route: "GET /api/webhooks/whatsapp/[tenantId]",
  });
  if (throttled) return throttled;

  const url = new URL(req.url);
  // The tenant might have multiple WhatsApp integrations (multiple phone
  // numbers); pick the first active one to find the verify token. Meta
  // sends the same verify token whichever phone number is being subscribed.
  const [integration] = await db
    .select({ secretBlob: integrations.secretBlob })
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.kind, "whatsapp"),
      ),
    )
    .limit(1);
  if (!integration) return new Response("not found", { status: 404 });

  let cred: WhatsAppCredentials;
  try {
    cred = await decryptForTenant<WhatsAppCredentials>(
      tenantId,
      integration.secretBlob,
    );
  } catch {
    return new Response("integration unreadable", { status: 500 });
  }

  const challenge = answerWebhookChallenge({
    query: url.searchParams,
    expectedVerifyToken: cred.verifyToken,
  });
  if (challenge === null) {
    return new Response("forbidden", { status: 403 });
  }
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * POST /api/webhooks/whatsapp/[tenantId]
 *
 * Inbound webhook delivery. Meta sends a signed JSON envelope.
 *
 *  1. Verify X-Hub-Signature-256 against the raw body with the
 *     integration's `appSecret`. Reject 403 on mismatch.
 *  2. Parse the envelope into flat `{phoneNumberId, fromPhone, text}` rows.
 *  3. For each message, find the worker on `whatsapp` channel for this
 *     tenant and call `dispatchInbound`. The autonomy gate from Sprint 6
 *     applies — if approve mode, a `whatsapp_reply` worker_action is
 *     created and the actual outbound send goes through the dispatch
 *     worker after human approval.
 *
 *  We ALWAYS respond 200 to Meta as long as the signature is valid, even
 *  if message processing fails — Meta retries 5xx, and a retry storm on
 *  a broken worker would be worse than dropping the event with a log.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { tenantId } = await ctx.params;
  if (!ID_RE.test(tenantId)) {
    return new Response("not found", { status: 404 });
  }
  const throttled = await rateLimitOr429("webhook", `whatsapp:${tenantId}`, {
    tenantId,
    route: "POST /api/webhooks/whatsapp/[tenantId]",
  });
  if (throttled) return throttled;

  // RAW body — must not be parsed-and-restringified before signature check.
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  // We don't yet know which integration to verify against — Meta may
  // hit this endpoint for any of the tenant's WhatsApp numbers. Loop
  // through the tenant's active WhatsApp integrations and accept the
  // first one whose appSecret produces a matching signature.
  const tenantIntegrations = await db
    .select({ id: integrations.id, secretBlob: integrations.secretBlob })
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.kind, "whatsapp"),
      ),
    );
  if (tenantIntegrations.length === 0) {
    return new Response("not found", { status: 404 });
  }

  let matchedSecret: WhatsAppCredentials | null = null;
  for (const inte of tenantIntegrations) {
    try {
      const cred = await decryptForTenant<WhatsAppCredentials>(
        tenantId,
        inte.secretBlob,
      );
      if (
        verifyMetaSignature({
          rawBody,
          signatureHeader: signature,
          appSecret: cred.appSecret,
        })
      ) {
        matchedSecret = cred;
        break;
      }
    } catch {
      // Unreadable secret — skip and try the next.
    }
  }
  if (!matchedSecret) {
    return new Response("invalid signature", { status: 403 });
  }

  // Parse the inbound payload
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  const messages = parseInboundEvent(payload);

  // Dispatch each text message
  for (const msg of messages) {
    try {
      // Find a worker on the whatsapp channel for this tenant.
      const allWorkers = await db
        .select()
        .from(workers)
        .where(and(eq(workers.tenantId, tenantId), eq(workers.status, "active")));
      const target = allWorkers.find((w) =>
        w.channels.map((c) => c.toLowerCase()).includes("whatsapp"),
      );
      if (!target) {
        // Tenant doesn't have a worker for this channel — drop with a log.
        console.warn(
          `[webhooks/whatsapp] tenant=${tenantId} has no worker on whatsapp channel; dropping wa_id=${msg.waMessageId}`,
        );
        continue;
      }
      await dispatchInbound({
        tenantId,
        workerId: target.id,
        externalId: msg.fromPhone,
        channel: "whatsapp",
        userMessage: msg.text,
        customer: msg.profileName ? { name: msg.profileName } : undefined,
      });
    } catch (e) {
      console.error(
        "[webhooks/whatsapp] dispatch failed for",
        msg.waMessageId,
        e,
      );
      // Keep going — one bad message shouldn't fail the whole batch.
    }
  }

  return new Response("ok", { status: 200 });
}
