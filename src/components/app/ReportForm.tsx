"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, SectionTitle } from "@/components/app/PageShell";
import { IconCheck, IconClose, IconPlus } from "@/components/Icons";
import {
  REPORT_SECTIONS,
  REPORT_TEMPLATES,
  type DeliveryChannel,
  type Report,
  type ReportCadence,
  type ReportTemplate,
} from "@/lib/reports-data";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getReportFormCopy } from "@/lib/i18n/page-copy";

/**
 * Maps the UI template (presentational concept) onto the persisted
 * report `kind` enum that the backend recognizes. The form's richer
 * concepts (sections, channels, cadenceTime, recipients) ride along in
 * `config` so we don't lose them — the audit ledger and the run worker
 * both honor the JSON.
 */
function templateToKind(slug: string): string {
  switch (slug) {
    case "spend-audit":
      return "ai_spend_daily";
    case "approvals-retro":
      return "approvals_throughput";
    default:
      return "workforce_volume";
  }
}

export type ReportFormProps = {
  mode: "create" | "edit";
  initial?: Report;
  initialTemplateSlug?: string;
  cancelHref: string;
};

export function ReportForm({
  mode,
  initial,
  initialTemplateSlug,
  cancelHref,
}: ReportFormProps) {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getReportFormCopy(locale);
  const cadences = [...copy.cadence.values] as ReportCadence[];
  const allChannels = [...copy.delivery.channels] as DeliveryChannel[];
  const startingTemplate =
    REPORT_TEMPLATES.find(
      (t) => t.slug === (initial?.templateSlug ?? initialTemplateSlug)
    ) ?? REPORT_TEMPLATES[0];

  const [template, setTemplate] = useState<ReportTemplate>(startingTemplate);
  const [name, setName] = useState(initial?.name ?? startingTemplate.name);
  const [description, setDescription] = useState(
    initial?.description ?? startingTemplate.description
  );
  const [cadence, setCadence] = useState<ReportCadence>(
    initial?.cadence ?? startingTemplate.cadence
  );
  const [cadenceTime, setCadenceTime] = useState<string>(
    initial?.cadenceTime ?? startingTemplate.cadenceTime ?? copy.basics.fallbackTime
  );
  const [sections, setSections] = useState<string[]>(
    initial?.sections ?? [...startingTemplate.sections]
  );
  const [channels, setChannels] = useState<DeliveryChannel[]>(
    initial?.channels ?? [...startingTemplate.channels]
  );
  const [recipients, setRecipients] = useState<string[]>(
    initial
      ? initial.recipients.map((r) => r.email)
      : [copy.recipients.defaultEmail]
  );
  const [newRecipient, setNewRecipient] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  function applyTemplate(slug: string) {
    const t = REPORT_TEMPLATES.find((x) => x.slug === slug);
    if (!t) return;
    setTemplate(t);
    if (t.slug !== "custom") {
      setName(t.name);
      setDescription(t.description);
      setCadence(t.cadence);
      setCadenceTime(t.cadenceTime || copy.basics.fallbackTime);
      setSections([...t.sections]);
      setChannels([...t.channels]);
    }
  }

  function toggleSection(s: string) {
    setSections((ss) => (ss.includes(s) ? ss.filter((x) => x !== s) : [...ss, s]));
  }

  function toggleChannel(c: DeliveryChannel) {
    setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  }

  function addRecipient(e: FormEvent) {
    e.preventDefault();
    const trimmed = newRecipient.trim();
    if (!trimmed) return;
    if (!trimmed.includes("@")) return;
    if (recipients.includes(trimmed)) return;
    setRecipients((rs) => [...rs, trimmed]);
    setNewRecipient("");
  }

  function removeRecipient(email: string) {
    setRecipients((rs) => rs.filter((r) => r !== email));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError(copy.basics.name + " required.");
      return;
    }
    if (recipients.length === 0) {
      setSubmitError("Add at least one recipient.");
      return;
    }
    if (sections.length === 0) {
      setSubmitError("Choose at least one section.");
      return;
    }
    if (channels.length === 0) {
      setSubmitError("Choose at least one delivery channel.");
      return;
    }

    setSubmitting(true);
    const config = {
      templateSlug: template.slug,
      description,
      cadence,
      cadenceTime,
      sections,
      channels,
      recipients,
    };
    const schedule = cadence === "On demand" ? null : `${cadence}@${cadenceTime}`;

    try {
      const endpoint =
        mode === "create" ? "/api/reports" : `/api/reports/${initial?.id ?? ""}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          kind: templateToKind(template.slug),
          config,
          schedule,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };
      if (!res.ok || (mode === "create" && !json.ok)) {
        setSubmitError(json.error ?? `Save failed (HTTP ${res.status}).`);
        setSubmitting(false);
        return;
      }
      // Route back to the reports list. The list page re-fetches.
      router.push(href(cancelHref));
      router.refresh();
    } catch {
      setSubmitError("Network error while saving.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Templates */}
      {mode === "create" && (
        <Card>
          <SectionTitle
            label={copy.template.title}
            description={copy.template.description}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {REPORT_TEMPLATES.map((t) => {
              const active = template.slug === t.slug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => applyTemplate(t.slug)}
                  className={`text-left p-4 rounded-md border transition-colors ${
                    active
                      ? "border-ink bg-canvas-soft"
                      : "border-rule bg-card hover:border-ink/25 hover:bg-canvas-soft/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="text-[13px] font-medium text-ink leading-tight">
                      {t.name}
                    </p>
                    {active && (
                      <IconCheck
                        className="text-accent shrink-0 mt-0.5"
                        width={13}
                        height={13}
                      />
                    )}
                  </div>
                  <p className="text-[11.5px] text-ink-muted leading-[1.55] mb-3">
                    {t.description}
                  </p>
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    <span>{t.cadence}</span>
                    {t.sections.length > 0 && (
                      <>
                        <span className="text-ink-soft/60">·</span>
                        <span>
                          {t.sections.length} {copy.template.sections}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Basics */}
      <Card>
        <SectionTitle label={copy.basics.title} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label={copy.basics.name} value={name} onChange={setName} />
          <SelectField
            label={copy.basics.cadence}
            value={cadence}
            onChange={(v) => setCadence(v as ReportCadence)}
            options={cadences.map((c) => ({ label: copy.cadence.labels[c], value: c }))}
          />
        </div>
        <div className="mt-5">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              {copy.basics.description}
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
            />
          </label>
        </div>
        {cadence !== "On demand" && (
          <div className="mt-5">
            <Field
              label={cadence === "Daily" ? copy.basics.sendAt : copy.basics.sendOn}
              value={cadenceTime}
              onChange={setCadenceTime}
              hint={
                cadence === "Daily"
                  ? copy.basics.dailyHint
                  : cadence === "Weekly"
                  ? copy.basics.weeklyHint
                  : cadence === "Monthly"
                  ? copy.basics.monthlyHint
                  : copy.basics.quarterlyHint
              }
            />
          </div>
        )}
      </Card>

      {/* Content sections */}
      <Card>
        <SectionTitle
          label={copy.content.title}
          description={copy.content.description}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {REPORT_SECTIONS.map((s) => {
            const on = sections.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSection(s)}
                className={`flex items-center justify-between gap-2 text-left px-3 py-2 rounded-md border text-[12.5px] font-medium transition-colors ${
                  on
                    ? "border-ink bg-ink text-white"
                    : "border-rule bg-card text-ink-muted hover:border-ink/25 hover:text-ink"
                }`}
              >
                {s}
                {on && <IconCheck width={12} height={12} />}
              </button>
            );
          })}
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {sections.length} {copy.content.of} {REPORT_SECTIONS.length}{" "}
          {copy.content.sectionsSelected}
        </p>
      </Card>

      {/* Recipients */}
      <Card>
        <SectionTitle
          label={copy.recipients.title}
          description={copy.recipients.description}
        />
        <ul className="flex flex-col gap-2 mb-4">
          {recipients.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-rule bg-canvas-soft/40"
            >
              <span className="text-[13px] text-ink truncate">{email}</span>
              <button
                type="button"
                onClick={() => removeRecipient(email)}
                className="inline-flex items-center justify-center size-6 rounded text-ink-soft hover:text-[#B91C1C] hover:bg-canvas-soft transition-colors"
                aria-label={`${copy.recipients.remove} ${email}`}
              >
                <IconClose width={13} height={13} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 max-w-[480px]">
          <input
            type="email"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            placeholder={copy.recipients.placeholder}
            className="flex-1 bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors placeholder:text-ink-soft"
          />
          <button
            type="button"
            onClick={(e) => addRecipient(e as unknown as FormEvent)}
            className="inline-flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-md border border-rule text-ink hover:border-ink/30 transition-colors shrink-0"
          >
            <IconPlus width={12} height={12} />
            {copy.recipients.add}
          </button>
        </div>
      </Card>

      {/* Delivery channels */}
      <Card>
        <SectionTitle
          label={copy.delivery.title}
          description={copy.delivery.description}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {allChannels.map((c) => {
            const on = channels.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChannel(c)}
                className={`text-left px-3 py-2 rounded-md border text-[12px] font-medium transition-colors ${
                  on
                    ? "border-ink bg-ink text-white"
                    : "border-rule bg-card text-ink-muted hover:border-ink/25 hover:text-ink"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-5 md:-mx-7 lg:-mx-10 -mb-8 md:-mb-10 px-5 md:px-7 lg:px-10 py-4 border-t border-rule bg-canvas/95 backdrop-blur-md mt-2">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {mode === "create"
              ? copy.saveBar.createNotice
              : copy.saveBar.editNotice}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={href(cancelHref)}
              className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
            >
              {copy.saveBar.cancel}
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-60"
            >
              {mode === "create" ? (
                <>
                  <IconCheck width={13} height={13} />
                  {copy.saveBar.create}
                </>
              ) : (
                copy.saveBar.save
              )}
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
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
      />
      {hint && (
        <span className="text-[11.5px] text-ink-soft leading-[1.5]">
          {hint}
        </span>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full bg-transparent text-[14px] text-ink py-2 pr-8 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none"
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
      </div>
    </label>
  );
}
