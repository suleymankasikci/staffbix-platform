"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  PasswordField,
  evaluatePasswordStrength,
} from "@/components/PasswordField";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

interface Copy {
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  company: string;
  companyPlaceholder: string;
  workEmail: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  passwordHint: string;
  passwordStrength: {
    tooShort: string;
    tooLong: string;
    valid: string;
    progress?: string;
  };
  showPassword: string;
  hidePassword: string;
  submit: string;
  errors: {
    missingFields: string;
    signupFailed: string;
    network: string;
    submitting: string;
  };
}

/**
 * Client-side signup form. POSTs to /api/auth/register, then routes to
 * /verify on success. On failure surfaces a single error string from
 * the API (server is the source of truth for the message).
 */
export function SignupForm({ copy, locale }: { copy: Copy; locale: Locale }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Controlled so the strength meter under the field reflects every
  // keystroke without needing to round-trip via the DOM.
  const [password, setPassword] = useState("");
  const passwordOk = evaluatePasswordStrength(password) === "ok";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    if (!firstName || !lastName || !company || !email || !password) {
      setError(copy.errors.missingFields);
      return;
    }
    if (!passwordOk) {
      setError(copy.passwordStrength.tooShort);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: `${firstName} ${lastName}`,
          companyName: company,
          locale,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        nextStep?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? copy.errors.signupFailed);
        return;
      }
      router.push(localizePath("/verify", locale));
    } catch {
      setError(copy.errors.network);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label={copy.firstName}
          type="text"
          name="firstName"
          placeholder={copy.firstNamePlaceholder}
          autoComplete="given-name"
          required
        />
        <Field
          label={copy.lastName}
          type="text"
          name="lastName"
          placeholder={copy.lastNamePlaceholder}
          autoComplete="family-name"
          required
        />
      </div>

      <Field
        label={copy.company}
        type="text"
        name="company"
        placeholder={copy.companyPlaceholder}
        autoComplete="organization"
        required
      />
      <Field
        label={copy.workEmail}
        type="email"
        name="email"
        placeholder={copy.emailPlaceholder}
        autoComplete="email"
        required
      />
      <PasswordField
        label={copy.password}
        name="password"
        placeholder={copy.passwordPlaceholder}
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={copy.passwordHint}
        showPasswordLabel={copy.showPassword}
        hidePasswordLabel={copy.hidePassword}
        showStrength
        strengthLabels={copy.passwordStrength}
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

function Field({
  label,
  type,
  name,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
      />
    </label>
  );
}
