import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getApprovalCenterPageCopy } from "@/lib/i18n/page-copy";
import { getCommonCopy } from "@/lib/i18n/translations";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { ApprovalCard } from "@/components/ApprovalCard";
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
  const copy = getApprovalCenterPageCopy(locale);
  return buildPageMetadata({
    locale,
    path: "approval-center",
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: copy.metadata.keywords,
  });
}

export default async function ApprovalCenterPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const copy = getApprovalCenterPageCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            locale,
            path: "approval-center",
            title: copy.metadata.title,
            description: copy.metadata.description,
          }),
          breadcrumbJsonLd({
            locale,
            items: [
              { name: SITE_NAME, path: "" },
              {
                name: common.links["Approval Center"] ?? "Approval Center",
                path: "approval-center",
              },
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
        />

        {/* Card preview */}
        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-12 lg:gap-16 items-center">
              <div className="max-w-[520px]">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
                    {copy.phone.eyebrow}
                  </p>
                </Reveal>
                <Reveal delay={0.05}>
                  <h2 className="text-[clamp(24px,3.2vw,32px)] font-medium tracking-[-0.025em] leading-[1.18] text-ink mb-5">
                    {copy.phone.title}
                  </h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="text-[14.5px] text-ink-muted leading-[1.7] mb-6">
                    {copy.phone.paragraphs[0]}
                  </p>
                </Reveal>
                <Reveal delay={0.16}>
                  <p className="text-[14.5px] text-ink-muted leading-[1.7]">
                    {copy.phone.paragraphs[1]}
                  </p>
                </Reveal>
              </div>
              <div className="lg:pl-8">
                <Reveal delay={0.2}>
                  <ApprovalCard />
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* Three modes */}
        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="max-w-[760px] mb-14 md:mb-16">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
                  {copy.modesIntro.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="text-[clamp(26px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.15] text-ink">
                  {copy.modesIntro.title}
                </h2>
              </Reveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
              {copy.modes.map((m, i) => (
                <Reveal key={m.tag} delay={0.04 + i * 0.04}>
                  <div className="bg-card p-7 md:p-8 h-full flex flex-col">
                    <span className="self-start font-mono text-[10px] uppercase tracking-[0.12em] text-ink bg-canvas-soft border border-rule rounded px-2 py-0.5 mb-5">
                      {m.tag}
                    </span>
                    <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-[1.3] mb-3">
                      {m.title}
                    </h3>
                    <p className="text-[13.5px] text-ink-muted leading-[1.7]">
                      {m.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Guards */}
        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="bg-tint/40 rounded-[24px] px-7 sm:px-10 md:px-16 py-14 md:py-20">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
                <div className="md:col-span-5">
                  <Reveal>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted mb-5">
                      {copy.guardsIntro.eyebrow}
                    </p>
                  </Reveal>
                  <Reveal delay={0.05}>
                    <h2 className="text-[clamp(26px,3.4vw,34px)] font-medium tracking-[-0.025em] leading-[1.12] text-ink">
                      {copy.guardsIntro.title}
                    </h2>
                  </Reveal>
                  <Reveal delay={0.12}>
                    <p className="text-[14.5px] text-ink-muted leading-[1.65] mt-5 max-w-[420px]">
                      {copy.guardsIntro.body}
                    </p>
                  </Reveal>
                </div>
                <div className="md:col-span-7">
                  <Reveal delay={0.15}>
                    <ul className="flex flex-col gap-4">
                      {copy.guards.map((g) => (
                        <li key={g} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-[7px] block size-1.5 rounded-full bg-accent shrink-0"
                          />
                          <span className="text-[14.5px] text-ink leading-[1.55]">
                            {g}
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

        {/* Flow */}
        <section className="py-20 md:py-28 border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="max-w-[760px] mb-14 md:mb-16">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
                  {copy.flowIntro.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="text-[clamp(26px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.15] text-ink">
                  {copy.flowIntro.title}
                </h2>
              </Reveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 lg:gap-x-16 gap-y-10">
              {copy.flow.map((f, i) => (
                <Reveal key={f.title} delay={0.04 + i * 0.04}>
                  <article className="flex flex-col">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-4 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-[16px] font-medium tracking-[-0.01em] text-ink leading-[1.3] mb-2.5">
                      {f.title}
                    </h3>
                    <p className="text-[13.5px] text-ink-muted leading-[1.7] max-w-[320px]">
                      {f.body}
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
