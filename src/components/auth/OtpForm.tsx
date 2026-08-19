"use client";

import {
  useRef,
  useState,
  useEffect,
  type FormEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

interface Copy {
  submit: string;
  back: string;
  resend: string;
  resendSentNote: string;
  errors: {
    missingDigits: string;
    incorrectCode: string;
    network: string;
    resendFailed: string;
    verifying: string;
    sending: string;
  };
}

/**
 * Six-input OTP form with paste-to-fill + arrow-key navigation. On
 * submit, posts the joined code to /api/auth/otp/verify and follows the
 * server's redirect.
 */
export function OtpForm({
  copy,
  scope = "app",
  onBack,
}: {
  copy: Copy;
  scope?: "app" | "admin";
  onBack?: () => void;
}) {
  const router = useRouter();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, "").slice(0, 1);
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    if (v && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      inputs.current[i + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const arr = Array(6).fill("");
    for (let i = 0; i < text.length; i++) arr[i] = text[i];
    setDigits(arr);
    inputs.current[Math.min(text.length, 5)]?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const code = digits.join("");
    if (code.length !== 6) {
      setError(copy.errors.missingDigits);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, scope }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        redirect?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? copy.errors.incorrectCode);
        setDigits(Array(6).fill(""));
        inputs.current[0]?.focus();
        return;
      }
      router.push(data.redirect ?? (scope === "admin" ? "/admin" : "/"));
    } catch {
      setError(copy.errors.network);
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    setError(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? copy.errors.resendFailed);
        return;
      }
      setResentAt(Date.now());
    } catch {
      setError(copy.errors.network);
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex gap-2 sm:gap-3" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className="w-full aspect-square text-center font-mono text-[20px] text-ink bg-card border border-rule rounded-md focus:border-ink focus:outline-none transition-colors"
          />
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2"
        >
          {error}
        </p>
      )}

      {resentAt && (
        <p className="text-[12.5px] text-ink-muted">
          {copy.resendSentNote}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? copy.errors.verifying : copy.submit}
      </button>

      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        {onBack ? (
          <button type="button" onClick={onBack} className="hover:text-ink transition-colors">
            {copy.back}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="hover:text-ink transition-colors disabled:opacity-60"
        >
          {resending ? copy.errors.sending : copy.resend}
        </button>
      </div>
    </form>
  );
}
