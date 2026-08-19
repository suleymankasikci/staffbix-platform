/**
 * Branded, responsive, email-client-safe HTML shell for every system
 * email. Mirrors the product's design language — Staffbix wordmark, the
 * green accent (#16A34A), ink/rule palette from globals.css — using only
 * table layout + inline styles (the lowest common denominator that
 * renders correctly in Gmail, Outlook, Apple Mail, and mobile clients).
 *
 * Localized + RTL-aware: pass the recipient's active locale; ar/he flip
 * to right-to-left. Copy itself comes from ./copy — this module is purely
 * presentation.
 */
import type { Locale } from "@/lib/i18n/config";
import { BRAND_NAME, BRAND_DOMAIN } from "@/lib/brand";

const RTL_LOCALES = new Set<Locale>(["ar", "he"]);

/* Palette — kept in sync with src/app/globals.css */
const C = {
  canvas: "#FAFAFA",
  card: "#FFFFFF",
  ink: "#0A0A0A",
  inkBody: "#3F3F46",
  muted: "#6B6B6B",
  soft: "#9CA3AF",
  rule: "#ECECEC",
  tint: "#F4F4F5",
  accent: "#16A34A",
  accentDeep: "#15803D",
} as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface EmailBlock {
  /** Plain paragraph. */
  p?: string;
  /** Monospace code panel (e.g. an OTP). */
  code?: string;
  /** Subtle info/security callout. */
  note?: string;
  /** Ordered or bulleted list. */
  list?: { ordered: boolean; items: string[] };
  /** A raw, already-escaped HTML fragment (use sparingly). */
  rawHtml?: string;
}

export interface BrandedEmailOptions {
  locale: Locale;
  /** Hidden inbox-preview text. */
  preheader: string;
  /** Big headline at the top of the card. */
  heading: string;
  blocks: EmailBlock[];
  /** Primary call-to-action button. */
  cta?: { label: string; url: string };
  /** Small footer line under the rule (e.g. "you received this because…"). */
  footerNote?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline SVG wordmark — the 3-bar glyph from BrandLogo + the brand name. */
function logo(): string {
  return `<span style="display:inline-block;vertical-align:middle">
    <svg width="22" height="22" viewBox="0 0 14 14" style="vertical-align:middle" aria-hidden="true">
      <rect x="0" y="2" width="9" height="1.5" fill="${C.ink}"></rect>
      <rect x="2.5" y="6.25" width="9" height="1.5" fill="${C.ink}"></rect>
      <rect x="0" y="10.5" width="9" height="1.5" fill="${C.ink}"></rect>
    </svg>
  </span><span style="vertical-align:middle;font-size:19px;font-weight:600;color:${C.ink};letter-spacing:-0.015em;padding:0 7px">${BRAND_NAME}</span>`;
}

/** Bulletproof green pill button (VML fallback for Outlook). */
function button(label: string, url: string, dir: "ltr" | "rtl"): string {
  const safeUrl = esc(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px"><tr><td align="${dir === "rtl" ? "right" : "left"}">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="50%" strokecolor="${C.accent}" fillcolor="${C.accent}">
      <w:anchorlock/><center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;">${esc(label)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <a href="${safeUrl}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;font-family:${FONT};padding:13px 28px;border-radius:999px;mso-hide:all">${esc(label)}</a>
    <!--<![endif]-->
  </td></tr></table>`;
}

function renderBlock(b: EmailBlock, dir: "ltr" | "rtl"): string {
  const align = dir === "rtl" ? "right" : "left";
  if (b.p)
    return `<p style="margin:0 0 18px;font-size:15px;line-height:1.62;color:${C.inkBody};text-align:${align}">${esc(b.p)}</p>`;
  if (b.code)
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px"><tr><td style="background:${C.tint};border:1px solid ${C.rule};border-radius:12px;padding:18px 20px;text-align:center">
      <span style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:30px;font-weight:600;letter-spacing:0.22em;color:${C.ink}">${esc(b.code)}</span>
    </td></tr></table>`;
  if (b.note)
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr><td style="border-${dir === "rtl" ? "right" : "left"}:3px solid ${C.rule};padding:2px 0 2px 14px;${dir === "rtl" ? "padding:2px 14px 2px 0;" : ""}">
      <p style="margin:0;font-size:13px;line-height:1.55;color:${C.muted};text-align:${align}">${esc(b.note)}</p>
    </td></tr></table>`;
  if (b.list) {
    const tag = b.list.ordered ? "ol" : "ul";
    const items = b.list.items
      .map(
        (it) =>
          `<li style="margin:0 0 8px;font-size:15px;line-height:1.55;color:${C.inkBody}">${esc(it)}</li>`,
      )
      .join("");
    const pad = dir === "rtl" ? "padding:0 20px 0 0" : "padding:0 0 0 20px";
    return `<${tag} style="margin:0 0 18px;${pad};text-align:${align}">${items}</${tag}>`;
  }
  if (b.rawHtml) return b.rawHtml;
  return "";
}

export function renderBrandedEmail(opts: BrandedEmailOptions): string {
  const dir: "ltr" | "rtl" = RTL_LOCALES.has(opts.locale) ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const year = new Date().getFullYear();
  const body = opts.blocks.map((b) => renderBlock(b, dir)).join("\n");
  const ctaHtml = opts.cta ? button(opts.cta.label, opts.cta.url, dir) : "";
  const footerNote = opts.footerNote
    ? `<p style="margin:0 0 6px;font-size:12px;line-height:1.55;color:${C.soft};text-align:${align}">${esc(opts.footerNote)}</p>`
    : "";

  return `<!doctype html>
<html lang="${opts.locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>${esc(BRAND_NAME)}</title>
</head>
<body style="margin:0;padding:0;background:${C.canvas};font-family:${FONT};-webkit-font-smoothing:antialiased">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas}">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:100%">
        <tr><td style="padding:0 4px 18px" dir="${dir}" align="${align}">${logo()}</td></tr>
        <tr><td style="background:${C.card};border:1px solid ${C.rule};border-radius:16px;padding:40px 36px" dir="${dir}">
          <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:600;color:${C.ink};text-align:${align}">${esc(opts.heading)}</h1>
          ${body}
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:22px 8px 0" dir="${dir}">
          <div style="border-top:1px solid ${C.rule};padding-top:18px">
            ${footerNote}
            <p style="margin:0;font-size:12px;line-height:1.55;color:${C.soft};text-align:${align}">© ${year} ${esc(BRAND_NAME)} · ${esc(BRAND_DOMAIN)}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text counterpart — same content, no markup. */
export function renderText(opts: {
  heading: string;
  blocks: EmailBlock[];
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const lines: string[] = [opts.heading, ""];
  for (const b of opts.blocks) {
    if (b.p) lines.push(b.p, "");
    else if (b.code) lines.push(`  ${b.code}`, "");
    else if (b.note) lines.push(b.note, "");
    else if (b.list) {
      b.list.items.forEach((it, i) =>
        lines.push(b.list!.ordered ? `${i + 1}. ${it}` : `• ${it}`),
      );
      lines.push("");
    }
  }
  if (opts.cta) lines.push(opts.cta.label + ":", opts.cta.url, "");
  if (opts.footerNote) lines.push(opts.footerNote);
  lines.push(`— ${BRAND_NAME} · ${BRAND_DOMAIN}`);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
