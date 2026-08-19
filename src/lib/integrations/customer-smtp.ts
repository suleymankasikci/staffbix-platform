import nodemailer from "nodemailer";

/**
 * Customer-owned SMTP sender (BYOI). Used for outbound *customer-facing*
 * email — never for system mail (which goes through Yandex/Resend, see
 * `src/lib/mail/transport.ts`).
 *
 * Secret blob shape (stored encrypted in `integrations.secret_blob`):
 *   {
 *     host:        "smtp.example.com",
 *     port:        465,
 *     user:        "support@northway.example",
 *     pass:        "•••",
 *     fromAddress: "Northway Goods <support@northway.example>",
 *     useTls:      true,
 *   }
 */

export interface SmtpCredentials {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromAddress: string;
  useTls?: boolean;
}

export interface SendCustomerEmailArgs {
  credentials: SmtpCredentials;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional Reply-To header — defaults to credentials.fromAddress. */
  replyTo?: string;
}

export interface SendCustomerEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send via the tenant's SMTP. Never throws — returns `{ok:false}` so
 * the dispatch worker can record + retry.
 *
 * We create a fresh transport per call. SMTP connections are usually
 * stateless from our perspective (auth on every message), and the
 * volume is low enough that pooling per-tenant doesn't pay back the
 * cache-management cost. Sprint 12 may pool by integrationId if
 * volume grows.
 */
export async function sendCustomerEmail(
  args: SendCustomerEmailArgs,
): Promise<SendCustomerEmailResult> {
  try {
    const port = Number(args.credentials.port);
    const transport = nodemailer.createTransport({
      host: args.credentials.host,
      port,
      // Implicit TLS on 465; STARTTLS for 587 and others.
      secure: args.credentials.useTls !== false && port === 465,
      auth: { user: args.credentials.user, pass: args.credentials.pass },
    });
    const info = await transport.sendMail({
      from: args.credentials.fromAddress,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo ?? args.credentials.fromAddress,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
