import type { MailMessage } from "../transport";
import { renderBrandedEmail, renderText, type EmailBlock } from "../layout";

/**
 * Platform-admin notification fired when a new tenant signs up. Goes to
 * `ADMIN_NOTIFY_EMAIL` (or every owner/admin/finance staff member — see
 * `src/lib/mail/admin-notify.ts`). Internal audit-trail style: who, what,
 * when, where. Always English (the audience is the platform team), but
 * rendered on the same branded layout as customer mail for consistency.
 */
export function renderAdminSignupNotificationEmail(args: {
  to: string;
  tenantSlug: string;
  tenantName: string;
  ownerEmail: string;
  ownerName: string;
  ip: string | null;
  country: string | null;
  locale: string;
  signedUpAtIso: string;
  adminDashboardUrl: string;
}): MailMessage {
  const tsHuman = new Date(args.signedUpAtIso).toUTCString();
  const rows: [string, string][] = [
    ["Company", esc(args.tenantName)],
    ["Slug", `<code style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px">${esc(args.tenantSlug)}</code>`],
    ["Owner", `${esc(args.ownerName)} &lt;${esc(args.ownerEmail)}&gt;`],
    ["Locale", esc(args.locale)],
    ["Country", esc(args.country ?? "—")],
    ["IP", `<code style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px">${esc(args.ip ?? "—")}</code>`],
  ];
  const table = `<table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;color:#3F3F46;border-collapse:collapse;margin:0 0 18px">${rows
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:9px 0;color:#9CA3AF;width:120px;${i ? "border-top:1px solid #ECECEC" : ""}">${k}</td><td style="padding:9px 0;${i ? "border-top:1px solid #ECECEC" : ""}">${v}</td></tr>`,
    )
    .join("")}</table>`;

  const blocks: EmailBlock[] = [
    { p: `New tenant signed up — ${tsHuman}.` },
    { rawHtml: table },
    { note: "Signup is unverified until the OTP is confirmed. If it never is, the tenant stays trialing for 14 days, then auto-expires." },
  ];

  return {
    to: args.to,
    subject: `[Staffbix] New signup: ${args.tenantName} (${args.ownerEmail})`,
    html: renderBrandedEmail({
      locale: "en",
      preheader: `${args.tenantName} just signed up.`,
      heading: "New tenant signed up",
      blocks,
      cta: { label: "Open admin dashboard", url: args.adminDashboardUrl },
      footerNote: "Staffbix platform alert — automated.",
    }),
    text: renderText({
      heading: "New tenant signed up on Staffbix",
      blocks: [
        { p: `When: ${tsHuman}` },
        { p: `Company: ${args.tenantName} (${args.tenantSlug})` },
        { p: `Owner: ${args.ownerName} <${args.ownerEmail}>` },
        { p: `Locale: ${args.locale} · Country: ${args.country ?? "—"} · IP: ${args.ip ?? "—"}` },
      ],
      cta: { label: "Admin dashboard", url: args.adminDashboardUrl },
    }),
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
