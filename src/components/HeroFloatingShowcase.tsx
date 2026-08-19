"use client";

import { useLocale } from "@/lib/i18n/client";
import { getHomeCopy } from "@/lib/i18n/home-copy";

/**
 * Hero floating showcase — a constellation of small product UI fragments
 * orbiting the headline. Replaces the previous static-dashboard
 * HeroDashboard, gives the landing some movement and proves the product
 * shape (chat, approvals, brand bible, plans, integrations, revenue) at
 * a glance.
 *
 * Cards are positioned absolutely against a fixed-height stage so the
 * composition stays visually balanced. On mobile they degrade to a
 * vertical stack — readable, no overlap.
 */
export function HeroFloatingShowcase() {
  const copy = getHomeCopy(useLocale()).showcase;

  return (
    <div className="relative w-full">
      {/* ── Desktop / tablet: orbiting absolute composition ─────────── */}
      <div className="hidden md:block relative h-[520px] lg:h-[560px]">
        {/* Decorative concentric arcs behind everything */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full text-lavender-deep/40 pointer-events-none"
          viewBox="0 0 1200 560"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {[180, 240, 300, 360, 420, 480].map((r) => (
            <circle
              key={r}
              cx={600}
              cy={560}
              r={r}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          ))}
        </svg>

        {/* Card 1 — AI worker chat (top-left) */}
        <FloatingCard
          className="absolute left-[2%] lg:left-[6%] top-[6%] w-[230px] lg:w-[250px] rotate-[-4deg]"
          delay={0.1}
        >
          <div className="flex items-start gap-2.5 mb-2.5">
            <span className="size-7 rounded-full bg-mint flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
              CY
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium text-ink leading-tight">
                {copy.workerCard.name}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                {copy.workerCard.role}
              </p>
            </div>
          </div>
          <p className="text-[11.5px] text-ink-muted leading-[1.5] bg-canvas-soft rounded-lg px-2.5 py-2 border border-rule">
            {copy.workerCard.userMessage}
          </p>
          <p className="text-[11.5px] text-ink leading-[1.5] mt-1.5 px-1">
            {copy.workerCard.assistantReply}
          </p>
        </FloatingCard>

        {/* Card 2 — Brand Bible source (top-right) */}
        <FloatingCard
          className="absolute right-[3%] lg:right-[7%] top-[2%] w-[210px] rotate-[3deg] bg-cream/60"
          delay={0.18}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="size-6 rounded-md bg-peach flex items-center justify-center text-[10px]">
              📕
            </span>
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
              {copy.bibleCard.label}
            </p>
          </div>
          <p className="text-[12.5px] font-medium text-ink leading-tight mb-0.5">
            {copy.bibleCard.title}
          </p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-soft">
            {copy.bibleCard.meta}
          </p>
          <div className="mt-2.5 flex items-center gap-1">
            <div className="h-1 flex-1 rounded-full bg-rule overflow-hidden">
              <div className="h-full w-[78%] bg-mint-deep" />
            </div>
            <span className="font-mono text-[9px] text-ink-soft">78%</span>
          </div>
        </FloatingCard>

        {/* Card 3 — Approval queue (middle-left) */}
        <FloatingCard
          className="absolute left-[1%] lg:left-[3%] bottom-[12%] w-[260px] rotate-[2deg]"
          delay={0.26}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-soft">
              {copy.approvalCard.label}
            </p>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-peach text-ink">
              {copy.approvalCard.badge}
            </span>
          </div>
          <p className="text-[12.5px] text-ink leading-snug mb-2.5">
            {copy.approvalCard.body}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="flex-1 text-[10.5px] font-medium px-2 py-1.5 rounded-md bg-ink text-white"
            >
              {copy.approvalCard.approve}
            </button>
            <button
              type="button"
              className="text-[10.5px] font-medium px-2 py-1.5 rounded-md border border-rule text-ink-muted"
            >
              {copy.approvalCard.edit}
            </button>
          </div>
        </FloatingCard>

        {/* Card 4 — Plan tier (bottom-right) */}
        <FloatingCard
          className="absolute right-[1%] lg:right-[4%] bottom-[10%] w-[230px] rotate-[-3deg] bg-lavender/80"
          delay={0.34}
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-soft">
              {copy.planCard.label}
            </p>
            <span className="font-mono text-[9px] text-mint-deep">
              {copy.planCard.badge}
            </span>
          </div>
          <p className="text-[20px] font-medium text-ink leading-none mb-0.5">
            {copy.planCard.title}
          </p>
          <p className="font-mono text-[10px] text-ink-muted">{copy.planCard.price}</p>
          <ul className="mt-3 space-y-1">
            {copy.planCard.bullets.map((b: string) => (
              <li
                key={b}
                className="flex items-center gap-1.5 text-[11px] text-ink-muted"
              >
                <span className="size-1 rounded-full bg-mint-deep" />
                {b}
              </li>
            ))}
          </ul>
        </FloatingCard>

        {/* Card 5 — Integrations (middle-right, higher) */}
        <FloatingCard
          className="absolute right-[12%] lg:right-[16%] top-[36%] w-[170px] rotate-[5deg]"
          delay={0.4}
        >
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-soft mb-2.5">
            {copy.channelsCard.label}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {copy.channelsCard.channels.map((c: string) => (
              <div
                key={c}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-canvas-soft border border-rule"
              >
                <span className="size-1.5 rounded-full bg-mint-deep" />
                <span className="text-[10.5px] text-ink font-medium">{c}</span>
              </div>
            ))}
          </div>
        </FloatingCard>

        {/* Card 6 — Revenue / spend sparkline (middle-left lower) */}
        <FloatingCard
          className="absolute left-[18%] lg:left-[22%] bottom-[2%] w-[190px] rotate-[-2deg] bg-mint/35"
          delay={0.46}
        >
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-soft mb-1">
            {copy.revenueCard.label}
          </p>
          <p className="text-[22px] font-medium text-ink leading-none mb-0.5 tabular-nums">
            {copy.revenueCard.value}
          </p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[9.5px] text-mint-deep">
              {copy.revenueCard.delta}
            </p>
            <svg viewBox="0 0 80 24" className="w-16 h-5">
              <polyline
                points="0,18 10,15 20,16 30,12 40,13 50,8 60,9 70,4 80,5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-mint-deep"
              />
            </svg>
          </div>
        </FloatingCard>

        {/* Card 7 (subtle) — small status pill bottom center */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[44%] hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-rule shadow-sm">
          <span className="size-1.5 rounded-full bg-mint-deep animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            {copy.statusPill}
          </span>
        </div>
      </div>

      {/* ── Mobile: simplified vertical stack ───────────────────────── */}
      <div className="md:hidden grid grid-cols-1 gap-3 mt-2">
        <FloatingCard className="w-full">
          <div className="flex items-start gap-2.5 mb-2">
            <span className="size-7 rounded-full bg-mint flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
              CY
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ink leading-tight">
                {copy.workerCard.name}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                {copy.workerCard.role}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-ink-muted leading-[1.5] bg-canvas-soft rounded-lg px-2.5 py-2 border border-rule">
            {copy.workerCard.userMessage}
          </p>
          <p className="text-[12px] text-ink leading-[1.5] mt-1.5 px-1">
            {copy.workerCard.assistantReply}
          </p>
        </FloatingCard>

        <div className="grid grid-cols-2 gap-3">
          <FloatingCard className="w-full bg-mint/35">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-soft mb-1">
              {copy.revenueCard.label}
            </p>
            <p className="text-[20px] font-medium text-ink leading-none tabular-nums">
              {copy.revenueCard.value}
            </p>
            <p className="font-mono text-[9.5px] text-mint-deep mt-1">
              {copy.revenueCard.delta}
            </p>
          </FloatingCard>
          <FloatingCard className="w-full bg-lavender/80">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-soft mb-1">
              {copy.planCard.label}
            </p>
            <p className="text-[18px] font-medium text-ink leading-none">
              {copy.planCard.title}
            </p>
            <p className="font-mono text-[9.5px] text-ink-muted mt-1">
              {copy.planCard.price}
            </p>
          </FloatingCard>
        </div>
      </div>
    </div>
  );
}

function FloatingCard({
  className = "",
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-card border border-rule rounded-2xl p-3 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18),0_2px_6px_-2px_rgba(15,23,42,0.04)] motion-safe:opacity-0 motion-safe:translate-y-2 motion-safe:animate-[reveal-in_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
