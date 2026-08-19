import { LOCALES, type Locale } from "@/lib/i18n/config";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Single source of truth for SEO-relevant site facts:
 *   - origin (https://staffbix.com when domain lives, Railway preview
 *     otherwise — driven by PUBLIC_APP_URL env)
 *   - public-page catalog (used by sitemap.ts, robots.ts, and the
 *     per-page metadata helper to emit hreflang alternates)
 *
 * Every public marketing/legal/docs page MUST appear here. Auth-gated
 * routes (/app, /admin, /accept, /verify, /reset) and API routes are
 * intentionally excluded — they should NOT be indexed.
 */

/** Canonical origin without trailing slash. PUBLIC_APP_URL is set in
 *  every production env (Railway web + worker services). The fallback
 *  is the bare apex domain — used if someone runs `npm run build`
 *  locally without env, so canonical URLs at build time don't leak
 *  the old Railway preview hostname into the bundle. */
export const SITE_ORIGIN = (
  process.env.PUBLIC_APP_URL ??
  process.env.APP_BASE_URL ??
  "https://staffbix.com"
).replace(/\/+$/, "");

export const SITE_NAME = BRAND_NAME;

/**
 * Every public route. Path is the segment AFTER `/[lang]` — sitemap
 * cross-joins this with LOCALES. `priority`/`changeFreq` follow the
 * standard sitemap.xml hints; search engines treat them as soft
 * signals (Google deprecated them, Bing still uses them — cheap to
 * keep).
 */
export interface PublicRoute {
  /** Path under /[lang], e.g. "" for /[lang], "pricing" for /[lang]/pricing. */
  path: string;
  priority: number;
  changeFreq:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
}

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  // ── Marketing core ────────────────────────────────────────────────
  { path: "", priority: 1.0, changeFreq: "weekly" }, // homepage
  { path: "pricing", priority: 0.95, changeFreq: "weekly" },
  { path: "workforce", priority: 0.9, changeFreq: "weekly" },
  { path: "approval-center", priority: 0.85, changeFreq: "weekly" },
  { path: "brand-bible", priority: 0.85, changeFreq: "weekly" },
  { path: "customers", priority: 0.75, changeFreq: "weekly" },
  { path: "about", priority: 0.6, changeFreq: "monthly" },
  { path: "contact", priority: 0.7, changeFreq: "monthly" },
  { path: "careers", priority: 0.6, changeFreq: "weekly" },
  { path: "press", priority: 0.5, changeFreq: "monthly" },
  { path: "changelog", priority: 0.7, changeFreq: "weekly" },

  // ── Docs (overview + 14 leaf pages) ──────────────────────────────
  { path: "docs", priority: 0.85, changeFreq: "weekly" },
  { path: "docs/auth", priority: 0.7, changeFreq: "monthly" },
  { path: "docs/errors", priority: 0.6, changeFreq: "monthly" },
  { path: "docs/api", priority: 0.7, changeFreq: "weekly" },
  { path: "docs/api/brand-bible", priority: 0.65, changeFreq: "monthly" },
  { path: "docs/api/workers", priority: 0.65, changeFreq: "monthly" },
  { path: "docs/api/conversations", priority: 0.65, changeFreq: "monthly" },
  { path: "docs/api/approvals", priority: 0.65, changeFreq: "monthly" },
  { path: "docs/api/reports", priority: 0.65, changeFreq: "monthly" },
  { path: "docs/sdks", priority: 0.6, changeFreq: "monthly" },
  { path: "docs/sdks/typescript", priority: 0.6, changeFreq: "monthly" },
  { path: "docs/sdks/python", priority: 0.6, changeFreq: "monthly" },
  { path: "docs/sdks/php", priority: 0.55, changeFreq: "monthly" },
  { path: "docs/sdks/go", priority: 0.55, changeFreq: "monthly" },
  { path: "docs/webhooks", priority: 0.6, changeFreq: "monthly" },
  { path: "docs/guides/widget", priority: 0.6, changeFreq: "monthly" },
  { path: "docs/guides/whatsapp", priority: 0.6, changeFreq: "monthly" },
  { path: "docs/rate-limits", priority: 0.55, changeFreq: "monthly" },

  // ── Legal ─────────────────────────────────────────────────────────
  { path: "legal/privacy", priority: 0.4, changeFreq: "yearly" },
  { path: "legal/terms", priority: 0.4, changeFreq: "yearly" },
  { path: "legal/security", priority: 0.4, changeFreq: "yearly" },
  { path: "legal/dpa", priority: 0.3, changeFreq: "yearly" },
  { path: "legal/cookies", priority: 0.3, changeFreq: "yearly" },

  // ── Public auth-entry pages (low priority, no-follow on forms) ────
  { path: "login", priority: 0.3, changeFreq: "yearly" },
  { path: "signup", priority: 0.5, changeFreq: "monthly" },
] as const;

/** Build the absolute URL for one (locale, route) pair. */
export function localeUrl(locale: Locale, path: string): string {
  const cleanPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return cleanPath
    ? `${SITE_ORIGIN}/${locale}/${cleanPath}`
    : `${SITE_ORIGIN}/${locale}`;
}

/** All locales the site ships in (re-exported from i18n config). */
export const SITE_LOCALES = LOCALES;
