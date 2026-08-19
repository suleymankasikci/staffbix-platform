"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PasswordField } from "@/components/PasswordField";
import { useLocale } from "@/lib/i18n/client";
import { getAcceptInvitationCopy } from "@/lib/i18n/page-copy";
import { localizePath } from "@/lib/i18n/routing";

interface InvitationSummary {
  tenant: { name: string; slug: string };
  invitation: { email: string; role: string; expiresAt: string };
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const locale = useLocale();
  const copy = getAcceptInvitationCopy(locale);
  const token = typeof params?.token === "string" ? params.token : "";

  const [meta, setMeta] = useState<InvitationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadError(copy.errors.invalidLink);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`);
        const data = (await res.json().catch(() => ({}))) as {
          tenant?: InvitationSummary["tenant"];
          invitation?: InvitationSummary["invitation"];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.tenant || !data.invitation) {
          setLoadError(data.error ?? copy.errors.invitationInvalid);
          return;
        }
        setMeta({ tenant: data.tenant, invitation: data.invitation });
      } catch {
        if (!cancelled) setLoadError(copy.errors.networkLoad);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, copy.errors.invalidLink, copy.errors.invitationInvalid, copy.errors.networkLoad]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!name.trim()) {
      setSubmitError(copy.errors.missingName);
      return;
    }
    if (password.length < 12) {
      setSubmitError(copy.errors.passwordTooShort);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setSubmitError(data.error ?? copy.errors.submitFailed);
        return;
      }
      router.push(localizePath("/app/dashboard", locale));
    } catch {
      setSubmitError(copy.errors.network);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col px-6 md:px-10">
      <header className="py-7 md:py-9 flex items-center justify-between">
        <BrandLogo />
        <Link
          href={localizePath("/login", locale)}
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors"
        >
          {copy.alreadyHaveAccount} <span className="text-ink">{copy.signIn}</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-[440px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-5">
            {copy.eyebrow}
          </p>

          {loading && <p className="text-[14px] text-ink-muted">{copy.checking}</p>}

          {!loading && loadError && (
            <div className="text-[13.5px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-4 py-3">
              {loadError}
            </div>
          )}

          {!loading && meta && (
            <>
              <h1 className="text-[clamp(28px,3.6vw,36px)] font-medium tracking-[-0.025em] leading-[1.1] text-ink mb-3">
                {copy.joinTitlePrefix} {meta.tenant.name}.
              </h1>
              <p className="text-[14px] text-ink-muted leading-[1.6] mb-10">
                {copy.joinDescriptionPrefix} <span className="text-ink">{meta.tenant.name}</span> {copy.joinDescriptionAs}{" "}
                <span className="text-ink">{meta.invitation.role}</span>. {copy.joinDescriptionSuffix}
              </p>

              <form onSubmit={submit} className="flex flex-col gap-6">
                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                    {copy.yourName}
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                    className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
                    placeholder={copy.yourNamePlaceholder}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                    {copy.email}
                  </span>
                  <input
                    type="email"
                    value={meta.invitation.email}
                    readOnly
                    className="bg-transparent text-[14px] text-ink-muted py-2 border-0 border-b border-rule"
                  />
                </label>

                <PasswordField
                  label={copy.passwordLabel}
                  name="password"
                  placeholder={copy.passwordPlaceholder}
                  autoComplete="new-password"
                  required
                  hint={copy.passwordHint}
                />

                {submitError && (
                  <p
                    role="alert"
                    className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2"
                  >
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-3 inline-flex items-center justify-center text-[13.5px] font-medium px-5 py-3 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? copy.submitting : `${copy.submitPrefix} ${meta.tenant.name}`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <footer className="py-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft border-t border-rule">
        <Link href={localizePath("/", locale)} className="hover:text-ink transition-colors">
          {copy.backHome}
        </Link>
        <span>{copy.version}</span>
      </footer>
    </main>
  );
}
