"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import {
  IconSearch,
  IconBell,
  IconChevronDown,
  IconClose,
  IconCheck,
  IconPlus,
} from "@/components/Icons";
import { LANGUAGES } from "@/lib/brand";
import {
  rememberLocalePreference,
  useLocale,
  useLocalizedPath,
} from "@/lib/i18n/client";
import { canonicalizePath, localizePath } from "@/lib/i18n/routing";
import { getCommonCopy } from "@/lib/i18n/translations";

type Workspace = {
  id: string;
  initials: string;
  displayName: string;
  planName: string;
  roleName: string;
};

const WORKSPACES: Workspace[] = [
  {
    id: "ten_aXz7P9k2",
    initials: "NG",
    displayName: "Northway Goods",
    planName: "Business",
    roleName: "Owner",
  },
  {
    id: "ten_b3M8R2y4",
    initials: "AT",
    displayName: "AtaForge Lab",
    planName: "Starter",
    roleName: "Admin",
  },
];

type Suggestion = {
  group: "Workers" | "Conversations" | "Reports" | "Settings";
  displayText: string;
  helperText?: string;
  href: string;
};

const SUGGESTIONS: Suggestion[] = [
  { group: "Workers", displayText: "Cyrus · Customer Support", helperText: "Online · 64% load", href: "/app/workforce/wrk_cs_4nq3" },
  { group: "Workers", displayText: "Iris · Inbound Sales Closer", helperText: "Online · 41% load", href: "/app/workforce/wrk_is_8qr2" },
  { group: "Workers", displayText: "Soren · Social Media", helperText: "Online · 27% load", href: "/app/workforce/wrk_sm_1zk7" },
  { group: "Conversations", displayText: "Marie Janssen · WhatsApp", helperText: "Escalated · 3 min", href: "/app/conversations/cnv_5xz8" },
  { group: "Conversations", displayText: "Kenan Öz · Email", helperText: "Active · 8 min", href: "/app/conversations/cnv_5xz7" },
  { group: "Reports", displayText: "Weekly executive summary", helperText: "Every Monday 08:00", href: "/app/reports" },
  { group: "Settings", displayText: "Notification preferences", href: "/app/settings/notifications" },
  { group: "Settings", displayText: "Billing & invoices", href: "/app/billing" },
];

const CURRENT_USER = {
  initials: "SK",
  displayName: "Alex",
  fullDisplayName: "Alex Morgan",
  emailAddress: "test@mail.com",
} as const;

