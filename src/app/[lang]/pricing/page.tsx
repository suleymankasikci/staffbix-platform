import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getPricingPageCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { FinalCTA } from "@/components/FinalCTA";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbJsonLd,
  productJsonLd,
  webPageJsonLd,
} from "@/lib/seo/jsonld";
import { getCommonCopy } from "@/lib/i18n/translations";
import { SITE_NAME } from "@/lib/seo/site";

type Tier = {
  name: string;
  price: string;
  cadence: string;
  for: string;
  features: readonly string[];
  cta: string;
  highlighted?: boolean;
};

/**
 * Parse a tier price string like "$49" → 4900 cents.
 * Returns null when price is non-numeric (e.g. "Custom" for Enterprise),
 * so we can omit that tier from the Product/Offer schema.
 */
function parsePriceCents(price: string): number | null {
  const match = price.match(/(\d[\d,.]*)/);
  if (!match) return null;
  const numeric = Number(match[1].replace(/[,.]/g, ""));
  if (!Number.isFinite(numeric)) return null;
  return numeric * 100;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getPricingPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "pricing",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getPricingPageCopy(locale);
  const common = getCommonCopy(locale);

  // Build the plans array for productJsonLd. Numeric tiers only —
  // Enterprise ("Custom") is excluded from the AggregateOffer because
  // Schema.org Offer.price expects a number.
  const numericPlans = copy.tiers
    .map((t) => {
      const cents = parsePriceCents(t.price);
      if (cents == null) return null;
      return {
        name: t.name,
        priceMonthlyCents: cents,
        currency: "USD",
        description: t.for,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const jsonLd: object[] = [
    webPageJsonLd({
      locale,
      path: "pricing",
      title: copy.metadata.title,
      description: copy.metadata.description,
    }),
    breadcrumbJsonLd({
      locale,
      items: [
        { name: SITE_NAME, path: "" },
        { name: common.links.Pricing ?? "Pricing", path: "pricing" },
      ],
    }),
  ];
  if (numericPlans.length > 0) {
    jsonLd.push(productJsonLd({ locale, plans: numericPlans }));
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <Nav />
      <main>
        <PageHeader
          eyebrow={copy.header.eyebrow}
          title={copy.header.title}
          sub={copy.header.sub}
        />

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
              {copy.tiers.map((t) => (
                <TierCard
                  key={t.name}
                  tier={t}
                  popularLabel={copy.popular}
                  href={localizePath(
                    t.name === "Enterprise" ? copy.contactHref : copy.signupHref,
                    locale
                  )}
                />
              ))}
            </div>

            <Reveal delay={0.2}>
              <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                {copy.note}
              </p>
            </Reveal>
          </div>
        </section>

        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="max-w-[720px] mx-auto text-center mb-14 md:mb-20">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-6">
                  {copy.faqIntro.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 className="text-[clamp(26px,3.6vw,38px)] font-medium tracking-[-0.025em] leading-[1.12] text-ink">
                  {copy.faqIntro.title}
                </h2>
              </Reveal>
            </div>

            <div className="max-w-[820px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {copy.faq.map((item, i) => (
                <Reveal key={item.q} delay={0.04 + i * 0.03}>
                  <div>
                    <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink leading-[1.35] mb-3">
                      {item.q}
                    </h3>
                    <p className="text-[13.5px] text-ink-muted leading-[1.7]">
                      {item.a}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.4}>
              <p className="text-center mt-14 md:mt-20 text-[13px] text-ink-muted">
                {copy.moreQuestions.before}{" "}
                <Link
                  href={localizePath(copy.moreQuestions.href, locale)}
                  className="text-ink underline decoration-rule decoration-[1.5px] underline-offset-4 hover:decoration-ink/40 transition-colors"
                >
                  {copy.moreQuestions.link}
                </Link>
                .
              </p>
            </Reveal>
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

function TierCard({
  tier,
  popularLabel,
  href,
}: {
  tier: Tier;
  popularLabel: string;
  href: string;
}) {
  const highlighted = tier.highlighted;
  return (
    <article
      className={`relative h-full p-7 md:p-8 flex flex-col gap-5 ${
        highlighted ? "bg-ink text-white" : "bg-card"
      }`}
    >
      {highlighted && (
        <span className="absolute top-5 right-5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/55">
          {popularLabel}
        </span>
      )}

      <div>
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.12em] mb-3 ${
            highlighted ? "text-white/50" : "text-ink-soft"
          }`}
        >
          {tier.name}
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-[40px] font-medium tracking-[-0.025em] leading-none ${
              highlighted ? "text-white" : "text-ink"
            }`}
          >
            {tier.price}
          </span>
          <span
            className={`text-[12px] ${
              highlighted ? "text-white/55" : "text-ink-muted"
            }`}
          >
            {tier.cadence}
          </span>
        </div>
        <p
          className={`mt-3 text-[13px] leading-[1.55] ${
            highlighted ? "text-white/70" : "text-ink-muted"
          }`}
        >
          {tier.for}
        </p>
      </div>

      <div
        className={`h-px ${
          highlighted ? "bg-white/15" : "bg-rule"
        }`}
      />

      <ul className="flex-1 flex flex-col gap-2.5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={`mt-[7px] block size-1 rounded-full shrink-0 ${
                highlighted ? "bg-white/55" : "bg-ink-soft"
              }`}
            />
            <span
              className={`text-[13px] leading-[1.55] ${
                highlighted ? "text-white/85" : "text-ink"
              }`}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`inline-flex items-center justify-center text-[13px] font-medium px-4 py-2.5 rounded-full transition-colors ${
          highlighted
            ? "bg-white text-ink hover:bg-white/90"
            : "bg-ink text-white hover:bg-ink/85"
        }`}
      >
        {tier.cta}
      </Link>
    </article>
  );
}
