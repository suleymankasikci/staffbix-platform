"use client";

import { Reveal } from "./Reveal";
import { useLocale } from "@/lib/i18n/client";
import { getHomeCopy } from "@/lib/i18n/home-copy";

export function BrandBibleSection() {
  const copy = getHomeCopy(useLocale()).brandBible;

  return (
    <section className="py-12 md:py-36">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="bg-tint/45 rounded-[24px] px-6 sm:px-10 md:px-16 py-12 md:py-24">
          <div className="text-center max-w-[760px] mx-auto mb-10 md:mb-16">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted mb-7">
                {copy.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="text-[clamp(28px,4vw,42px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-5">
                {copy.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="text-[15px] md:text-[16px] text-ink-muted leading-[1.6] max-w-[560px] mx-auto">
                {copy.body}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="bg-card border border-rule rounded-[14px] overflow-hidden max-w-[760px] mx-auto shadow-[0_1px_0_rgba(0,0,0,0.02),0_16px_40px_-24px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-rule">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  {copy.fileName}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                  {copy.completion}
                </span>
              </div>
              <ul className="divide-y divide-rule">
                {copy.fields.map((f, i) => (
                  <li
                    key={f.key}
                    className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_auto] items-center gap-4 px-5 py-3.5"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                      {String(i + 1).padStart(2, "0")} · {f.key}
                    </span>
                    <span className="text-[13px] text-ink leading-snug">
                      {f.value}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
                      {copy.synced}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10 max-w-[760px] mx-auto">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted mb-3 text-center">
                {copy.readBy}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {copy.readers.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 bg-card border border-rule rounded-full px-2.5 py-1"
                  >
                    <span className="size-[5px] rounded-full bg-accent" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink">
                      {r}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