export function AppTopbar() {
  const locale = useLocale();
  const pathname = usePathname();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(WORKSPACES[0].id);
  const workspaceWrap = useRef<HTMLDivElement>(null);
  const profileWrap = useRef<HTMLDivElement>(null);
  const languageWrap = useRef<HTMLDivElement>(null);

  const activeWorkspace =
    WORKSPACES.find((w) => w.id === activeWorkspaceId) ?? WORKSPACES[0];
  const activeLanguage =
    LANGUAGES.find((language) => language.locale === locale) ?? LANGUAGES[0];
  const canonicalPath = canonicalizePath(pathname, locale);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (workspaceWrap.current && !workspaceWrap.current.contains(e.target as Node)) {
        setWorkspaceOpen(false);
      }
      if (profileWrap.current && !profileWrap.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (languageWrap.current && !languageWrap.current.contains(e.target as Node)) {
        setLanguageOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setWorkspaceOpen(false);
        setProfileOpen(false);
        setLanguageOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-canvas/85 backdrop-blur-md border-b border-rule">
        <div className="h-full flex items-center justify-between px-5 md:px-7 gap-4">
          {/* Workspace selector */}
          <div ref={workspaceWrap} className="relative">
            <button
              type="button"
              onClick={() => setWorkspaceOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={workspaceOpen}
              className="inline-flex items-center gap-2 rounded-md border border-rule px-2.5 py-1.5 hover:border-ink/25 hover:bg-canvas-soft transition-colors"
            >
              <span className="size-5 rounded-md bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink">
                {activeWorkspace.initials}
              </span>
              <span className="text-[13px] font-medium text-ink hidden sm:inline">
                {activeWorkspace.displayName}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft hidden md:inline">
                {activeWorkspace.planName}
              </span>
              <IconChevronDown
                className={`text-ink-soft transition-transform ${
                  workspaceOpen ? "rotate-180" : ""
                }`}
                width={12}
                height={12}
              />
            </button>

            {workspaceOpen && (
              <div
                role="listbox"
                aria-label={copy.labels["Choose workspace"]}
                className="absolute top-full left-0 mt-2 w-[300px] bg-card border border-rule rounded-[10px] shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)] overflow-hidden z-50"
              >
                <div className="px-3 py-2 border-b border-rule">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    {copy.labels["Switch workspace"]}
                  </p>
                </div>
                <ul className="py-1">
                  {WORKSPACES.map((w) => {
                    const isActive = w.id === activeWorkspaceId;
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkspaceId(w.id);
                            setWorkspaceOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            isActive ? "bg-canvas-soft" : "hover:bg-canvas-soft"
                          }`}
                        >
                          <span className="size-7 rounded-md bg-tint/60 border border-rule flex items-center justify-center font-mono text-[10px] font-medium text-ink shrink-0">
                            {w.initials}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-ink truncate">
                              {w.displayName}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft mt-0.5">
                              {w.planName} · {w.roleName}
                            </p>
                          </div>
                          {isActive && (
                            <IconCheck
                              className="text-accent shrink-0"
                              width={14}
                              height={14}
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-rule py-1">
                  <button
                    type="button"
                    onClick={() => setWorkspaceOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    <IconPlus width={13} height={13} />
                    {copy.labels["Add workspace"]}
                  </button>
                  <Link
                    href={href("/app/settings/profile")}
                    onClick={() => setWorkspaceOpen(false)}
                    className="block px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    {copy.labels["Workspace settings"]}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-[420px] hidden sm:block">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full inline-flex items-center gap-2.5 border border-rule rounded-md px-3 h-9 bg-card hover:border-ink/25 hover:bg-canvas-soft transition-colors"
            >
              <IconSearch className="text-ink-soft shrink-0" />
              <span className="text-[12.5px] text-ink-soft flex-1 text-left">
                {copy.labels["Search placeholder"]}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft border border-rule rounded px-1.5 py-0.5 shrink-0">
                {copy.labels["Search shortcut"]}
              </span>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={copy.labels["Open search"]}
              className="sm:hidden inline-flex items-center justify-center size-9 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
            >
              <IconSearch />
            </button>

            {/* Language picker */}
            <div ref={languageWrap} className="relative">
              <button
                type="button"
                onClick={() => setLanguageOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={languageOpen}
                aria-label={`${copy.labels["Change language"]} · ${activeLanguage.label}`}
                title={`${activeLanguage.label} · ${activeLanguage.code}`}
                className="inline-flex items-center gap-1.5 h-9 px-2 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <span className="text-[15px] leading-none" aria-hidden>
                  {activeLanguage.flag}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink hidden sm:inline">
                  {activeLanguage.shortCode}
                </span>
                <IconChevronDown
                  className={`text-ink-soft transition-transform ${
                    languageOpen ? "rotate-180" : ""
                  }`}
                  width={11}
                  height={11}
                />
              </button>

              {languageOpen && (
                <div
                  role="listbox"
                  aria-label={copy.labels["Select language"]}
                  className="absolute top-full right-0 mt-2 w-[280px] bg-card border border-rule rounded-[10px] shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)] overflow-hidden z-50"
                >
                  <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      {copy.labels.Language}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                      {LANGUAGES.length} {copy.labels.available}
                    </span>
                  </div>
                  <ul className="max-h-[300px] overflow-y-auto py-1">
                    {LANGUAGES.map((l) => {
                      const isSelected = activeLanguage.locale === l.locale;
                      return (
                        <li key={l.code}>
                          <Link
                            href={localizePath(canonicalPath, l.locale)}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              rememberLocalePreference(l.locale);
                              setLanguageOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? "bg-canvas-soft"
                                : "hover:bg-canvas-soft"
                            }`}
                          >
                            <span
                              className="text-[15px] leading-none w-5"
                              aria-hidden
                            >
                              {l.flag}
                            </span>
                            <span className="text-[13px] text-ink flex-1 truncate">
                              {l.label}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                              {l.code}
                            </span>
                            {isSelected && (
                              <IconCheck
                                className="text-accent shrink-0"
                                width={12}
                                height={12}
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t border-rule py-1">
                    <Link
                      href={href("/app/settings/language")}
                      onClick={() => setLanguageOpen(false)}
                      className="block px-3 py-2 text-[12.5px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                    >
                      {copy.labels["Language settings"]}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href={href("/app/approvals")}
              className="relative inline-flex items-center justify-center size-9 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              aria-label={copy.labels["Notifications pending"]}
            >
              <IconBell />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
            </Link>

            <div ref={profileWrap} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                className="inline-flex items-center gap-2 rounded-md hover:bg-canvas-soft pl-1 pr-2 py-1 transition-colors"
              >
                <span className="size-7 rounded-full bg-ink text-white flex items-center justify-center font-mono text-[10px] font-medium">
                  {CURRENT_USER.initials}
                </span>
                <span className="text-[12.5px] text-ink hidden md:inline">
                  {CURRENT_USER.displayName}
                </span>
                <IconChevronDown
                  className={`text-ink-soft transition-transform ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                  width={12}
                  height={12}
                />
              </button>

              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-[220px] bg-card border border-rule rounded-[10px] shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)] overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-rule">
                    <p className="text-[13px] font-medium text-ink">
                      {CURRENT_USER.fullDisplayName}
                    </p>
                    <p className="text-[11.5px] text-ink-muted truncate">
                      {CURRENT_USER.emailAddress}
                    </p>
                  </div>
                  <nav className="py-1">
                    {[
                      { key: "Profile", href: "/app/settings/profile" },
                      { key: "Security", href: "/app/settings/security" },
                      { key: "Notifications", href: "/app/settings/notifications" },
                      { key: "Language", href: "/app/settings/language" },
                      { key: "Billing", href: "/app/billing" },
                    ].map((l) => (
                      <Link
                        key={l.href}
                        href={href(l.href)}
                        className="block px-4 py-2 text-[13px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        {copy.links[l.key] ?? copy.labels[l.key] ?? l.key}
                      </Link>
                    ))}
                  </nav>
                  <div className="border-t border-rule py-1">
                    <Link
                      href={href("/login")}
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-[13px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                    >
                      {copy.labels["Log out"]}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function SearchPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 10);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const filtered = q
    ? SUGGESTIONS.filter((s) =>
        (s.displayText + " " + (s.helperText ?? "")).toLowerCase().includes(q.toLowerCase())
      )
    : SUGGESTIONS;

  const grouped = filtered.reduce<Record<string, Suggestion[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  function submit(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.labels["Search dialog"]}
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
    >
      <button
        type="button"
        aria-label={copy.labels.Close}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[600px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] overflow-hidden">
        <form
          onSubmit={submit}
          className="flex items-center gap-3 px-5 h-14 border-b border-rule"
        >
          <IconSearch className="text-ink-soft shrink-0" width={16} height={16} />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={copy.labels["Search input placeholder"]}
            className="flex-1 bg-transparent text-[14px] text-ink py-2 border-0 focus:outline-none placeholder:text-ink-soft"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.labels["Close search"]}
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft border border-rule rounded px-1.5 py-0.5 hover:text-ink hover:border-ink/25 transition-colors"
          >
            ESC
          </button>
        </form>
        <div className="max-h-[420px] overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-ink">
                {copy.labels["No matches prefix"]} &ldquo;{q}&rdquo;{copy.labels["No matches suffix"]}
              </p>
              <p className="text-[12px] text-ink-muted mt-1">
                {copy.labels["Search empty hint"]}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft px-4 py-1.5">
                  {group}
                </p>
                <ul>
                  {items.map((s) => (
                    <li key={s.href}>
                      <Link
                        href={href(s.href)}
                        onClick={onClose}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-canvas-soft transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] text-ink truncate">
                            {s.displayText}
                          </p>
                          {s.helperText && (
                            <p className="text-[11.5px] text-ink-muted truncate">
                              {s.helperText}
                            </p>
                          )}
                        </div>
                        <span
                          aria-hidden
                          className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft group-hover:text-ink transition-colors"
                        >
                          ↵
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 h-10 border-t border-rule bg-canvas-soft/60 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
          <span className="flex items-center gap-3">
            <span>{copy.labels["Navigate shortcut"]}</span>
            <span>{copy.labels["Open shortcut"]}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconClose width={11} height={11} className="text-ink-soft" />
            <span>{copy.labels["Esc close"]}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
