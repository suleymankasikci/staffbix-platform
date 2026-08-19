"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES } from "@/lib/brand";
import { rememberLocalePreference, useLocale } from "@/lib/i18n/client";
import { canonicalizePath, localizePath } from "@/lib/i18n/routing";
import { getCommonCopy } from "@/lib/i18n/translations";

/**
 * `placement`: which way the dropdown panel opens. Default "up" matches
 * the original footer placement; "down" is what the header uses so the
 * panel doesn't get clipped above the viewport.
 *
 * `variant`: "full" shows flag + shortCode + label (the footer style);
 * "compact" drops the label so the trigger stays narrow enough to live
 * next to the hamburger on mobile. Both variants share the same
 * dropdown panel — the trigger is the only thing that changes.
 */
export function LanguagePicker({
  placement = "up",
  variant = "full",
  className = "",
}: {
  placement?: "up" | "down";
  variant?: "full" | "compact";
  className?: string;
} = {}) {
  const locale = useLocale();
  const pathname = usePathname();
  const copy = getCommonCopy(locale);
  const [open, setOpen] = useState(false);
  const selected =
    LANGUAGES.find((language) => language.locale === locale) ?? LANGUAGES[0];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canonicalPath = canonicalizePath(pathname, locale);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panelPositionClass =
    placement === "down"
      ? "top-full mt-2 right-0"
      : "bottom-full mb-2 left-0";

  return (
    <div ref={wrapRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 border border-rule rounded-md hover:border-ink/25 transition-colors ${
          variant === "compact" ? "pl-2 pr-1.5 py-1.5" : "pl-2.5 pr-2 py-1.5"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={copy.labels["Change language"]}
      >
        <span className="text-[14px] leading-none" aria-hidden>
          {selected.flag}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
          {selected.shortCode}
        </span>
        {variant === "full" && (
          <>
            <span className="text-ink-soft">·</span>
            <span className="text-[12px] text-ink-muted max-w-[100px] truncate">
              {selected.label}
            </span>
          </>
        )}
        <svg
          aria-hidden
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-ink-soft transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={copy.labels["Select language"]}
          className={`absolute ${panelPositionClass} w-[280px] max-w-[calc(100vw-2rem)] bg-card border border-rule rounded-[10px] shadow-[0_1px_0_rgba(0,0,0,0.02),0_16px_40px_-12px_rgba(15,23,42,0.16)] overflow-hidden z-50`}
        >
          <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              {copy.labels.Language}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
              {LANGUAGES.length} {copy.labels.available}
            </span>
          </div>
          <ul className="max-h-[280px] overflow-y-auto py-1">
            {LANGUAGES.map((l) => {
              const isSelected = selected.locale === l.locale;
              return (
                <li key={l.code}>
                  <Link
                    href={localizePath(canonicalPath, l.locale)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      rememberLocalePreference(l.locale);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isSelected ? "bg-canvas-soft" : "hover:bg-canvas-soft"
                    }`}
                  >
                    <span className="text-[15px] leading-none w-5" aria-hidden>
                      {l.flag}
                    </span>
                    <span className="text-[13px] text-ink flex-1 truncate">
                      {l.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                      {l.shortCode}
                    </span>
                    {isSelected && (
                      <svg
                        aria-hidden
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className="text-accent"
                      >
                        <path
                          d="M2.5 6.5l2.5 2.5 4.5-5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
