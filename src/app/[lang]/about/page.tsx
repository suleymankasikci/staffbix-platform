import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAboutPageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
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
  const copy = getAboutPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "about",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getAboutPageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "about",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              { name: common.links.About ?? "About", path: "about" },
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

        {/* Story */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-3">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft md:sticky md:top-24">
                    {copy.story.eyebrow}
                  </p>
                </Reveal>
              </div>
              <div className="md:col-span-8 lg:col-span-7 max-w-[680px]">
                <Reveal delay={0.06}>
                  <p className="text-[clamp(20px,2.4vw,26px)] font-medium tracking-[-0.02em] leading-[1.35] text-ink mb-8">
                    {copy.story.paragraphs[0]}
                  </p>
                </Reveal>
                <Reveal delay={0.12}>
                  <p className="text-[15px] md:text-[16px] text-ink-muted leading-[1.75] mb-6">
                    {copy.story.paragraphs[1]}
                  </p>
                </Reveal>
                <Reveal delay={0.18}>
                  <p className="text-[15px] md:text-[16px] text-ink-muted leading-[1.75] mb-6">
                    {copy.story.paragraphs[2]}
                  </p>
                </Reveal>
                <Reveal delay={0.24}>
                  <p className="text-[15px] md:text-[16px] text-ink-muted leading-[1.75] mb-6">
                    {copy.story.paragraphs[3]}
                  </p>
                </Reveal>
                <Reveal delay={0.3}>
                  <p className="text-[15px] md:text-[16px] text-ink-muted leading-[1.75] mb-10">
                    {copy.story.paragraphs[4]}
                  </p>
                </Reveal>

                <Reveal delay={0.38}>
                  <div className="flex items-center gap-4 pt-6 border-t border-rule">
                    <div className="size-10 rounded-full bg-tint/60 border border-rule flex items-center justify-center">
                      <span className="font-mono text-[11px] font-medium text-ink">
                        SK
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-ink leading-tight">
                        {copy.story.founderName}
                      </p>
                      <p className="text-[12px] text-ink-muted">
                        {copy.story.founderTitle}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* Facts strip */}
        <section className="border-y border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule">
              {copy.facts.map((f) => (
                <div key={f.label} className="p-7 md:p-8 first:pl-0 last:pr-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">
                    {f.label}
                  </p>
                  <p className="text-[18px] font-medium tracking-[-0.015em] text-ink leading-tight">
                    {f.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="max-w-[760px] mb-14 md:mb-20">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-6">
                  {copy.principlesIntro.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 className="text-[clamp(28px,3.8vw,40px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-5">
                  {copy.principlesIntro.title}
                </h2>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="text-[15px] text-ink-muted leading-[1.65] max-w-[560px]">
                  {copy.principlesIntro.body}
                </p>
              </Reveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-10 md:gap-y-12">
              {copy.principles.map((p, i) => (
                <Reveal key={p.title} delay={0.04 + i * 0.04}>
                  <article>
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-[1.3]">
                        {p.title}
                      </h3>
                    </div>
                    <p className="text-[13.5px] text-ink-muted leading-[1.7] max-w-[440px]">
                      {p.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
