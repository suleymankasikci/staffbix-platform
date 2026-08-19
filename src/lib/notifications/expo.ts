/**
 * Expo Push Notifications.
 *
 * Endpoint: https://exp.host/--/api/v2/push/send
 * Auth:     Bearer EXPO_ACCESS_TOKEN (verified 2026-05-14 via
 *           audit-script-style probe — token round-trips, fake recipient
 *           returns `DeviceNotRegistered` rather than UNAUTHORIZED.)
 *
 * Each push notification we send is a "draft action needs approval"
 * notification. The mobile app deep-links to the approval card. Sprint
 * 10 wires the deep link; Sprint 6 ships the send path + DB row so the
 * eventual app build has data to consume.
 *
 * The actual upstream API accepts a batch of messages (up to ~100). For
 * Sprint 6 the volume is low (one per pending action × subscriptions);
 * batching can come when we hit a fan-out problem.
 */

const PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export interface ExpoMessage {
  to: string; // ExponentPushToken[…]
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  /** Default sound on iOS; "default" lets the OS handle. Android needs
   *  a channel — Sprint 10 wires those when the mobile app ships. */
  sound?: "default" | null;
  /** Badge count to display on the iOS app icon. */
  badge?: number;
  /** Priority: "default" | "normal" | "high" — approval pings are "high". */
  priority?: "default" | "normal" | "high";
}

export interface ExpoSendResult {
  /** One ticket per message we sent. */
  tickets: Array<{
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: Record<string, unknown>;
  }>;
  /** True if every ticket came back ok. */
  allOk: boolean;
}

/**
 * Send one or more push notifications via Expo. Returns the per-message
 * tickets so the caller can prune dead device tokens
 * (`DeviceNotRegistered` → call deactivate on the subscription row).
 *
 * Never throws — every error is reported as a ticket entry with
 * status="error". This keeps the approval flow alive even when push is
 * having a bad afternoon.
 */
export async function sendExpoPush(
  messages: ExpoMessage[],
): Promise<ExpoSendResult> {
  if (messages.length === 0) return { tickets: [], allOk: true };
  const token = process.env.EXPO_ACCESS_TOKEN;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(PUSH_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        tickets: messages.map(() => ({
          status: "error" as const,
          message: `HTTP ${res.status}: ${body.slice(0, 200)}`,
        })),
        allOk: false,
      };
    }
    const json = (await res.json()) as {
      data: Array<{
        status: "ok" | "error";
        id?: string;
        message?: string;
        details?: Record<string, unknown>;
      }>;
    };
    const tickets = json.data ?? [];
    return {
      tickets,
      allOk: tickets.every((t) => t.status === "ok"),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      tickets: messages.map(() => ({
        status: "error" as const,
        message,
      })),
      allOk: false,
    };
  }
}

/**
 * Validates that a string looks like an Expo push token. Doesn't talk
 * to the API — call `sendExpoPush` with the token to verify it's still
 * live.
 */
export function isExpoPushToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("ExponentPushToken[") || value.startsWith("ExpoPushToken["))
  );
}
