import type { MailMessage } from "../transport";
import type { Locale } from "@/lib/i18n/config";
import { renderBrandedEmail, renderText, type EmailBlock } from "../layout";
import { getMailCopy, fill } from "../copy";

/**
 * Workspace invitation — branded, localized. The accept link is both a
 * green CTA button and a copy-pasteable URL (some clients strip buttons).
 */
export function renderInvitationEmail(args: {
  to: string;
  tenantName: string;
  inviterName: string;
  acceptUrl: string;
  ttlDays: number;
  role: string;
  locale?: Locale;
}): MailMessage {
  const locale = args.locale ?? "en";
  const c = getMailCopy(locale).invitation;
  const heading = fill(c.heading, { tenant: args.tenantName });

  const blocks: EmailBlock[] = [
    { p: fill(c.intro, { inviter: args.inviterName, tenant: args.tenantName, role: args.role }) },
    { note: c.pasteNote },
    { rawHtml: `<p style="margin:0 0 18px;font-size:12px;line-height:1.5;color:#9CA3AF;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;direction:ltr">${escAttr(args.acceptUrl)}</p>` },
    { p: fill(c.expiry, { days: args.ttlDays }) },
  ];

  return {
    to: args.to,
    subject: fill(c.subject, { inviter: args.inviterName, tenant: args.tenantName }),
    html: renderBrandedEmail({
      locale,
      preheader: fill(c.preheader, { tenant: args.tenantName }),
      heading,
      blocks,
      cta: { label: c.cta, url: args.acceptUrl },
      footerNote: c.footerNote,
    }),
    text: renderText({
      heading,
      blocks: [
        { p: fill(c.intro, { inviter: args.inviterName, tenant: args.tenantName, role: args.role }) },
      ],
      cta: { label: c.cta, url: args.acceptUrl },
      footerNote: fill(c.expiry, { days: args.ttlDays }),
    }),
  };
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
