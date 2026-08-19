import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WhatsApp Cloud API adapter.
 *
 * Per-tenant credential (lives encrypted in `integrations.secret_blob`):
 *   {
 *     phoneNumberId:  string,  // Meta-assigned, identifies the sender
 *     accessToken:    string,  // Bearer token for graph.facebook.com
 *     appSecret:      string,  // for X-Hub-Signature-256 verification
 *     verifyToken:    string,  // for initial webhook GET challenge
 *   }
 *
 * Verified against Meta's docs (2026-05-14):
 *   - Send endpoint:
 *     POST https://graph.facebook.com/{Version}/{Phone-Number-ID}/messages
 *     developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 *   - Webhook signature: X-Hub-Signature-256: sha256=<hex>, signed body
 *     with App Secret. developers.facebook.com/docs/graph-api/webhooks/getting-started
 *   - Webhook verification GET: query hub.mode/hub.challenge/hub.verify_token,
 *     respond with hub.challenge value.
 */

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
}

/**
 * Meta versions are stable for ~24 months. v21.0 was current as of
 * 2026-05-14. We pin the version so deploys against future versions
 * are deliberate (changelog review, then bump).
 */
const GRAPH_API_VERSION = "v21.0";

export interface SendTextResult {
  /** Meta's message id (`wamid.…`) on success. */
  messageId?: string;
  ok: boolean;
  /** HTTP status from Meta. */
  status: number;
  /** Raw error body when ok=false. */
  error?: string;
}

/**
 * Send a text message via the customer's WhatsApp Cloud API account.
 *
 * Never throws. Errors come back as `{ ok: false, status, error }` so
 * the dispatch worker can record `worker_actions.error` and retry.
 */
export async function sendWhatsAppText(args: {
  credentials: WhatsAppCredentials;
  toPhone: string;
  text: string;
  /** Optional fetch override — used by audit tests to inject a fixture. */
  fetchImpl?: typeof fetch;
}): Promise<SendTextResult> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${args.credentials.phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: args.toPhone,
    type: "text",
    text: { body: args.text.slice(0, 4096) },
  };

  const f = args.fetchImpl ?? fetch;
  try {
    const res = await f(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, error: text.slice(0, 500) };
    }
    let messageId: string | undefined;
    try {
      const parsed = JSON.parse(text) as {
        messages?: Array<{ id?: string }>;
      };
      messageId = parsed.messages?.[0]?.id;
    } catch {
      // Body wasn't JSON — odd but not fatal.
    }
    return { ok: true, status: res.status, messageId };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Verify the `X-Hub-Signature-256` header on a Meta webhook callback.
 * `rawBody` MUST be the exact bytes received — JSON.parse-and-restringify
 * will break the signature. Returns true if the signature is valid.
 */
export function verifyMetaSignature(args: {
  rawBody: string | Uint8Array;
  signatureHeader: string | null;
  appSecret: string;
}): boolean {
  if (!args.signatureHeader) return false;
  // Header format: `sha256=<64-char-hex>`
  const m = /^sha256=([a-f0-9]{64})$/.exec(args.signatureHeader);
  if (!m) return false;

  const expected = createHmac("sha256", args.appSecret)
    .update(args.rawBody)
    .digest();
  const provided = Buffer.from(m[1], "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Webhook verification challenge during initial registration. Meta GETs
 * the endpoint with `hub.mode=subscribe&hub.challenge=…&hub.verify_token=…`.
 * If the verify_token matches what the tenant configured, respond with
 * the challenge value as plaintext.
 *
 * Returns the response body string on success, or null when the verify
 * token mismatches (caller responds with 403).
 */
export function answerWebhookChallenge(args: {
  query: URLSearchParams;
  expectedVerifyToken: string;
}): string | null {
  const mode = args.query.get("hub.mode");
  const challenge = args.query.get("hub.challenge");
  const token = args.query.get("hub.verify_token");
  if (mode !== "subscribe") return null;
  if (token !== args.expectedVerifyToken) return null;
  if (!challenge) return null;
  return challenge;
}

/**
 * Parse the relevant bits out of a Meta WhatsApp webhook event.
 *
 * Meta delivers a fairly nested envelope: `entry[].changes[].value`
 * with `messages` (inbound), `statuses` (delivery receipts), and
 * `metadata` (which phone number id received it).
 *
 * We surface a flat list of {from, text, phoneNumberId, waMessageId}
 * so the dispatch layer can match the phone-number-id back to a
 * tenant's integration and route the message to the right worker.
 */
export interface ParsedInboundMessage {
  /** Phone number id that received the message — for tenant lookup. */
  phoneNumberId: string;
  /** Sender's E.164 phone number — used as the conversation external id. */
  fromPhone: string;
  /** The text content. Only `type=text` messages are surfaced for MVP. */
  text: string;
  /** Meta-side message id; used to dedupe retried webhook deliveries. */
  waMessageId: string;
  /** Customer's WhatsApp profile name if Meta included it. */
  profileName?: string;
}

export function parseInboundEvent(payload: unknown): ParsedInboundMessage[] {
  const out: ParsedInboundMessage[] = [];
  const p = payload as {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
          messages?: Array<{
            id?: string;
            from?: string;
            type?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  };
  if (p?.object !== "whatsapp_business_account") return out;
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (!v) continue;
      const phoneNumberId = v.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      const profileByWaId = new Map<string, string>();
      for (const c of v.contacts ?? []) {
        if (c.wa_id && c.profile?.name) {
          profileByWaId.set(c.wa_id, c.profile.name);
        }
      }
      for (const m of v.messages ?? []) {
        if (m.type !== "text") continue;
        if (!m.id || !m.from || !m.text?.body) continue;
        out.push({
          phoneNumberId,
          fromPhone: m.from,
          text: m.text.body,
          waMessageId: m.id,
          profileName: profileByWaId.get(m.from),
        });
      }
    }
  }
  return out;
}
