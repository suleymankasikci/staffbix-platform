"use client";

import Link from "next/link";
import { useLocalizedPath } from "@/lib/i18n/client";

/**
 * Shared, tenant-app banner shown when a plan cap has been hit or is
 * approaching. Three tones map to how close the operator is to the
 * ceiling:
 *
 *   - "ok"     → green / no banner (callers usually skip rendering at all)
 *   - "warn"   → amber, "you're at X% — heads-up"
 *   - "block"  → red,  "you've hit the cap — upgrade to continue"
 *
 * Each callsite passes its own `title` + `body` because the wording is
 * specific to the limit (workers vs seats vs AI dollars). The component
 * just owns the visual + the upgrade-plan link so the look stays
 * consistent across the user-panel pages.
 */
export type PlanLimitTone = "warn" | "block";

export function PlanLimitBanner({
  tone,
  title,
  body,
  cta,
  hint,
}: {
  tone: PlanLimitTone;
  title: string;
  body: string;
  /** Upgrade-plan button label. Default: "Upgrade plan". */
  cta?: string;
  /** Small below-CTA helper string, e.g. "{current}/{limit} used". */
  hint?: string;
}) {
  const href = useLocalizedPath();
  const palette =
    tone === "block"
      ? {
          frame:
            "border-[#B91C1C]/40 bg-[#FEF2F2] text-[#7F1D1D]",
          accent: "text-[#B91C1C]",
          button: "bg-[#B91C1C] text-white hover:bg-[#991B1B]",
        }
      : {
          frame:
            "border-[#B45309]/40 bg-[#FFFBEB] text-[#78350F]",
          accent: "text-[#B45309]",
          button: "bg-[#B45309] text-white hover:bg-[#92400E]",
        };

  return (
    <div
      role="alert"
      className={`mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-md border ${palette.frame}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`font-mono text-[10px] uppercase tracking-[0.12em] ${palette.accent} mb-1`}>
          {title}
        </p>
        <p className="text-[13px] leading-[1.5]">{body}</p>
        {hint && (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] opacity-70 mt-1">
            {hint}
          </p>
        )}
      </div>
      <Link
        href={href("/app/billing")}
        className={`inline-flex items-center text-[12.5px] font-medium px-4 py-2 rounded-full transition-colors shrink-0 ${palette.button}`}
      >
        {cta ?? "Upgrade plan"}
      </Link>
    </div>
  );
}

/**
 * Tiny coloured progress bar used inside billing cards. Pure CSS — no
 * logic. Caller decides the percentage; component picks the colour
 * based on it (>=100 red, >=80 amber, otherwise ink).
 */
export function PlanLimitBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const color =
    clamped >= 100
      ? "bg-[#B91C1C]"
      : clamped >= 80
        ? "bg-[#B45309]"
        : "bg-ink";
  return (
    <div className="h-1 bg-canvas-soft rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-[width] duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/**
 * Returns the right tone for a given (current, limit) pair, or null
 * when there's nothing to show. Limit `-1` means unlimited.
 */
export function planLimitTone(
  current: number,
  limit: number,
): PlanLimitTone | null {
  if (limit === -1) return null;
  if (current >= limit) return "block";
  if (current >= Math.max(1, Math.floor(limit * 0.8))) return "warn";
  return null;
}
