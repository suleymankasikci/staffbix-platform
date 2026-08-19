import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "../globals.css";
import { isLocale, LOCALES, RTL_LOCALES, type Locale } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";
import { buildPageMetadata, siteViewport } from "@/lib/seo/metadata";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/JsonLd";

/** Google Analytics measurement ID. Lives in source (not env) because
 *  GA's whole point is that the ID is public — the script is delivered
 *  to every browser. Change here if the property changes. */
const GA_MEASUREMENT_ID = "G-4NRME25RP2";

// Site-wide viewport + theme-color (Next.js 15 separates this from
// metadata so it doesn't bloat every page's headers).
export const viewport = siteViewport;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

/**
 * Default metadata — every public child page can either inherit this
 * (when the page provides no `generateMetadata`) or override it with
 * its own `buildPageMetadata({ ... })` call. The shape is the same
 * either way, so canonical / hreflang / OG stay consistent.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const copy = getCommonCopy(locale);

  return buildPageMetadata({
    locale,
    path: "",
    title: copy.tagline,
    description: copy.subtagline,
  });
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  return (
    <html
      lang={locale}
      dir={RTL_LOCALES.has(locale) ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Hreflang alternates are emitted by Metadata.alternates.languages;
            here we add Organization + WebSite JSON-LD which apply across
            every locale variant. Per-page Schema.org blocks (Product,
            FAQPage, BreadcrumbList, …) live inside their respective
            page components. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(locale)]} />
      </head>
      <body className="min-h-screen antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>

        {/* Google Analytics (gtag.js) — loaded with afterInteractive so
            it doesn't block first paint. CSP allows js delivery from
            www.googletagmanager.com + beacons to *.google-analytics.com
            (see src/proxy.ts). */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
      </body>
    </html>
  );
}
