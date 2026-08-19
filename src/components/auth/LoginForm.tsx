"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

interface Copy {
  workEmail: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  errors: {
    missingFields: string;
    signInFailed: string;
    network: string;
    submitting: string;
  };
}

export function LoginForm({
  copy,
  locale,
  scope = "app",
}: {
  copy: Copy;
  locale: Locale;
  scope?: "app" | "admin";
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError(copy.errors.missingFields);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, scope }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? copy.errors.signInFailed);
        return;
      }
      const next = scope === "admin" ? "/admin/verify" : localizePath("/verify", locale);
      router.push(next);
    } catch {
      setError(copy.errors.network);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {copy.workEmail}
        </span>
        <input
          type="email"
          name="email"
          placeholder={copy.emailPlaceholder}
          autoComplete="email"
          required
          className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
        />
      </label>

      <PasswordField
        label={copy.password}
        name="password"
        placeholder={copy.passwordPlaceholder}
        autoComplete="current-password"
        required
        showPasswordLabel={copy.showPassword}
        hidePasswordLabel={copy.hidePassword}
      />

      {error && (
        <p
          role="alert"
          className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? copy.errors.submitting : copy.submit}
      </button>
    </form>
  );
}
