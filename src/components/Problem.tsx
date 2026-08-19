"use client";

import { Reveal } from "./Reveal";
import { useLocale } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";
import { getHomeCopy } from "@/lib/i18n/home-copy";

export function Problem() {
  const locale = useLocale();
  const copy = getCommonCopy(locale);
  const homeCopy = getHomeCopy(locale).problem;

  return (
    <section className="py-14 md:py-32 border-t border-rule">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="text-center max-w-[820px] mx-auto">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-10">
              {homeCopy.eyebrow}
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <blockquote className="text-[clamp(24px,3.4vw,36px)] font-medium tracking-[-0.02em] leading-[1.18] text-ink mb-10 md:mb-20">
              {copy.problemQuote}
            </blockquote>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden max-w-[860px] mx-auto">
            {homeCopy.stats.map((s) => (
              <div
                key={s.label}
                className="bg-card p-7 sm:p-8 text-center"
              >
                <div className="text-[40px] sm:text-[48px] font-medium tracking-[-0.03em] text-ink leading-none mb-3">
                  {s.numeral}
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
