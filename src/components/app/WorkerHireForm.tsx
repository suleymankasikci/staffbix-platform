"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, SectionTitle } from "@/components/app/PageShell";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { IconCheck, IconTrash } from "@/components/Icons";
import {
  APPROVAL_MODES,
  SCHEDULES,
  type HiredWorker,
} from "@/lib/hired-workers";
import { LANGUAGES } from "@/lib/brand";
import {
  type RoleHireConfig,
  type RoleSpecificField,
} from "@/lib/role-configs";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { getWorkerHireFormCopy } from "@/lib/i18n/page-copy";

export type WorkerHireFormProps = {
  config: RoleHireConfig;
  roleTitle: string;
  mode: "create" | "edit";
  initial?: HiredWorker;
  cancelHref: string;
  onTerminate?: () => void;
};

export function WorkerHireForm({
  config,
  roleTitle,
  mode,
  initial,
  cancelHref,
  onTerminate,
}: WorkerHireFormProps) {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getWorkerHireFormCopy(locale);
  // Identity
  const [name, setName] = useState(initial?.name ?? config.defaultName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Languages
  const [languages, setLanguages] = useState<string[]>(
    initial?.languages ?? ["EN"]
  );

  // Custom prompt
  const [instructions, setInstructions] = useState("");

  // Channels
  const [channels, setChannels] = useState<string[]>(
    initial?.channels ?? config.defaultChannels
  );

  // Schedule + Approval
  const [schedule, setSchedule] = useState<string>(
    initial?.schedule ?? config.defaultSchedule
  );
  const [approvalMode, setApprovalMode] = useState<HiredWorker["approvalMode"]>(
    initial?.approvalMode ?? config.defaultApprovalMode
  );

  // Spending caps (only used when config.showSpendingLimits is true)
  const [dailyCap, setDailyCap] = useState(
    String(config.spendingDefaults?.daily ?? 200)
  );
  const [monthlyCap, setMonthlyCap] = useState(
    String(config.spendingDefaults?.monthly ?? 5000)
  );

  // Restricted topics
  const [restrictedTopics, setRestrictedTopics] = useState("");

  // Role-specific dynamic state
  const [specifics, setSpecifics] = useState<Record<string, unknown>>(() => {
    const s: Record<string, unknown> = {};
    for (const f of config.specifics) {
      if (f.kind === "number") s[f.key] = f.default;
      else if (f.kind === "select") s[f.key] = f.default;
      else if (f.kind === "multiSelect") s[f.key] = f.default;
      else if (f.kind === "textarea") s[f.key] = "";
      else if (f.kind === "toggle") s[f.key] = f.default;
    }
    return s;
  });

  // Terminate confirm (edit only)
  const [terminateOpen, setTerminateOpen] = useState(false);

  function toggleChannel(c: string) {
    setChannels((cs) =>
      cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]
    );
  }

  function toggleLanguage(code: string) {
    setLanguages((ls) =>
      ls.includes(code) ? ls.filter((l) => l !== code) : [...ls, code]
    );
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function appendExample(example: string) {
    setInstructions((prev) =>
      prev ? `${prev}\n${example}` : example
    );
  }

  function updateSpecific(key: string, value: unknown) {
    setSpecifics((s) => ({ ...s, [key]: value }));
  }

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Map UI's approvalMode → DB autonomy enum.
    const autonomy: "auto" | "approve" | "suggest" =
      approvalMode === "Automatic"
        ? "auto"
        : approvalMode === "Suggestion only"
          ? "suggest"
          : "approve";

    // Compose settings JSON from everything that isn't a top-level column.
    const settings: Record<string, unknown> = {
      schedule,
      languages,
      restricted_topics: restrictedTopics
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
      ...(config.showSpendingLimits
        ? { spending_limits: { daily_usd: Number(dailyCap), monthly_usd: Number(monthlyCap) } }
        : {}),
      ...specifics,
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/workers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            roleSlug: config.slug,
            name,
            customInstructions: instructions || undefined,
            channels,
            autonomy,
            settings,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          worker?: { id: string };
          error?: string;
        };
        if (!res.ok || !data.ok || !data.worker) {
          setSubmitError(data.error ?? "Hire failed. Please try again.");
          return;
        }
        window.location.assign(href(`/app/workforce/${data.worker.id}`));
      } else if (initial) {
        const res = await fetch(`/api/workers/${initial.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            customInstructions: instructions || null,
            channels,
            autonomy,
            settings,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          setSubmitError(data.error ?? "Update failed. Please try again.");
          return;
        }
        window.location.assign(href(`/app/workforce/${initial.id}`));
      }
    } catch {
      setSubmitError("Network problem. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || copy.initialsFallback;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Identity + Avatar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <SectionTitle
            label={copy.identity.title}
            description={copy.identity.description}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label={copy.identity.displayName}
              value={name}
              onChange={setName}
              hint={copy.identity.hint}
            />
            <Field label={copy.identity.role} value={roleTitle} readOnly />
          </div>

          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3">
              {copy.language.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((l) => {
                const active = languages.includes(l.code);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => toggleLanguage(l.code)}
                    className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-ink text-white border-ink"
                        : "bg-card text-ink-muted border-rule hover:border-ink/25 hover:text-ink"
                    }`}
                  >
                    <span className="text-[12px] leading-none" aria-hidden>
                      {l.flag}
                    </span>
                    {l.code}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              {languages.length} {copy.language.selected} {copy.separator}{" "}
              {copy.language.defaultReply}
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle
            label={copy.avatar.title}
            description={copy.avatar.description}
          />
          <div className="flex items-center gap-4 mb-4">
            <div className="size-16 rounded-full border border-rule overflow-hidden flex items-center justify-center bg-tint/40 shrink-0">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="font-mono text-[16px] font-medium text-ink">
                  {initials}
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="self-start text-[12px] font-medium px-3 py-1.5 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
              >
                {copy.avatar.upload}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFile}
                className="sr-only"
              />
              <button
                type="button"
                className="self-start text-[12px] font-medium text-ink-muted hover:text-ink transition-colors"
              >
                {copy.avatar.library} →
              </button>
              <button
                type="button"
                className="self-start text-[12px] font-medium text-ink-muted hover:text-ink transition-colors"
              >
                {copy.avatar.generate} →
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="self-start text-[12px] font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
                >
                  {copy.avatar.remove}
                </button>
              )}
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft leading-relaxed">
            {copy.avatar.requirements}
          </p>
        </Card>
      </div>

      {/* Custom instructions (prompt) */}
      <Card>
        <SectionTitle
          label={copy.instructions.title}
          description={copy.instructions.description}
        />
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          placeholder={config.promptPlaceholder}
          className="w-full bg-canvas-soft/40 text-[13.5px] text-ink py-3 px-4 border border-rule rounded-md focus:border-ink focus:outline-none transition-colors resize-y placeholder:text-ink-soft leading-[1.65] font-mono"
        />
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {instructions.length} {copy.instructions.characters}{" "}
            {copy.separator} {copy.instructions.noHardLimit}
          </span>
        </div>

        {config.taskExamples.length > 0 && (
          <div className="mt-6 pt-5 border-t border-rule">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3">
              {copy.instructions.examples}
            </p>
            <ul className="flex flex-col gap-1.5">
              {config.taskExamples.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => appendExample(ex)}
                    className="w-full text-left group flex items-start gap-2.5 px-3 py-2 rounded-md border border-rule hover:border-ink/25 hover:bg-canvas-soft transition-colors"
                  >
                    <span
                      aria-hidden
                      className="mt-[7px] block size-1 rounded-full bg-ink-soft shrink-0 group-hover:bg-accent transition-colors"
                    />
                    <span className="text-[12.5px] text-ink-muted leading-[1.6] group-hover:text-ink transition-colors flex-1">
                      {ex}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-1">
                      + {copy.instructions.add}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Role-specific dynamic fields — this is the form's main character */}
      {config.specifics.length > 0 && (
        <Card className="border-2 border-ink/90 bg-canvas-soft/30">
          <div className="mb-5 pb-5 border-b border-rule">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent mb-2 inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent" />
              {roleTitle} {copy.separator} {copy.roleSpecific.uniqueSuffix}
            </p>
            <h3 className="text-[18px] font-medium tracking-[-0.015em] text-ink leading-tight">
              {copy.roleSpecific.titlePrefix} {config.defaultName}{" "}
              {copy.roleSpecific.titleSuffix}
            </h3>
            <p className="text-[12.5px] text-ink-muted leading-[1.55] mt-1.5 max-w-[560px]">
              {copy.roleSpecific.descriptionPrefix} {roleTitle}.{" "}
              {copy.roleSpecific.descriptionSuffix}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {config.specifics.map((f) => (
              <SpecificFieldRender
                key={f.key}
                field={f}
                value={specifics[f.key]}
                onChange={(v) => updateSpecific(f.key, v)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Channels */}
      <Card>
        <SectionTitle
          label={copy.channels.title}
          description={copy.channels.description}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {config.relevantChannels.map((c) => {
            const enabled = channels.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChannel(c)}
                className={`text-left px-3 py-2 rounded-md border text-[12px] font-medium transition-colors ${
                  enabled
                    ? "border-ink bg-ink text-white"
                    : "border-rule bg-card text-ink-muted hover:border-ink/25 hover:text-ink"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {channels.length} {copy.channels.of} {config.relevantChannels.length}{" "}
          {copy.channels.selected} {copy.separator} {copy.channels.integrations}
        </p>
      </Card>

      {/* Schedule + approval */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle
            label={copy.schedule.title}
            description={copy.schedule.description}
          />
          <SelectField
            value={schedule}
            onChange={setSchedule}
            options={SCHEDULES.map((s) => ({ label: s, value: s }))}
          />
        </Card>

        <Card>
          <SectionTitle
            label={copy.approval.title}
            description={copy.approval.description}
          />
          <div className="flex flex-col gap-2">
            {APPROVAL_MODES.map((m) => (
              <label
                key={m}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                  approvalMode === m
                    ? "border-ink bg-canvas-soft"
                    : "border-rule hover:border-ink/25"
                }`}
              >
                <span className="text-[13px] text-ink">{m}</span>
                <input
                  type="radio"
                  name="approvalMode"
                  checked={approvalMode === m}
                  onChange={() => setApprovalMode(m)}
                  className="sr-only"
                />
                <span
                  className={`size-3.5 rounded-full border-2 ${
                    approvalMode === m ? "border-ink bg-ink" : "border-rule"
                  }`}
                />
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Platform spending caps — only for roles that deploy money externally */}
      {config.showSpendingLimits && (
        <Card>
          <SectionTitle
            label={copy.spending.title}
            description={copy.spending.description}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[520px]">
            <Field
              label={copy.spending.daily}
              value={dailyCap}
              onChange={setDailyCap}
              prefix="$"
            />
            <Field
              label={copy.spending.monthly}
              value={monthlyCap}
              onChange={setMonthlyCap}
              prefix="$"
            />
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {copy.spending.notice}
          </p>
        </Card>
      )}

      {/* Restricted topics (universal) */}
      <Card>
        <SectionTitle
          label={copy.restricted.title}
          description={copy.restricted.description}
        />
        <textarea
          rows={3}
          value={restrictedTopics}
          onChange={(e) => setRestrictedTopics(e.target.value)}
          className="w-full bg-transparent text-[13px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors resize-none placeholder:text-ink-soft"
          placeholder={copy.restricted.placeholder}
        />
      </Card>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-5 md:-mx-7 lg:-mx-10 -mb-8 md:-mb-10 px-5 md:px-7 lg:px-10 py-4 border-t border-rule bg-canvas/95 backdrop-blur-md mt-2">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {mode === "create"
              ? copy.actions.createNotice
              : copy.actions.editNotice}
          </p>
          <div className="flex items-center gap-2">
            {mode === "edit" && onTerminate && (
              <button
                type="button"
                onClick={() => setTerminateOpen(true)}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border border-rule text-[#B91C1C] hover:border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 transition-colors"
              >
                <IconTrash width={13} height={13} />
                {copy.actions.terminate}
              </button>
            )}
            <Link
              href={href(cancelHref)}
              className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
            >
              {copy.actions.cancel}
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                copy.actions.save
              ) : mode === "create" ? (
                <>
                  <IconCheck width={13} height={13} />
                  {copy.actions.hire} {name || roleTitle}
                </>
              ) : (
                copy.actions.save
              )}
            </button>
          </div>
        </div>
        {submitError && (
          <p
            role="alert"
            className="mt-3 text-[12.5px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2"
          >
            {submitError}
          </p>
        )}
      </div>

      {onTerminate && (
        <ConfirmModal
          open={terminateOpen}
          onClose={() => setTerminateOpen(false)}
          onConfirm={onTerminate}
          title={`${copy.terminate.titlePrefix} ${name}${copy.terminate.titleSuffix}`}
          confirmLabel={copy.terminate.confirm}
          tone="danger"
          body={
            <p>
              {name} {copy.terminate.bodySuffix}
            </p>
          }
        />
      )}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  readOnly,
  hint,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  prefix?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <div className="flex items-center border-b border-rule focus-within:border-ink transition-colors">
        {prefix && (
          <span className="text-[14px] text-ink-soft mr-2">{prefix}</span>
        )}
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          autoComplete="off"
          className="flex-1 bg-transparent text-[14px] text-ink py-2 border-0 focus:outline-none read-only:text-ink-muted"
        />
      </div>
      {hint && (
        <span className="text-[11.5px] text-ink-soft leading-[1.5]">
          {hint}
        </span>
      )}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
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
  );
}

function SpecificFieldRender({
  field,
  value,
  onChange,
}: {
  field: RoleSpecificField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.kind === "number") {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <div className="flex items-baseline border-b border-rule focus-within:border-ink transition-colors gap-2">
          <input
            type="number"
            value={String(value ?? "")}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 min-w-0 bg-transparent text-[14px] text-ink py-2 border-0 focus:outline-none"
          />
          {field.unit && (
            <span className="text-[12px] text-ink-soft pb-2 shrink-0">
              {field.unit}
            </span>
          )}
        </div>
        {field.help && (
          <span className="text-[11.5px] text-ink-soft leading-[1.5]">
            {field.help}
          </span>
        )}
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <SelectField
          value={String(value ?? field.default)}
          onChange={(v) => onChange(v)}
          options={field.options.map((o) => ({ label: o, value: o }))}
        />
        {field.help && (
          <span className="text-[11.5px] text-ink-soft leading-[1.5]">
            {field.help}
          </span>
        )}
      </label>
    );
  }

  if (field.kind === "multiSelect") {
    const arr = (value as string[]) ?? [];
    function toggle(o: string) {
      onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    }
    return (
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {field.options.map((o) => {
            const on = arr.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  on
                    ? "bg-ink text-white border-ink"
                    : "bg-card text-ink-muted border-rule hover:border-ink/25 hover:text-ink"
                }`}
              >
                {on && <IconCheck width={11} height={11} />}
                {o}
              </button>
            );
          })}
        </div>
        {field.help && (
          <span className="text-[11.5px] text-ink-soft leading-[1.5] mt-1">
            {field.help}
          </span>
        )}
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <label className="sm:col-span-2 flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {field.label}
        </span>
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          className="w-full bg-transparent text-[13px] text-ink py-2 border border-rule rounded-md px-3 focus:border-ink focus:outline-none transition-colors resize-none placeholder:text-ink-soft leading-[1.55]"
        />
        {field.help && (
          <span className="text-[11.5px] text-ink-soft leading-[1.5]">
            {field.help}
          </span>
        )}
      </label>
    );
  }

  if (field.kind === "toggle") {
    const on = Boolean(value);
    return (
      <label className="sm:col-span-2 flex items-start justify-between gap-3 p-4 rounded-md border border-rule cursor-pointer hover:border-ink/25 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-ink mb-0.5">
            {field.label}
          </p>
          {field.help && (
            <p className="text-[11.5px] text-ink-soft leading-[1.5]">
              {field.help}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors shrink-0 ${
            on ? "bg-ink" : "bg-rule"
          }`}
        >
          <span
            className={`absolute top-0.5 inline-block size-4 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
    );
  }

  return null;
}
