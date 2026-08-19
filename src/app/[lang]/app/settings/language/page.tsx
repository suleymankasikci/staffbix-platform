"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageShell, Card, SectionTitle } from "@/components/app/PageShell";
import { SettingsNav } from "@/components/app/SettingsNav";
import { IconCheck } from "@/components/Icons";
import { LANGUAGES } from "@/lib/brand";
import {
  rememberLocalePreference,
  useLocale,
} from "@/lib/i18n/client";
import { getAppSettingsLanguageCopy } from "@/lib/i18n/page-copy";
import { canonicalizePath, localizePath } from "@/lib/i18n/routing";

export default function LanguageSettingsPage() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const copy = getAppSettingsLanguageCopy(locale);
  const currentLanguage =
    LANGUAGES.find((language) => language.locale === locale) ?? LANGUAGES[0];
  const [aiCode, setAiCode] = useState("EN");
  const [timezone, setTimezone] = useState<string>(copy.timezones[0]);
  const [dateFmt, setDateFmt] = useState<string>(copy.dateFormats[0].value);
  const [currency, setCurrency] = useState<string>(copy.currencies[0]);
  const canonicalPath = canonicalizePath(pathname, locale);

  function changeInterfaceLanguage(code: string) {
    const next = LANGUAGES.find((language) => language.code === code);
    if (!next) return;
    rememberLocalePreference(next.locale);
    router.push(localizePath(canonicalPath, next.locale));
  }

  return (
    <PageShell title={copy.title} description={copy.description}>
      <SettingsNav />

      <div className="flex flex-col gap-5 max-w-[840px]">
        <Card>
          <SectionTitle
            label={copy.interfaceLanguage.title}
            description={copy.interfaceLanguage.description}
          />
          <LanguageGrid
            value={currentLanguage.code}
            onChange={changeInterfaceLanguage}
          />
        </Card>

        <Card>
          <SectionTitle
            label={copy.aiLanguage.title}
            description={copy.aiLanguage.description}
          />
          <LanguageGrid value={aiCode} onChange={setAiCode} />
        </Card>

        <Card>
          <SectionTitle label={copy.regional.title} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <SelectField
              label={copy.regional.timezone}
              value={timezone}
              onChange={setTimezone}
              options={copy.timezones.map((t) => ({ label: t, value: t }))}
            />
            <SelectField
              label={copy.regional.dateFormat}
              value={dateFmt}
              onChange={setDateFmt}
              options={copy.dateFormats.map((d) => ({
                label: `${d.value} · ${d.example}`,
                value: d.value,
              }))}
            />
            <SelectField
              label={copy.regional.currency}
              value={currency}
              onChange={setCurrency}
              options={copy.currencies.map((c) => ({ label: c, value: c }))}
            />
          </div>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {copy.regional.notice}
          </p>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            {copy.actions.cancel}
          </button>
          <button
            type="button"
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
          >
            {copy.actions.save}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function LanguageGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {LANGUAGES.map((l) => {
        const active = value === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange(l.code)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border transition-colors text-left ${
              active
                ? "bg-ink text-white border-ink"
                : "bg-card border-rule hover:border-ink/25 text-ink"
            }`}
          >
            <span className="text-[16px] leading-none shrink-0">{l.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] leading-tight">
                {l.code}
              </p>
              <p
                className={`text-[12px] truncate leading-tight mt-0.5 ${
                  active ? "text-white/80" : "text-ink-muted"
                }`}
              >
                {l.label}
              </p>
            </div>
            {active && <IconCheck width={12} height={12} className="shrink-0" />}
          </button>
        );
      })}
    </div>
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
          className="appearance-none w-full bg-transparent text-[13.5px] text-ink py-2 pr-8 border-0 border-b border-rule focus:border-ink focus:outline-none transition-colors"
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
