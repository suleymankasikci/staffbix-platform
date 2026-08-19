"use client";

import { useEffect, useState } from "react";
import {
  PageShell,
  Card,
  SectionTitle,
  Badge,
} from "@/components/app/PageShell";

// Sprint 15: settings now persist through the `platform_settings` table.
// On mount we fetch /api/admin/settings; Save → PUT /api/admin/settings
// for every key whose value changed since load.

interface SettingsState {
  maintenance_mode: boolean;
  signups_open: boolean;
  trial_days: number;
}

const DEFAULTS: SettingsState = {
  maintenance_mode: false,
  signups_open: true,
  trial_days: 14,
};

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return fallback;
}
function asNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const [server, setServer] = useState<SettingsState>(DEFAULTS);
  const [draft, setDraft] = useState<SettingsState>(DEFAULTS);
  const [trialDaysInput, setTrialDaysInput] = useState<string>(
    String(DEFAULTS.trial_days),
  );

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        settings?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Couldn't load settings.");
        return;
      }
      const s = data.settings ?? {};
      const next: SettingsState = {
        maintenance_mode: asBool(s.maintenance_mode, DEFAULTS.maintenance_mode),
        signups_open: asBool(s.signups_open, DEFAULTS.signups_open),
        trial_days: asNum(s.trial_days, DEFAULTS.trial_days),
      };
      setServer(next);
      setDraft(next);
      setTrialDaysInput(String(next.trial_days));
    } catch {
      setLoadError("Network error loading settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const dirty =
    draft.maintenance_mode !== server.maintenance_mode ||
    draft.signups_open !== server.signups_open ||
    draft.trial_days !== server.trial_days;

  async function putSetting(key: string, value: unknown): Promise<boolean> {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(data.error ?? `Couldn't save ${key}.`);
      return false;
    }
    return true;
  }

  async function save() {
    setActionError(null);
    setSaveOk(false);
    setSaving(true);
    try {
      // Validate trial days from the input first.
      const td = Number(trialDaysInput);
      if (!Number.isFinite(td) || td < 0 || td > 365 || !Number.isInteger(td)) {
        setActionError("trial_days must be an integer between 0 and 365.");
        return;
      }
      const writes: Array<[string, unknown]> = [];
      if (draft.maintenance_mode !== server.maintenance_mode) {
        writes.push(["maintenance_mode", draft.maintenance_mode]);
      }
      if (draft.signups_open !== server.signups_open) {
        writes.push(["signups_open", draft.signups_open]);
      }
      if (td !== server.trial_days) {
        writes.push(["trial_days", td]);
      }
      for (const [k, v] of writes) {
        const ok = await putSetting(k, v);
        if (!ok) return;
      }
      // Refresh from the server so we're in sync with whatever was
      // actually persisted (and timestamps tick forward).
      await reload();
      setSaveOk(true);
    } catch {
      setActionError("Network error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    void reload();
    setActionError(null);
    setSaveOk(false);
  }

  return (
    <PageShell
      title="Admin settings"
      description="Platform-wide configuration. Changes affect every tenant."
    >
      {loadError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {actionError}
        </div>
      )}
      {saveOk && !actionError && (
        <div className="mb-3 rounded-md border border-rule bg-canvas-soft px-3 py-2 text-[12.5px] text-ink">
          Settings saved.
        </div>
      )}
      {loading && (
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          Loading…
        </div>
      )}

      <div className="flex flex-col gap-5 max-w-[920px]">
        <Card>
          <SectionTitle
            label="Signup & trial"
            description="Control how new tenants enter the platform."
          />
          <div className="flex flex-col gap-3 mt-2">
            <Toggle
              label="Signups open"
              hint="When off, marketing site shows 'waitlist only'."
              on={draft.signups_open}
              onChange={(v) => setDraft((d) => ({ ...d, signups_open: v }))}
            />
            <Field
              label="Free trial duration"
              value={trialDaysInput}
              onChange={(v) => {
                setTrialDaysInput(v);
                const n = Number(v);
                if (Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 365) {
                  setDraft((d) => ({ ...d, trial_days: n }));
                }
              }}
              hint="Days · applies to new signups only"
              suffix="days"
            />
          </div>
        </Card>

        <Card>
          <SectionTitle
            label="Operational mode"
            description="Emergency switches and feature gates."
          />
          <div className="flex flex-col gap-3 mt-2">
            <Toggle
              label="Maintenance mode"
              hint="Customer app shows a banner; AI workers pause; admins keep full access."
              on={draft.maintenance_mode}
              onChange={(v) => setDraft((d) => ({ ...d, maintenance_mode: v }))}
              danger
            />
            <Toggle
              label="Allow staff impersonation"
              hint="Sprint 17: backed by its own setting key. Read-only here for now."
              on={true}
              onChange={() => {}}
              disabled
            />
            <Toggle
              label="API access enabled"
              hint="Sprint 17: backed by its own setting key. Read-only here for now."
              on={true}
              onChange={() => {}}
              disabled
            />
          </div>
        </Card>

        <Card>
          <SectionTitle
            label="AI model routing"
            description="Default model preferences. Per-role override available in catalog."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SelectField label="Routing tier (cheap)" value="GPT-4o-mini" options={["GPT-4o-mini", "Claude Haiku", "Gemini Flash"]} />
            <SelectField label="Conversation tier (mid)" value="Claude Sonnet 4.5" options={["Claude Sonnet 4.5", "GPT-4.1", "Gemini Pro"]} />
            <SelectField label="Reasoning tier (high)" value="Claude Opus 4.5" options={["Claude Opus 4.5", "GPT-5", "Gemini Ultra"]} />
            <SelectField label="Vision tier" value="Claude Sonnet 4.5" options={["Claude Sonnet 4.5", "GPT-4o", "Gemini Pro Vision"]} />
          </div>
          <div className="mt-5 border border-rule rounded-md p-4 bg-canvas-soft/40">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1.5">
              Failover behaviour
            </p>
            <p className="text-[12.5px] text-ink-muted leading-[1.6]">
              On primary provider timeout (&gt; 12s), retry once on primary, then
              fall over to the secondary in the same tier. Track failovers in
              audit log.
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle
            label="Data residency"
            description="Where tenant data lives by default. Enterprise can override."
          />
          <div className="flex flex-col gap-2 max-w-[480px]">
            {["EU (Frankfurt)", "US (Virginia)", "UK (London)", "Türkiye (Istanbul)"].map((r, i) => (
              <label key={r} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${i === 0 ? "border-ink bg-canvas-soft" : "border-rule hover:border-ink/25"}`}>
                <span className="text-[13px] text-ink">{r}</span>
                <input type="radio" name="residency" defaultChecked={i === 0} className="sr-only" />
                <span className={`size-3.5 rounded-full border-2 ${i === 0 ? "border-ink bg-ink" : "border-rule"}`} />
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle
            label="Compliance"
            description="Active certifications and ongoing programs."
          />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ComplianceItem label="GDPR-aligned" status="Active" />
            <ComplianceItem label="SOC 2 Type II" status="In progress" />
            <ComplianceItem label="ISO 27001" status="Planned" />
            <ComplianceItem label="HIPAA BAA" status="Planned" />
          </ul>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={discard}
            disabled={!dirty || saving}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
  danger,
  disabled,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-3 p-4 rounded-md border cursor-pointer transition-colors ${danger && on ? "border-[#B91C1C]/40 bg-[#B91C1C]/[0.04]" : "border-rule hover:border-ink/25"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      <div className="flex-1">
        <p className="text-[13px] font-medium text-ink mb-0.5">{label}</p>
        {hint && <p className="text-[11.5px] text-ink-muted leading-[1.5]">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => !disabled && onChange(!on)}
        className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors shrink-0 ${on ? (danger ? "bg-[#B91C1C]" : "bg-ink") : "bg-rule"} ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span className={`absolute top-0.5 inline-block size-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function Field({ label, value, onChange, hint, suffix }: { label: string; value: string; onChange: (v: string) => void; hint?: string; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1.5 max-w-[320px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <div className="flex items-baseline border-b border-rule focus-within:border-ink transition-colors gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-[14px] text-ink py-2 border-0 focus:outline-none"
        />
        {suffix && <span className="text-[12px] text-ink-soft pb-2">{suffix}</span>}
      </div>
      {hint && <span className="text-[11.5px] text-ink-soft">{hint}</span>}
    </label>
  );
}

function SelectField({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <div className="relative">
        <select defaultValue={value} className="appearance-none w-full bg-transparent text-[14px] text-ink py-2 pr-8 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}

function ComplianceItem({ label, status }: { label: string; status: "Active" | "In progress" | "Planned" }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 rounded-md border border-rule">
      <span className="text-[13px] text-ink">{label}</span>
      <Badge tone={status === "Active" ? "accent" : status === "In progress" ? "soft" : "neutral"}>{status}</Badge>
    </li>
  );
}
