import { emailQueue } from "../queue/queues";
import type { EmailJob } from "../queue/jobs";
import type { Locale } from "@/lib/i18n/config";
import type { MailMessage } from "./transport";
import { sendSystemMail } from "./transport";
import { renderOtpEmail } from "./templates/otp";
import { renderInvitationEmail } from "./templates/invitation";

/**
 * Enqueue an email for delivery via the worker service. The web layer
 * never blocks on SMTP — the worker handles Yandex+Resend fallback,
 * retries, and dedup.
 *
 * If `INLINE_EMAIL=1` is set (CI smoke tests + dev when no worker is
 * running), the mail is sent inline. This is the dev convenience path
 * and is NEVER used in production.
 */
export async function queueEmail(job: EmailJob): Promise<void> {
  if (process.env.INLINE_EMAIL === "1") {
    console.log(`[mail] INLINE: ${job.message.to} subject="${job.message.subject}"`);
    await sendSystemMail(job.message);
    return;
  }

  await emailQueue.add(job.idemKey, job, {
    jobId: job.idemKey, // bullmq dedupes on jobId within the queue
  });
}

export function buildOtpMessage(args: {
  to: string;
  code: string;
  purpose: "login" | "signup";
  ttlMinutes: number;
  locale?: Locale;
}): MailMessage {
  return renderOtpEmail(args);
}

export function buildInvitationMessage(args: {
  to: string;
  tenantName: string;
  inviterName: string;
  acceptUrl: string;
  ttlDays: number;
  role: string;
  locale?: Locale;
}): MailMessage {
  return renderInvitationEmail(args);
}
