"use client";

import { useState } from "react";
import { PageShell, Card, SectionTitle } from "@/components/app/PageShell";
import { SettingsNav } from "@/components/app/SettingsNav";
import { useLocale } from "@/lib/i18n/client";
import { getAppSettingsNotificationsCopy } from "@/lib/i18n/page-copy";

type Channel = "push" | "email" | "inApp";
type NotificationsCopy = ReturnType<typeof getAppSettingsNotificationsCopy>;
type Pref = NotificationsCopy["preferences"]["rows"][number];

export default function NotificationSettingsPage() {
  const locale = useLocale();
  const copy = getAppSettingsNotificationsCopy(locale);
  const [prefs, setPrefs] = useState<Pref[]>(() =>
    copy.preferences.rows.map((p) => ({ ...p }))
  );
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [criticalOverride, setCriticalOverride] = useState(true);

  function toggle(key: string, ch: Channel) {
    setPrefs((ps) =>
      ps.map((p) => (p.key === key ? { ...p, [ch]: !p[ch] } : p))
    );
  }

  return (
    <PageShell title={copy.title} description={copy.description}>
      <SettingsNav />

      <div className="flex flex-col gap-5 max-w-[920px]">
        <Card padded={false}>
          <div className="px-5 pt-5 pb-3">
            <SectionTitle
              label={copy.preferences.title}
              description={copy.preferences.description}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-canvas-soft/60 border-y border-rule text-left">
                  <TableHead>{copy.preferences.category}</TableHead>
                  <TableHead centered>{copy.preferences.push}</TableHead>
                  <TableHead centered>{copy.preferences.email}</TableHead>
                  <TableHead centered>{copy.preferences.inApp}</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {prefs.map((p) => (
                  <tr
                    key={p.key}
                    className="hover:bg-canvas-soft/40 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-ink mb-0.5">
                        {p.label}
                      </p>
                      <p className="text-[12px] text-ink-muted leading-[1.55]">
                        {p.desc}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Toggle on={p.push} onChange={() => toggle(p.key, "push")} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Toggle on={p.email} onChange={() => toggle(p.key, "email")} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Toggle on={p.inApp} onChange={() => toggle(p.key, "inApp")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionTitle
            label={copy.quiet.title}
            description={copy.quiet.description}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[480px]">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {copy.quiet.from}
              </span>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {copy.quiet.to}
              </span>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="bg-transparent text-[14px] text-ink py-2 border-0 border-b border-rule focus:border-ink focus:outline-none"
              />
            </label>
          </div>
          <label className="mt-6 flex items-start justify-between gap-3 p-4 rounded-md border border-rule cursor-pointer hover:border-ink/25 transition-colors max-w-[560px]">
            <div>
              <p className="text-[13px] font-medium text-ink mb-0.5">
                {copy.quiet.criticalTitle}
              </p>
              <p className="text-[12px] text-ink-muted leading-[1.55]">
                {copy.quiet.criticalDescription}
              </p>
            </div>
            <Toggle
              on={criticalOverride}
              onChange={() => setCriticalOverride((v) => !v)}
            />
          </label>
        </Card>
      </div>
    </PageShell>
  );
}

function TableHead({
  children,
  centered,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <th
      className={`font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft px-5 py-2.5 font-normal ${
        centered ? "text-center w-[80px]" : ""
      }`}
    >
      {children}
    </th>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors ${
        on ? "bg-ink" : "bg-rule"
      }`}
    >
      <span
        className={`absolute top-0.5 inline-block size-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
