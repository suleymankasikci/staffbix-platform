import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

/**
 * System mail transport — Yandex SMTP primary, Resend fallback.
 *
 * Scope: **system mail only** (signup OTP, login OTP, password reset,
 * new-device alert, billing emails, ticket notifications, system alerts).
 * Customer-facing email (CS replies, marketing) goes through the tenant's
 * BYOI credentials and never touches this file. See docs/05 §4.
 *
 * Circuit breaker: if Yandex throws three times in a 60-second window we
 * flip to Resend for the next 5 minutes, then probe again. This keeps
 * password-reset emails landing even when Yandex has a bad afternoon.
 */

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface MailSendResult {
  provider: "yandex" | "resend";
  messageId: string;
}

interface BreakerState {
  failures: number[]; // unix-ms timestamps of recent failures
  openedAt: number | null;
}

const FAILURE_WINDOW_MS = 60_000;
const FAILURE_THRESHOLD = 3;
const OPEN_DURATION_MS = 5 * 60_000;

const breaker: BreakerState = { failures: [], openedAt: null };

function isYandexOpen(now = Date.now()): boolean {
  if (breaker.openedAt === null) return false;
  if (now - breaker.openedAt > OPEN_DURATION_MS) {
    breaker.openedAt = null;
    breaker.failures = [];
    return false;
  }
  return true;
}

function recordFailure(now = Date.now()): void {
  breaker.failures = [
    ...breaker.failures.filter((t) => now - t < FAILURE_WINDOW_MS),
    now,
  ];
  if (breaker.failures.length >= FAILURE_THRESHOLD) {
    breaker.openedAt = now;
  }
}

function recordSuccess(): void {
  breaker.failures = [];
  breaker.openedAt = null;
}

let yandexCached: Transporter | null = null;
function yandex(): Transporter {
  if (yandexCached) return yandexCached;
  const host = process.env.YANDEX_SMTP_HOST;
  const port = Number(process.env.YANDEX_SMTP_PORT || "465");
  const user = process.env.YANDEX_SMTP_USER;
  const pass = process.env.YANDEX_SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("Yandex SMTP env vars missing.");
  }
  yandexCached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return yandexCached;
}

let resendCached: Resend | null = null;
function resend(): Resend {
  if (resendCached) return resendCached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing.");
  resendCached = new Resend(key);
  return resendCached;
}

function from(): string {
  return (
    process.env.SYSTEM_MAIL_FROM ?? "Staffbix <no-reply@staffbix.com>"
  );
}

export async function sendSystemMail(
  msg: MailMessage,
): Promise<MailSendResult> {
  if (!isYandexOpen()) {
    try {
      const info = await yandex().sendMail({
        from: from(),
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        replyTo: msg.replyTo,
        headers: msg.headers,
      });
      recordSuccess();
      return { provider: "yandex", messageId: info.messageId ?? "" };
    } catch (err) {
      recordFailure();
      // fall through to Resend
      console.warn(
        "[mail] Yandex SMTP failed, attempting Resend fallback:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const out = await resend().emails.send({
    from: from(),
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo: msg.replyTo,
    headers: msg.headers,
  });
  if (out.error) {
    throw new Error(
      `Both Yandex and Resend failed. Resend error: ${out.error.message}`,
    );
  }
  return { provider: "resend", messageId: out.data?.id ?? "" };
}

/** For tests / health probes. */
export function _circuitState() {
  return { ...breaker, open: isYandexOpen() };
}
