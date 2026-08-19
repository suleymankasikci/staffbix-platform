import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import {
  canonicalizePath,
  extractLocale,
  localizePath,
} from "@/lib/i18n/routing";

/**
 * Next.js 16 renamed Middleware → Proxy. This file is the single
 * entry point for both:
 *   1. Locale negotiation + redirects (pre-Sprint-12 behavior).
 *   2. Security headers on every response (Sprint 12).
 *
 * The locale logic runs first and may short-circuit with a redirect /
 * rewrite; the helper `withSecurityHeaders` stamps the response either
 * way so every wire response carries CSP / HSTS / etc.
 */

const PUBLIC_FILE = /\.(.*)$/;
const LOCALE_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

// ── Sprint 12: security headers ─────────────────────────────────────────
//
// CSP is production-tight but permissive enough that:
//   - Next's runtime inline bootstrap script keeps working
//     ('unsafe-inline' + 'unsafe-eval' are required on App Router 16.x)
//   - Stripe.js + Stripe checkout iframe work
//   - The chat widget can stream SSE / WS to the API
//   - Avatars + Brand-Bible-uploaded PDFs from R2 render
//
// Re-verified by `npm run build` after every edit to this list.

const CSP_DIRECTIVES: Record<string, string> = {
  "default-src": "'self'",
  // Google Analytics (gtag.js) needs www.googletagmanager.com for the
  // loader + www.google-analytics.com for the older measurement
  // protocol fallback. Stripe loads from js.stripe.com.
  "script-src":
    "'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src": "'self' 'unsafe-inline'",
  // GA pings collect endpoints from both google-analytics.com and
  // analytics.google.com; img-src already allows https: so beacons via
  // <img> work, but we tighten it for clarity.
  "img-src": "'self' data: blob: https:",
  "font-src": "'self' data:",
  // XHR/fetch destinations: OpenAI + Stripe (existing) + GA beacons.
  "connect-src":
    "'self' https://api.openai.com https://api.stripe.com https://*.r2.cloudflarestorage.com https://www.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com wss://*",
  "frame-src": "https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
};

const CSP = Object.entries(CSP_DIRECTIVES)
  .map(([k, v]) => `${k} ${v}`)
  .join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": CSP,
};

function withSecurityHeaders<T extends NextResponse>(res: T): T {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

function preferredLocale(request: NextRequest): Locale {
  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  if (cookieLocale) return cookieLocale;

  const header = request.headers.get("accept-language");
  if (!header) return DEFAULT_LOCALE;

  for (const item of header.split(",")) {
    const locale = normalizeLocale(item.split(";")[0]?.trim());
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

function shouldSkip(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/status") ||
    pathname.startsWith("/docs") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Server-action short-circuit. This app uses ZERO React Server Actions
  // (every mutation goes through /api/* + client fetch). Any request that
  // still carries the `Next-Action` header is therefore invalid — it's a
  // stale browser tab from an older build or a bot probe. Left to reach
  // the App Router, each one logs a noisy "Failed to find Server Action …"
  // error. We reject them cleanly at the edge with a 404 so the action
  // runtime never runs. Safe because no legitimate request sets this
  // header here.
  if (request.method === "POST" && request.headers.get("next-action")) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
    );
  }

  if (shouldSkip(pathname)) return withSecurityHeaders(NextResponse.next());

  const { locale, pathWithoutLocale } = extractLocale(pathname);

  if (!locale) {
    const detected = preferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = localizePath(pathname, detected);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const canonicalPath = canonicalizePath(pathWithoutLocale, locale);
  const canonicalWithLocale = `/${locale}${canonicalPath === "/" ? "" : canonicalPath}`;
  const localizedWithLocale = localizePath(canonicalPath, locale);

  if (pathname !== localizedWithLocale && pathname !== canonicalWithLocale) {
    const url = request.nextUrl.clone();
    url.pathname = localizedWithLocale;
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
    return withSecurityHeaders(response);
  }

  if (pathname !== canonicalWithLocale) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalWithLocale;
    const response = NextResponse.rewrite(url);
    response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
    return withSecurityHeaders(response);
  }

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
  return withSecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};

export const locales = LOCALES;
