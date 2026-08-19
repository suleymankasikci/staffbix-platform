import type { ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getLegalLayoutCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { Reveal } from "./Reveal";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export type LegalLayoutProps = {
  eyebrow: string;
  title: string;
  effective: string;
  intro: string;
  sections: LegalSection[];
  contactLine?: string;
  locale?: Locale;
};

export function LegalLayout({
  eyebrow,
  title,
  effective,
  intro,
  sections,
  contactLine,
  locale = "en",
}: LegalLayoutProps) {
  const copy = getLegalLayoutCopy(locale);
  const resolvedContactLine = contactLine ?? copy.defaultContact;

  return (
    <>
      <Nav />
      <main>
        {/* Header */}
        <section className="pt-10 md:pt-14 pb-10 md:pb-14 border-b border-rule">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
                {eyebrow}
              </p>
            </Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <Reveal delay={0.05}>
                <h1 className="text-[clamp(32px,4.6vw,48px)] font-medium tracking-[-0.025em] leading-[1.06] text-ink max-w-[680px]">
                  {title}
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft md:text-right">
                  <p>
                    {copy.effective} {effective}
                  </p>
                  <p className="mt-1">{copy.version}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 lg:gap-16">
              {/* Sidebar */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-4">
                    {copy.legalIndex}
                  </p>
                  <nav className="flex flex-col gap-1.5 mb-8 pb-7 border-b border-rule">
                    {copy.nav.map((l) => (
                      <Link
                        key={l.href}
                        href={localizePath(l.href, locale)}
                        className="text-[13px] text-ink-muted hover:text-ink transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </nav>

                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-4">
                    {copy.onThisPage}
                  </p>
                  <nav className="flex flex-col gap-2">
                    {sections.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="text-[13px] text-ink-muted hover:text-ink transition-colors leading-snug"
                      >
                        {s.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Article */}
              <article className="max-w-[720px]">
                <Reveal>
                  <p className="text-[15px] md:text-[16px] text-ink-muted leading-[1.7] mb-12 md:mb-16">
                    {intro}
                  </p>
                </Reveal>

                {sections.map((s, i) => (
                  <Reveal key={s.id} delay={0.04 + i * 0.02}>
                    <div className="mb-12 md:mb-14">
                      <div className="flex items-baseline gap-3 mb-4">
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h2
                          id={s.id}
                          className="text-[20px] md:text-[22px] font-medium tracking-[-0.015em] text-ink leading-[1.25] scroll-mt-24"
                        >
                          {s.title}
                        </h2>
                      </div>
                      <div className="ml-0 lg:ml-7 text-[14px] text-ink-muted leading-[1.75] [&_p+p]:mt-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:mt-3 [&_li]:flex [&_li]:items-start [&_li]:gap-2.5 [&_li]:before:content-[''] [&_li]:before:mt-[8px] [&_li]:before:size-1 [&_li]:before:rounded-full [&_li]:before:bg-ink-soft [&_li]:before:shrink-0 [&_strong]:text-ink [&_strong]:font-medium [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:bg-canvas-soft [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded">
                        {s.body}
                      </div>
                    </div>
                  </Reveal>
                ))}

                <Reveal>
                  <div className="mt-16 pt-8 border-t border-rule">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      {resolvedContactLine}
                    </p>
                  </div>
                </Reveal>
              </article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
