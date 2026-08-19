"use client";

import { useLocale } from "@/lib/i18n/client";
import { getHomeCopy } from "@/lib/i18n/home-copy";

export function HeroDashboard() {
  const copy = getHomeCopy(useLocale()).dashboard;

  return (
    <div className="relative w-full max-w-[1080px] mx-auto">
      {/* Soft glow behind */}
      <div
        aria-hidden
        className="absolute inset-x-12 top-8 bottom-0 bg-tint/40 rounded-[28px] blur-2xl -z-10"
      />

      {/* The dashboard frame */}
      <div className="bg-card border border-rule rounded-[18px] shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-30px_rgba(15,23,42,0.18)] overflow-hidden">
        {/* Top chrome */}
        <div className="flex items-center justify-between px-4 sm:px-5 h-11 border-b border-rule">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-rule" />
              <span className="size-2.5 rounded-full bg-rule" />
              <span className="size-2.5 rounded-full bg-rule" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft hidden sm:inline ml-2">
              {copy.appPath}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              {copy.live}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 md:p-8">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] border border-rule overflow-hidden mb-6">
            {copy.kpis.map((k) => (
              <div key={k.label} className="bg-card p-4 sm:p-5 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                  {k.label}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[26px] sm:text-[30px] font-medium tracking-[-0.02em] text-ink leading-none">
                    {k.value}
                  </span>
                  <span className="text-[11px] text-ink-muted">{k.delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
            {/* Activity feed (left, larger) */}
            <div className="lg:col-span-3 border border-rule rounded-[12px] overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 h-10 border-b border-rule">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {copy.activityTitle}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                  {copy.activityCount}
                </span>
              </div>
              <ul className="divide-y divide-rule">
                {copy.activity.map((a, i) => (
                  <li
                    key={i}
                    className="px-4 sm:px-5 py-3 sm:py-3.5 flex items-start gap-3 sm:gap-4"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-soft pt-1 w-9 shrink-0">
                      {a.time}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-ink-muted leading-[1.5]">
                        <span className="text-ink font-medium">
                          {a.worker}
                        </span>{" "}
                        <span className="text-ink-soft">·</span> {a.action}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-1 rounded shrink-0 ${
                        a.pending
                          ? "text-ink bg-tint"
                          : "text-ink-muted bg-canvas-soft"
                      }`}
                    >
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Workforce (right, smaller) */}
            <div className="lg:col-span-2 border border-rule rounded-[12px] overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 h-10 border-b border-rule">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {copy.workforceTitle}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-accent" />
                  {copy.online}
                </span>
              </div>
              <ul className="divide-y divide-rule">
                {copy.workers.map((w) => (
                  <li
                    key={w.name}
                    className="px-4 sm:px-5 py-3 flex items-center gap-3"
                  >
                    <span className="size-7 rounded-full bg-tint/60 border border-rule flex items-center justify-center font-mono text-[9px] font-medium text-ink">
                      {w.initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-ink font-medium leading-tight truncate">
                        {w.name}
                      </p>
                      <div className="mt-1.5 h-[3px] bg-canvas-soft rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ink/80 rounded-full"
                          style={{ width: `${w.load}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-ink-soft tabular-nums shrink-0">
                      {w.load}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
