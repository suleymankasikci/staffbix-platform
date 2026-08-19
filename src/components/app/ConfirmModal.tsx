"use client";

import { useEffect, useId } from "react";
import { IconClose } from "@/components/Icons";
import { useLocale } from "@/lib/i18n/client";
import { getCommonCopy } from "@/lib/i18n/translations";

export type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "default",
}: ConfirmModalProps) {
  const labelId = useId();
  const locale = useLocale();
  const copy = getCommonCopy(locale);
  const resolvedConfirmLabel = confirmLabel ?? copy.labels.Confirm;
  const resolvedCancelLabel = cancelLabel ?? copy.labels.Cancel;
  const closeLabel = copy.labels.Close;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const confirmStyle =
    tone === "danger"
      ? "bg-[#B91C1C] hover:bg-[#991B1B] text-white"
      : "bg-ink hover:bg-ink/85 text-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
      />

      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[440px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] animate-[slideUp_0.18s_cubic-bezier(0.16,1,0.3,1)]">
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <h2
            id={labelId}
            className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-[1.3]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex items-center justify-center size-7 -mr-1 -mt-1 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
          >
            <IconClose />
          </button>
        </header>

        <div className="px-6 pb-6 text-[13.5px] text-ink-muted leading-[1.65]">
          {body}
        </div>

        <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full transition-colors ${confirmStyle}`}
          >
            {resolvedConfirmLabel}
          </button>
        </footer>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
