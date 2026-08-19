"use client";

import { Reveal } from "./Reveal";
import { useLocale } from "@/lib/i18n/client";
import { getHomeCopy } from "@/lib/i18n/home-copy";

export function HowItWorks() {
  const copy = getHomeCopy(useLocale()).how;

  return (
    <section id="how-it-works" className="py-14 md:py-32 border-t border-rule">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="text-center max-w-[760px] mx-auto mb-10 md:mb-24">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-7">
              {copy.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-[clamp(28px,4vw,42px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-5">
              {copy.title}
            </h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 lg:gap-x-20 gap-y-12 md:gap-y-14 max-w-[1080px] mx-auto">
          {copy.steps.map((s, i) => (
            <Reveal key={s.title} delay={0.06 + i * 0.04}>
              <Step index={i + 1} title={s.title} body={s.body} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col max-w-[340px]">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
        {String(index).padStart(2, "0")}
      </span>
      <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-[1.3] mb-2.5">
        {title}
      </h3>
      <p className="text-[13.5px] text-ink-muted leading-[1.7]">{body}</p>
    </div>
  );
}
