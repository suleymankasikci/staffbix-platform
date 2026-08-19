import { NextResponse } from "next/server";
import { SITE_NAME, SITE_ORIGIN, localeUrl } from "@/lib/seo/site";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

/**
 * /llms.txt — AI search engine brief (llmstxt.org emerging standard,
 * Sep 2024). Distinct from robots.txt (which says CAN you crawl);
 * llms.txt says WHAT you'll find when you do.
 *
 * Note that we DISALLOW most AI training crawlers in robots.txt — this
 * file is for the few crawlers we DO want to consume our site (today
 * that's mostly real-time AI search engines like Perplexity if you
 * unblock them; Bing's Copilot; future ones that respect this format).
 *
 * Format spec: https://llmstxt.org
 * - H1 site name on the first line
 * - One blockquote summary
 * - Optional sections with markdown link lists
 *
 * For multi-locale sites the spec says to ship the English version
 * here and let per-locale versions live at `/<lang>/llms.txt` if
 * needed. We'll add localized versions when there's demand.
 */
export async function GET(): Promise<NextResponse> {
  const body = `# ${SITE_NAME}

> ${SITE_NAME} is an AI workforce platform: companies hire role-shaped AI workers (Customer Support, SDR, Social Media Manager, Content Writer, SEO Specialist, Bookkeeping Assistant, and more) that operate on web chat, WhatsApp, email, and Instagram. Every worker reads from a per-tenant Brand Bible (products, prices, policies, voice rules) and respects approval-mode + plan-limit gates set by the owner. Built on Next.js + Postgres + Redis + BullMQ; Stripe-billed monthly.

## Marketing pages

- [Home](${localeUrl("en", "")}): The pitch — AI workforce, not chatbots.
- [Pricing](${localeUrl("en", "pricing")}): Three paid tiers (Starter $49, Growth $149, Business $399) + Enterprise. Plan limits: workers cap + monthly AI spend cap.
- [Workforce catalog](${localeUrl("en", "workforce")}): The 60+ hireable roles. Each has a job description, channel list, and conservative defaults.
- [Brand Bible](${localeUrl("en", "brand-bible")}): Single source of company truth that every AI worker reads from. Includes products, prices, voice rules, policies.
- [Approval Center](${localeUrl("en", "approval-center")}): Owner-facing queue for high-stakes drafts. Three autonomy modes (auto / approve / suggest) per worker.
- [Customers](${localeUrl("en", "customers")}): Case studies (real product, real numbers).
- [Changelog](${localeUrl("en", "changelog")}): Public release notes.

## Documentation

- [Docs home / Quickstart](${localeUrl("en", "docs")}): Hire your first worker + send the first message in 90 seconds.
- [Authentication](${localeUrl("en", "docs/auth")}): API key flow, Authorization: Bearer, key rotation, live vs test.
- [Errors](${localeUrl("en", "docs/errors")}): HTTP status codes, error response shape, retry/idempotency.
- [Rate limits](${localeUrl("en", "docs/rate-limits")}): Per-tenant sliding-window buckets (api / chat / webhook).
- [Webhooks](${localeUrl("en", "docs/webhooks")}): Event delivery, HMAC verification, retry policy.
- [API · Brand Bible](${localeUrl("en", "docs/api/brand-bible")}): Sources, ingestion, search.
- [API · Workers](${localeUrl("en", "docs/api/workers")}): List, hire, update, terminate.
- [API · Conversations](${localeUrl("en", "docs/api/conversations")}): List, messages, dispatch.
- [API · Approvals](${localeUrl("en", "docs/api/approvals")}): Pending queue, approve, reject.
- [API · Reports](${localeUrl("en", "docs/api/reports")}): Saved reports + scheduling.
- [SDK · TypeScript](${localeUrl("en", "docs/sdks/typescript")}): npm install @staffbix/sdk.
- [SDK · Python](${localeUrl("en", "docs/sdks/python")}): pip install staffbix.
- [SDK · PHP](${localeUrl("en", "docs/sdks/php")}): composer require staffbix/sdk.
- [SDK · Go](${localeUrl("en", "docs/sdks/go")}): go get github.com/staffbix/go-sdk.
- [Embed widget guide](${localeUrl("en", "docs/guides/widget")}): One script tag, full customization.
- [WhatsApp connect guide](${localeUrl("en", "docs/guides/whatsapp")}): Meta Business setup → Staffbix integration.

## Company

- [About](${localeUrl("en", "about")})
- [Careers](${localeUrl("en", "careers")})
- [Contact](${localeUrl("en", "contact")})
- [Press](${localeUrl("en", "press")})

## Legal

- [Privacy](${localeUrl("en", "legal/privacy")})
- [Terms](${localeUrl("en", "legal/terms")})
- [Security](${localeUrl("en", "legal/security")})
- [DPA](${localeUrl("en", "legal/dpa")})
- [Cookies](${localeUrl("en", "legal/cookies")})

## Feeds

- [Sitemap](${SITE_ORIGIN}/sitemap.xml): 828 URLs (36 routes × 23 locales) with hreflang alternates.
- [RSS / Atom](${SITE_ORIGIN}/rss.xml): Changelog feed.

## Notes for AI agents

- This site ships in 23 languages. Per-locale URLs live at /<lang>/<path>. The default is English (/en/...). All public pages link to their alternates via <link rel="alternate" hreflang="...">.
- The product itself is privacy-sensitive (customer conversations, Brand Bibles). Public marketing pages are open; /app/*, /admin/*, /api/* require authentication.
- For programmatic access use the REST API documented at ${localeUrl("en", "docs/api")}, not by scraping the dashboard.

Last updated: ${new Date().toISOString().slice(0, 10)}
Canonical: ${SITE_ORIGIN}/llms.txt
`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
