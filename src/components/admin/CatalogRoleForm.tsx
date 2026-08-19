"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, SectionTitle } from "@/components/app/PageShell";
import { IconCheck } from "@/components/Icons";
import { CATEGORIES, type Role } from "@/lib/roles";

const STATUS_OPTIONS = ["available", "q3"] as const;

const ALL_CHANNELS = [
  "Web", "WhatsApp", "Telegram", "Email", "Phone", "IG", "X", "FB", "LinkedIn",
  "TikTok", "YouTube", "Pinterest", "WordPress", "Shopify", "Stripe", "Bank",
  "CMS", "Calendar", "Slack", "Internal", "Amazon", "eBay", "Etsy", "Meta",
  "Google", "Discord", "Docs", "Zoom",
];

export function CatalogRoleForm({
  mode,
  initial,
  cancelHref,
}: {
  mode: "create" | "edit";
  initial?: Role;
  cancelHref: string;
}) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Customer-facing");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [channels, setChannels] = useState<string[]>(initial?.channels ?? []);
  const [status, setStatus] = useState<"available" | "q3">(initial?.status ?? "available");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  function toggleChannel(c: string) {
    setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const trimmedSlug = slug.trim().toLowerCase();
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(trimmedSlug)) {
      setSubmitError("Slug must be 2-63 lowercase chars/digits/hyphens.");
      return;
    }
    if (trimmedTitle.length < 2 || trimmedTitle.length > 120) {
      setSubmitError("Title must be 2-120 chars.");
      return;
    }
    if (trimmedSummary.length < 10 || trimmedSummary.length > 400) {
      setSubmitError("Summary must be 10-400 chars.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint =
        mode === "create"
          ? "/api/admin/catalog-roles"
          : `/api/admin/catalog-roles/${encodeURIComponent(initial?.slug ?? trimmedSlug)}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? {
              slug: trimmedSlug,
              title: trimmedTitle,
              category,
              summary: trimmedSummary,
              channels,
              status,
            }
          : {
              title: trimmedTitle,
              category,
              summary: trimmedSummary,
              channels,
              status,
            };

      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || (mode === "create" && !json.ok)) {
        setSubmitError(json.error ?? `Save failed (HTTP ${res.status}).`);
        setSubmitting(false);
        return;
      }
      router.push(cancelHref);
      router.refresh();
    } catch {
      setSubmitError("Network error while saving.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Card>
        <SectionTitle label="Identity" description="What customers see in the hire catalog." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Role title" value={title} onChange={setTitle} />
          <Field label="Slug (URL-safe)" value={slug} onChange={setSlug} hint="Lowercase, hyphens only" />
        </div>
        <div className="mt-5">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Summary (one sentence)</span>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
            />
          </label>
        </div>
      </Card>

      <Card>
        <SectionTitle label="Category" description="Used for filtering in the catalog UI." />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.filter((c) => c !== "All").map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`inline-flex items-center text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                category === c
                  ? "bg-ink text-white border-ink"
                  : "bg-card text-ink-muted border-rule hover:border-ink/25 hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle label="Channels" description="Which channels this role operates on by default." />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {ALL_CHANNELS.map((c) => {
            const on = channels.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChannel(c)}
                className={`flex items-center justify-between gap-1.5 text-left text-[12px] font-medium px-2.5 py-2 rounded-md border transition-colors ${
                  on ? "border-ink bg-ink text-white" : "border-rule bg-card text-ink-muted hover:border-ink/25 hover:text-ink"
                }`}
              >
                {c}
                {on && <IconCheck width={11} height={11} />}
              </button>
            );
          })}
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {channels.length} selected
        </p>
      </Card>

      <Card>
        <SectionTitle label="Availability" />
        <div className="flex flex-col gap-2 max-w-[420px]">
          {STATUS_OPTIONS.map((s) => (
            <label
              key={s}
              className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                status === s ? "border-ink bg-canvas-soft" : "border-rule hover:border-ink/25"
              }`}
            >
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">
                  {s === "available" ? "Available now" : "Coming Q3 2026"}
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  {s === "available"
                    ? "Tenants can hire this role today."
                    : "Roadmap placeholder. Tenants see a 'Notify me' card instead of the hire form."}
                </p>
              </div>
              <input
                type="radio"
                checked={status === s}
                onChange={() => setStatus(s)}
                className="sr-only"
                name="role-status"
              />
              <span className={`mt-1 size-3.5 rounded-full border-2 ${status === s ? "border-ink bg-ink" : "border-rule"}`} />
            </label>
          ))}
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-5 md:-mx-7 lg:-mx-10 -mb-8 md:-mb-10 px-5 md:px-7 lg:px-10 py-4 border-t border-rule bg-canvas/95 backdrop-blur-md mt-2">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {mode === "create"
              ? "Role goes live to all tenants on save"
              : "Changes propagate within 60 seconds to all tenants"}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={cancelHref}
              className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-60"
            >
              <IconCheck width={13} height={13} />
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Create role"
                  : "Save changes"}
            </button>
          </div>
        </div>
        {submitError && (
          <p
            role="alert"
            className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#B91C1C]"
          >
            {submitError}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
      />
      {hint && <span className="text-[11.5px] text-ink-soft">{hint}</span>}
    </label>
  );
}
