import type { Locale } from "@/lib/i18n/config";
import { SITE_NAME, SITE_ORIGIN, localeUrl } from "./site";

/**
 * Schema.org JSON-LD builders for the public surface.
 *
 * Each function returns a serializable object that should be rendered
 * via `<script type="application/ld+json">JSON.stringify(...)</script>`
 * by the `JsonLd` React component (see ./JsonLd.tsx). Google reads
 * these to power Knowledge Panels, sitelinks, breadcrumb chips, FAQ
 * accordions in SERP, etc.
 *
 * Convention: every public page emits Organization + WebPage. Pages
 * with semantic meaning add their specialization (Product, FAQPage,
 * BreadcrumbList, Article, …).
 */

/** Always-on Organization block. Lives in the root layout. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/icon.png`,
    sameAs: [
      "https://x.com/staffbix",
      "https://www.linkedin.com/company/staffbix",
      "https://github.com/staffbix",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hello@staffbix.com",
        availableLanguage: [
          "English",
          "Turkish",
          "German",
          "French",
          "Italian",
          "Spanish",
          "Portuguese",
          "Chinese",
          "Korean",
          "Japanese",
          "Russian",
          "Arabic",
        ],
      },
    ],
  };
}

/** Site-level search action (homepage). */
export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: localeUrl(locale, ""),
    inLanguage: locale,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/${locale}/docs?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Generic WebPage wrapper — paired with every page's metadata. */
export function webPageJsonLd(args: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${localeUrl(args.locale, args.path)}#webpage`,
    url: localeUrl(args.locale, args.path),
    name: args.title,
    description: args.description,
    inLanguage: args.locale,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
  };
}

/** Breadcrumb for a deep page. Pass items in click order. */
export function breadcrumbJsonLd(args: {
  locale: Locale;
  items: { name: string; path: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: args.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: localeUrl(args.locale, item.path),
    })),
  };
}

/** Product schema for the pricing page. Lists every plan as an Offer. */
export function productJsonLd(args: {
  locale: Locale;
  plans: { name: string; priceMonthlyCents: number; currency: string; description: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_ORIGIN}/#product`,
    name: `${SITE_NAME} — AI Workforce Platform`,
    description:
      "Hire AI workers that follow your Brand Bible. Plan-gated limits, approval workflows, and audit trail built-in.",
    brand: { "@id": `${SITE_ORIGIN}/#organization` },
    image: `${SITE_ORIGIN}/icon.png`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: args.plans[0]?.currency.toUpperCase() ?? "USD",
      lowPrice: Math.min(...args.plans.map((p) => p.priceMonthlyCents / 100)).toFixed(2),
      highPrice: Math.max(...args.plans.map((p) => p.priceMonthlyCents / 100)).toFixed(2),
      offerCount: args.plans.length,
      offers: args.plans.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: (p.priceMonthlyCents / 100).toFixed(2),
        priceCurrency: p.currency.toUpperCase(),
        url: localeUrl(args.locale, "pricing"),
        description: p.description,
        availability: "https://schema.org/InStock",
      })),
    },
  };
}

/** FAQPage — pass Q/A pairs from page copy. */
export function faqJsonLd(args: { items: { q: string; a: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: args.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

/** Article schema for changelog entries (when rendered as separate pages). */
export function articleJsonLd(args: {
  locale: Locale;
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.headline,
    description: args.description,
    inLanguage: args.locale,
    url: localeUrl(args.locale, args.path),
    datePublished: args.datePublished,
    dateModified: args.dateModified ?? args.datePublished,
    author: { "@id": `${SITE_ORIGIN}/#organization` },
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    image: `${SITE_ORIGIN}/icon.png`,
  };
}
