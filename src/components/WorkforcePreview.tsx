"use client";

import Link from "next/link";
import { Reveal } from "./Reveal";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getHomeCopy } from "@/lib/i18n/home-copy";

type Role = {
  category: string;
  title: string;
  summary: string;
  status: "available" | "q3";
};

export function WorkforcePreview() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getHomeCopy(locale).workforce;

  return (
    <section id="workforce" className="py-14 md:py-32 border-t border-rule">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="text-center max-w-[760px] mx-auto mb-10 md:mb-20">
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
          <Reveal delay={0.12}>
            <p className="text-[15px] md:text-[16px] text-ink-muted leading-[1.6] max-w-[560px] mx-auto">
              {copy.body}
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule rounded-[14px] overflow-hidden">
          {copy.roles.map((r, i) => (
            <Reveal key={r.title} delay={0.04 + i * 0.03}>
              <RoleCard
                role={r}
                availableLabel={copy.available}
                comingLabel={copy.coming}
                hireAsLabel={copy.hireAs}
              />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.4}>
          <div className="mt-10 text-center">
            <Link
              href={href("/workforce")}
              className="inline-flex items-center gap-2 text-[13.5px] font-medium text-ink hover:text-ink-muted transition-colors border border-rule rounded-full px-5 py-2.5 hover:border-ink/20"
            >
              {copy.seeAll}
              <span aria-hidden className="text-ink-muted">
                →
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function RoleCard({
  role,
  availableLabel,
  comingLabel,
  hireAsLabel,
}: {
  role: Role;
  availableLabel: string;
  comingLabel: string;
  hireAsLabel: string;
}) {
  const isAvailable = role.status === "available";
  return (
    <article className="group h-full bg-card p-6 flex flex-col gap-3 transition-colors hover:bg-canvas-soft">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
          {role.category}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
            isAvailable ? "text-accent" : "text-ink-soft"
          }`}
        >
          <span
            className={`size-[5px] rounded-full ${
              isAvailable ? "bg-accent" : "bg-ink-soft"
            }`}
          />
          {isAvailable ? availableLabel : comingLabel}
        </span>
      </div>

      <h3 className="text-[18px] font-medium tracking-[-0.015em] text-ink leading-[1.2] mt-1">
        {role.title}
      </h3>

      <p className="text-[13px] text-ink-muted leading-[1.6] flex-1">
        {role.summary}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
          {hireAsLabel}
        </span>
        <span
          aria-hidden
          className="text-ink-muted group-hover:text-ink transition-colors text-[13px]"
        >
          →
        </span>
      </div>
    </article>
  );
}
