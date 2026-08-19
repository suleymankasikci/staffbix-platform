"use client";

import Link from "next/link";
import { Reveal } from "./Reveal";
import { PRIMARY_CTA, SECONDARY_CTA } from "@/lib/brand";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";
import { getHomeCopy } from "@/lib/i18n/home-copy";

export function FinalCTA() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);
  const homeCopy = getHomeCopy(locale).finalCta;

  return (
    <section className="px-6 md:px-10 pb-12 md:pb-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="relative bg-ink text-white rounded-[24px] overflow-hidden px-8 sm:px-12 md:px-16 py-12 md:py-24">
          {/* Subtle tinted glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-24 w-[440px] h-[440px] rounded-full bg-tint/15 blur-3xl"
          />

          <div className="relative text-center max-w-[720px] mx-auto">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-7">
                {homeCopy.eyebrow}
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <h2 className="text-[clamp(32px,5vw,52px)] font-medium tracking-[-0.025em] leading-[1.05] mb-6">
                {copy.tagline}
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="text-[15px] md:text-[16px] text-white/65 leading-[1.6] max-w-[520px] mx-auto mb-10">
                {homeCopy.body}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={href(PRIMARY_CTA.href)}
                  className="inline-flex items-center text-[13.5px] font-medium px-5 py-2.5 rounded-full bg-white text-ink hover:bg-white/90 transition-colors"
                >
                  {copy.cta.primary}
                </Link>
                <Link
                  href={href(SECONDARY_CTA.href)}
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white/85 hover:text-white transition-colors px-5 py-2.5 rounded-full border border-white/15 hover:border-white/30"
                >
                  {copy.cta.secondary}
                  <span aria-hidden className="text-white/50">
                    →
                  </span>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.28}>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-white/35">
                {copy.trialLine}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
