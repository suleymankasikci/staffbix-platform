"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IconSearch,
  IconBell,
  IconChevronDown,
} from "@/components/Icons";

export function AdminTopbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (profileWrap.current && !profileWrap.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-canvas/90 backdrop-blur-md border-b border-rule">
      <div className="h-full flex items-center justify-between px-5 md:px-7 gap-4">
        {/* Environment + breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 border border-rule rounded-md px-2.5 py-1.5 bg-card">
            <span className="size-1.5 rounded-full bg-[#F97316] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
              Production
            </span>
            <span className="text-ink-soft/60 mx-1">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-[480px] hidden sm:block">
          <button
            type="button"
            className="w-full inline-flex items-center gap-2.5 border border-rule rounded-md px-3 h-9 bg-card hover:border-ink/25 hover:bg-canvas-soft transition-colors"
          >
            <IconSearch className="text-ink-soft shrink-0" />
            <span className="text-[12.5px] text-ink-soft flex-1 text-left">
              Jump to any tenant, user, invoice, ticket…
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft border border-rule rounded px-1.5 py-0.5 shrink-0">
              ⌘K
            </span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/support"
            className="relative inline-flex items-center justify-center size-9 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
            aria-label="6 open tickets"
          >
            <IconBell />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#F97316]" />
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
                SK
              </span>
              <span className="text-[12.5px] text-ink hidden md:inline">
                Alex
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#F97316] border border-[#F97316]/40 rounded px-1.5 py-0.5 hidden md:inline">
                Super
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
              <div className="absolute top-full right-0 mt-2 w-[240px] bg-card border border-rule rounded-[10px] shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)] overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-rule">
                  <p className="text-[13px] font-medium text-ink">
                    Alex Morgan
                  </p>
                  <p className="text-[11.5px] text-ink-muted truncate">
                    test@mail.com
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#F97316]">
                    Super admin · 2FA on
                  </p>
                </div>
                <nav className="py-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-[13px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    Admin settings
                  </Link>
                  <Link
                    href="/admin/team"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-[13px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    Staff team
                  </Link>
                  <Link
                    href="/admin/audit"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-[13px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    Audit log
                  </Link>
                  <Link
                    href="/en/app/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-[13px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    Switch to customer app →
                  </Link>
                </nav>
                <div className="border-t border-rule py-1">
                  <Link
                    href="/admin/login"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-[13px] text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    Log out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
