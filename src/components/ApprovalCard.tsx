"use client";

import { useLocale } from "@/lib/i18n/client";
import { getApprovalCenterPageCopy } from "@/lib/i18n/page-copy";

export function ApprovalCard() {
  const copy = getApprovalCenterPageCopy(useLocale()).card;

  return (
    <div className="relative w-full max-w-[400px] mx-auto md:mx-0 md:ml-auto">
      {/* Stack hint cards behind, for visual depth */}
      <div
        aria-hidden
        className="absolute inset-x-6 -bottom-3 h-14 bg-card border border-rule rounded-[14px] -z-10 opacity-60"
      />
      <div
        aria-hidden
        className="absolute inset-x-3 -bottom-1.5 h-14 bg-card border border-rule rounded-[14px] -z-10 opacity-80"
      />

      {/* Main approval card */}
      <article
        className="relative bg-card border border-rule rounded-[14px] p-5 sm:p-6 shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_28px_-12px_rgba(15,23,42,0.12)]"
        aria-label={copy.aria}
      >
        {/* Top label */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-50 animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              {copy.label}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
            {copy.count}
          </span>
        </div>

        {/* Worker meta */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="size-5 rounded-full bg-ink/5 border border-rule flex items-center justify-center">
            <span className="font-mono text-[8px] font-medium text-ink-muted">
              {copy.initials}
            </span>
          </span>
          <span className="text-[12px] text-ink-muted">
            <span className="text-ink font-medium">{copy.worker}</span>
            <span className="mx-1.5 text-ink-soft">·</span>
            <span>{copy.time}</span>
          </span>
        </div>

        {/* Headline */}
        <h3 className="font-display font-light text-[20px] leading-[1.2] tracking-[-0.01em] text-ink mb-3">
          {copy.title}
        </h3>

        {/* Body */}
        <p className="text-[13px] text-ink-muted leading-[1.6] mb-5">
          {copy.bodyBefore}{" "}
          <span className="text-ink">{copy.bodyHighlight}</span>{" "}
          {copy.bodyAfter}
        </p>

        {/* Meta rows */}
        <div className="border-t border-rule pt-4 mb-5 space-y-2">
          {copy.rows.map((row) => (
            <Row
              key={row.label}
              label={row.label}
              value={row.value}
              tone="ok"
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 text-[12.5px] font-medium px-3 py-2.5 rounded-md bg-accent text-white hover:bg-accent-deep transition-colors"
          >
            {copy.approve}
          </button>
          <button
            type="button"
            className="flex-1 text-[12.5px] font-medium px-3 py-2.5 rounded-md bg-card border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.review}
          </button>
        </div>
      </article>

      {/* Below the card, a tiny annotation */}
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft text-center md:text-right">
        {copy.note}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.06em]">
      <span className="text-ink-muted">{label}</span>
      <span
        className={
          tone === "ok"
            ? "text-ink font-medium"
            : "text-ink-muted"
        }
      >
        {value}
      </span>
    </div>
  );
}
