import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getCareersPageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { localizePath } from "@/lib/i18n/routing";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { FinalCTA } from "@/components/FinalCTA";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME } from "@/lib/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getCareersPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "careers",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getCareersPageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "careers",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              { name: common.links.Careers ?? "Careers", path: "careers" },
            ],
          }),
        ]}
      />
      <Nav />
      <main>
        <PageHeader
          eyebrow={copy.header.eyebrow}
          title={copy.header.title}
          sub={copy.header.sub}
          align="left"
        />

        {/* Openings */}
        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="flex items-end justify-between mb-10">
              <div>
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-3">
                    {copy.openingsIntro.eyebrow}
                  </p>
                </Reveal>
                <Reveal delay={0.05}>
                  <h2 className="text-[clamp(26px,3.4vw,34px)] font-medium tracking-[-0.025em] leading-[1.15] text-ink">
                    {copy.openings.length} {copy.openingsIntro.suffix}
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <Link
                  href="mailto:careers@staffbix.com"
                  className="hidden sm:inline-flex font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors items-center gap-2"
                >
                  {copy.openingsIntro.noFit}{" "}
                  <span className="text-ink">{copy.openingsIntro.email}</span>
                  <span aria-hidden>→</span>
                </Link>
              </Reveal>
            </div>

            <div className="border border-rule rounded-[14px] overflow-hidden divide-y divide-rule">
              {copy.openings.map((o, i) => (
                <Reveal key={o.slug} delay={0.04 + i * 0.03}>
                  <Link
                    href={localizePath(`/careers/${o.slug}`, locale)}
                    className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 sm:px-6 sm:py-5 bg-card hover:bg-canvas-soft transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">
                        {o.team}
                      </p>
                      <h3 className="text-[16px] font-medium tracking-[-0.01em] text-ink leading-[1.3]">
                        {o.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right hidden sm:block">
                        <p className="text-[12.5px] text-ink-muted leading-tight">
                          {o.location}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mt-1">
                          {o.type}
                        </p>
                      </div>
                      <span
                        aria-hidden
                        className="text-ink-soft group-hover:text-ink transition-colors text-[16px]"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="max-w-[700px] mb-14 md:mb-16">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-3">
                  {copy.valuesIntro.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="text-[clamp(26px,3.4vw,34px)] font-medium tracking-[-0.025em] leading-[1.15] text-ink">
                  {copy.valuesIntro.title}
                </h2>
              </Reveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-10">
              {copy.values.map((v, i) => (
                <Reveal key={v.title} delay={0.04 + i * 0.04}>
                  <article>
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-[1.3]">
                        {v.title}
                      </h3>
                    </div>
                    <p className="text-[13.5px] text-ink-muted leading-[1.7] max-w-[440px]">
                      {v.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Perks */}
        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="bg-tint/40 rounded-[24px] px-7 sm:px-10 md:px-16 py-14 md:py-20">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
                <div className="md:col-span-5">
                  <Reveal>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted mb-5">
                      {copy.perksIntro.eyebrow}
                    </p>
                  </Reveal>
                  <Reveal delay={0.05}>
                    <h2 className="text-[clamp(26px,3.4vw,34px)] font-medium tracking-[-0.025em] leading-[1.12] text-ink">
                      {copy.perksIntro.titleLine1}
                      <br />
                      {copy.perksIntro.titleLine2}
                    </h2>
                  </Reveal>
                </div>
                <div className="md:col-span-7">
                  <Reveal delay={0.1}>
                    <ul className="flex flex-col gap-4">
                      {copy.perks.map((p) => (
                        <li key={p} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-[7px] block size-1.5 rounded-full bg-accent shrink-0"
                          />
                          <span className="text-[14.5px] text-ink leading-[1.55]">
                            {p}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
