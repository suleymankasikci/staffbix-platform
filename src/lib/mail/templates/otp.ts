import type { MailMessage } from "../transport";
import type { Locale } from "@/lib/i18n/config";
import { renderBrandedEmail, renderText, type EmailBlock } from "../layout";
import { getMailCopy, fill } from "../copy";

/**
 * OTP email — branded, localized, deliberately link-free (an OTP that's
 * also a link doubles the phishing surface). The big code sits in a tinted
 * panel; copy is resolved for the recipient's active locale.
 */
export function renderOtpEmail(args: {
  to: string;
  code: string;
  purpose: "login" | "signup";
  ttlMinutes: number;
  locale?: Locale;
}): MailMessage {
  const locale = args.locale ?? "en";
  const c = getMailCopy(locale).otp;
  const isSignup = args.purpose === "signup";
  const heading = isSignup ? c.headingSignup : c.headingLogin;

  const blocks: EmailBlock[] = [
    { p: c.intro },
    { code: args.code },
    { p: fill(c.expiry, { min: args.ttlMinutes }) },
    { note: c.security },
  ];

  return {
    to: args.to,
    subject: fill(isSignup ? c.subjectSignup : c.subjectLogin, { code: args.code }),
    html: renderBrandedEmail({
      locale,
      preheader: fill(c.preheader, { min: args.ttlMinutes }),
      heading,
      blocks,
      footerNote: c.footerNote,
    }),
    text: renderText({ heading, blocks, footerNote: c.footerNote }),
  };
}
