"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageShell, Card, SectionTitle } from "@/components/app/PageShell";
import { SettingsNav } from "@/components/app/SettingsNav";
import { useLocale } from "@/lib/i18n/client";
import { getAppSettingsProfileCopy } from "@/lib/i18n/page-copy";

export default function ProfileSettingsPage() {
  const locale = useLocale();
  const copy = getAppSettingsProfileCopy(locale);

  // The DB stores `users.name` as a single field; the UI splits it into
  // first + last. We rejoin on submit. Phone / title / company are
  // display-only in MVP (no schema columns yet — Sprint 12 adds an
  // extended-profile table).
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>(copy.defaults.phone);
  const [title, setTitle] = useState<string>(copy.defaults.title);
  const [company, setCompany] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError("Couldn't load your profile.");
          return;
        }
        const data = (await res.json()) as {
          user: { name: string; email: string };
          tenant: { name: string };
        };
        if (cancelled) return;
        const parts = data.user.name.trim().split(/\s+/);
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
        setEmail(data.user.email);
        setCompany(data.tenant.name);
      } catch {
        if (!cancelled) setError("Network problem while loading your profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedOk(false);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      setSavedOk(true);
    } catch {
      setError("Network problem. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell title={copy.title} description={copy.description}>
      <SettingsNav />

      <form onSubmit={submit} className="flex flex-col gap-5 max-w-[840px]">
        <Card>
          <SectionTitle
            label={copy.personal.title}
            description={copy.personal.description}
          />
          <div className="flex items-center gap-5 mb-6">
            <span className="size-14 rounded-full bg-ink text-white flex items-center justify-center font-mono text-[14px] font-medium">
              {copy.personal.initials}
            </span>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="text-[12px] font-medium px-3 py-1.5 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
              >
                {copy.personal.uploadPhoto}
              </button>
              <button
                type="button"
                className="text-[12px] font-medium text-ink-muted hover:text-ink transition-colors text-left"
              >
                {copy.personal.remove}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={copy.personal.firstName} value={firstName} onChange={setFirstName} />
            <Field label={copy.personal.surname} value={lastName} onChange={setLastName} />
            <Field label={copy.personal.email} value={email} onChange={setEmail} type="email" />
            <Field label={copy.personal.phone} value={phone} onChange={setPhone} />
            <Field label={copy.personal.jobTitle} value={title} onChange={setTitle} />
            <Field label={copy.personal.companyName} value={company} onChange={setCompany} />
          </div>
        </Card>

        <Card>
          <SectionTitle
            label={copy.workspace.title}
            description={copy.workspace.description}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={copy.workspace.name} value={copy.defaults.workspaceName} readOnly />
            <Field label={copy.workspace.id} value={copy.defaults.workspaceId} readOnly />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3 sticky bottom-0 -mx-5 md:-mx-7 lg:-mx-10 px-5 md:px-7 lg:px-10 py-4 border-t border-rule bg-canvas/95 backdrop-blur-md">
          {error && (
            <span
              role="alert"
              className="text-[12.5px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-1.5 mr-auto"
            >
              {error}
            </span>
          )}
          {savedOk && (
            <span className="text-[12.5px] text-[#15803D] bg-[#DCFCE7] border border-[#15803D]/25 rounded-md px-3 py-1.5 mr-auto">
              {copy.alert}
            </span>
          )}
          <button
            type="button"
            disabled={submitting}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 disabled:opacity-60 transition-colors"
          >
            {copy.actions.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving..." : copy.actions.save}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors read-only:text-ink-muted"
      />
    </label>
  );
}
