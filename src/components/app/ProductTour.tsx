"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocalizedPath } from "@/lib/i18n/client";
import {
  IconClose,
  IconArrowRight,
  IconDashboard,
  IconWorkforce,
  IconBrandBible,
  IconApprovals,
  IconBilling,
} from "@/components/Icons";

/**
 * One-shot onboarding tour shown on the dashboard.
 *
 * Persistence is per-browser via `localStorage.staffbix_tour_dismissed`.
 * Setting that key to "1" — either by completing step 5 or by clicking
 * Skip on any step — silences the component forever on this browser.
 * To re-trigger for testing, run `localStorage.removeItem("staffbix_tour_dismissed")`
 * in the devtools console.
 */

const DISMISS_KEY = "staffbix_tour_dismissed";

type Step = {
  title: string;
  body: string;
  href?: string;
  Icon: React.ComponentType<{
    width?: number;
    height?: number;
    className?: string;
  }>;
};

const STEPS: Step[] = [
  {
    title: "Welcome to Staffbix",
    body: "Your dashboard surfaces the daily briefing, pending approvals, AI spend, and the workforce you have hired. Everything in the product flows from these four numbers.",
    Icon: IconDashboard,
  },
  {
    title: "Hire your first worker",
    body: "Pick a role from the 64-role catalog, give them a short brief, and they are ready in seconds. The catalog lives at /app/workforce/hire.",
    href: "/app/workforce/hire",
    Icon: IconWorkforce,
  },
  {
    title: "Upload your Brand Bible",
    body: "Workers reply better when they have read what you have written. One deck or About page is enough to start — more is welcome later.",
    href: "/app/brand-bible",
    Icon: IconBrandBible,
  },
  {
    title: "Approve or auto-mode",
    body: "Every outbound action lands in Approvals until you trust a channel enough to switch it to auto. You can do this per worker, per channel.",
    href: "/app/approvals",
    Icon: IconApprovals,
  },
  {
    title: "Watch your spend",
    body: "Each AI call is metered to the token. Billing shows month-to-date spend against your cap, and you can raise the cap in one click.",
    href: "/app/billing",
    Icon: IconBilling,
  },
];

export function ProductTour() {
  const href = useLocalizedPath();
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      setVisible(true);
    } catch {
      // localStorage blocked (Safari private, embedded iframe). Skip.
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore — user just gets shown the tour again next visit
    }
    setVisible(false);
  }

  function next() {
    if (stepIndex >= STEPS.length - 1) {
      dismiss();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  if (!visible) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))]"
      role="dialog"
      aria-label="Product tour"
    >
      <div className="bg-card border border-rule rounded-[12px] shadow-[0_12px_36px_-12px_rgba(10,10,10,0.18)] overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="size-7 rounded-full bg-tint/60 border border-rule flex items-center justify-center shrink-0">
              <step.Icon width={14} height={14} className="text-ink" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                Tour · {stepIndex + 1} / {STEPS.length}
              </p>
              <p className="text-[13.5px] font-medium text-ink truncate">
                {step.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-1 text-ink-soft hover:text-ink transition-colors -mt-1 -mr-1"
            aria-label="Dismiss tour"
          >
            <IconClose width={14} height={14} />
          </button>
        </div>

        <div className="px-4 pb-4">
          <p className="text-[12.5px] text-ink-muted leading-[1.55]">
            {step.body}
          </p>
        </div>

        <div className="h-[2px] bg-canvas-soft" aria-hidden="true">
          <div
            className="h-full bg-ink transition-[width] duration-300"
            style={{
              width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>

        <div className="px-4 py-3 flex items-center justify-between gap-2 border-t border-rule">
          <button
            type="button"
            onClick={dismiss}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step.href && (
              <Link
                href={href(step.href)}
                onClick={() => {
                  // mark as dismissed when the user actually goes somewhere
                  try {
                    window.localStorage.setItem(DISMISS_KEY, "1");
                  } catch {
                    /* ignore */
                  }
                }}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
              >
                Open
              </Link>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
            >
              {isLast ? "Finish" : "Next"}
              <IconArrowRight width={12} height={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
