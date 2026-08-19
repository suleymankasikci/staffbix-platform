"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconWorkforce,
  IconBrandBible,
  IconApprovals,
  IconConversations,
  IconReports,
  IconIntegrations,
  IconBilling,
  IconTeam,
  IconSettings,
  IconChevronLeft,
  IconLogOut,
  IconLogs,
  IconHelp,
} from "@/components/Icons";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { canonicalizePath } from "@/lib/i18n/routing";
import { getCommonCopy } from "@/lib/i18n/translations";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  key: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
};

const PRIMARY: NavItem[] = [
  { key: "Dashboard", href: "/app/dashboard", Icon: IconDashboard },
  { key: "Workforce", href: "/app/workforce", Icon: IconWorkforce },
  { key: "Brand Bible", href: "/app/brand-bible", Icon: IconBrandBible },
  { key: "Approvals", href: "/app/approvals", Icon: IconApprovals, badge: 7 },
  { key: "Conversations", href: "/app/conversations", Icon: IconConversations },
  { key: "Reports", href: "/app/reports", Icon: IconReports },
];

const SECONDARY: NavItem[] = [
  { key: "Integrations", href: "/app/integrations", Icon: IconIntegrations },
  { key: "Billing", href: "/app/billing", Icon: IconBilling },
  { key: "Team", href: "/app/team", Icon: IconTeam },
  { key: "Settings", href: "/app/settings/profile", Icon: IconSettings },
  { key: "Logs", href: "/app/logs", Icon: IconLogs },
  { key: "Help", href: "/app/help", Icon: IconHelp },
];

const STORAGE_KEY = "staffbix.sidebar.collapsed";

type TooltipState = {
  label: string;
  badge?: number;
  x: number;
  y: number;
};

export function AppSidebar() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);
  const pathname = usePathname();
  const canonicalPathname = canonicalizePath(pathname, locale);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const logoutRef = useRef<HTMLAnchorElement>(null);

  // Persist collapsed state across page loads.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const frame = window.requestAnimationFrame(() => {
      if (stored === "1") setCollapsed(true);
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Tooltip hides on scroll, resize, or route change.
  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tooltip]);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function showTooltip(el: HTMLElement, item: NavItem) {
    const r = el.getBoundingClientRect();
    setTooltip({
      label: copy.links[item.key] ?? copy.labels[item.key] ?? item.key,
      badge: item.badge,
      x: r.right + 10,
      y: r.top + r.height / 2,
    });
  }

  if (!mounted) {
    return <SidebarShell collapsed={false} />;
  }

  return (
    <>
      <aside
        className={`hidden md:flex h-screen sticky top-0 shrink-0 flex-col bg-canvas border-r border-rule transition-[width] duration-200 ease-out ${
          collapsed ? "w-[60px]" : "w-[232px]"
        }`}
        aria-label={copy.labels["Primary navigation"]}
      >
        <header
          className={`flex items-center h-16 border-b border-rule ${
            collapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={toggle}
              aria-label={copy.labels["Expand sidebar"]}
              title={copy.labels["Expand sidebar"]}
              className="inline-flex items-center justify-center size-9 rounded-md border border-rule text-ink-muted hover:text-ink hover:bg-canvas-soft hover:border-ink/25 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : (
            <>
              <Link
                href={href("/app/dashboard")}
                className="inline-flex items-center gap-2 text-ink"
                aria-label={BRAND_NAME}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                  className="shrink-0"
                >
                  <rect x="0" y="2" width="9" height="1.5" fill="currentColor" />
                  <rect x="2.5" y="6.25" width="9" height="1.5" fill="currentColor" />
                  <rect x="0" y="10.5" width="9" height="1.5" fill="currentColor" />
                </svg>
                <span className="text-[14px] font-medium tracking-[-0.01em]">
                  {BRAND_NAME}
                </span>
              </Link>
              <button
                type="button"
                onClick={toggle}
                aria-label={copy.labels["Collapse sidebar"]}
                title={copy.labels["Collapse sidebar"]}
                className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <IconChevronLeft />
              </button>
            </>
          )}
        </header>

        <nav className="flex-1 overflow-y-auto py-4">
          <NavGroup
            label={copy.labels.Workspace}
            items={PRIMARY}
            collapsed={collapsed}
            canonicalPathname={canonicalPathname}
            onShowTooltip={showTooltip}
            onHideTooltip={() => setTooltip(null)}
          />
          <div
            className={
              collapsed
                ? "my-3 mx-2 border-t border-rule"
                : "my-3 mx-4 border-t border-rule"
            }
          />
          <NavGroup
            label={copy.labels.Account}
            items={SECONDARY}
            collapsed={collapsed}
            canonicalPathname={canonicalPathname}
            onShowTooltip={showTooltip}
            onHideTooltip={() => setTooltip(null)}
          />
        </nav>

        <footer
          className={`border-t border-rule py-3 ${
            collapsed ? "px-2" : "px-3"
          }`}
        >
          {collapsed ? (
            <Link
              ref={logoutRef}
              href={href("/login")}
              onMouseEnter={() => {
                if (logoutRef.current) {
                  const r = logoutRef.current.getBoundingClientRect();
                  setTooltip({
                    label: copy.labels["Log out"],
                    x: r.right + 10,
                    y: r.top + r.height / 2,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
              className="flex items-center justify-center h-9 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
              aria-label={copy.labels["Log out"]}
            >
              <IconLogOut />
            </Link>
          ) : (
            <Link
              href={href("/login")}
              className="flex items-center gap-3 px-2 py-2 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-soft transition-colors"
            >
              <IconLogOut />
              <span className="text-[13px]">{copy.labels["Log out"]}</span>
            </Link>
          )}
        </footer>
      </aside>

      {collapsed && tooltip && (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateY(-50%)",
          }}
          className="pointer-events-none z-[60] whitespace-nowrap px-2.5 py-1.5 rounded-md bg-ink text-white text-[12px] font-medium shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] animate-[tooltipIn_0.12s_ease-out]"
        >
          {tooltip.label}
          {tooltip.badge !== undefined && (
            <span className="ml-1.5 font-mono text-[10px] text-white/60">
              {tooltip.badge}
            </span>
          )}
          <style jsx>{`
            @keyframes tooltipIn {
              from {
                opacity: 0;
                transform: translateY(-50%) translateX(-4px);
              }
              to {
                opacity: 1;
                transform: translateY(-50%) translateX(0);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function NavGroup({
  label,
  items,
  collapsed,
  canonicalPathname,
  onShowTooltip,
  onHideTooltip,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  canonicalPathname: string;
  onShowTooltip: (el: HTMLElement, item: NavItem) => void;
  onHideTooltip: () => void;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft px-4 mb-2.5">
          {label}
        </p>
      )}
      <ul className="flex flex-col gap-0.5 px-2">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            canonicalPathname={canonicalPathname}
            onShowTooltip={onShowTooltip}
            onHideTooltip={onHideTooltip}
          />
        ))}
      </ul>
    </div>
  );
}

function NavLink({
  item,
  collapsed,
  canonicalPathname,
  onShowTooltip,
  onHideTooltip,
}: {
  item: NavItem;
  collapsed: boolean;
  canonicalPathname: string;
  onShowTooltip: (el: HTMLElement, item: NavItem) => void;
  onHideTooltip: () => void;
}) {
  const isActive =
    canonicalPathname === item.href ||
    canonicalPathname.startsWith(`${item.href}/`);
  const { Icon } = item;
  const ref = useRef<HTMLAnchorElement>(null);
  const href = useLocalizedPath();
  const locale = useLocale();
  const copy = getCommonCopy(locale);
  const itemLabel = copy.links[item.key] ?? copy.labels[item.key] ?? item.key;

  const handleEnter = () => {
    if (collapsed && ref.current) onShowTooltip(ref.current, item);
  };
  const handleLeave = () => {
    if (collapsed) onHideTooltip();
  };

  return (
    <li className="relative">
      <Link
        ref={ref}
        href={href(item.href)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        className={`flex items-center rounded-md transition-colors ${
          collapsed ? "justify-center h-9 mx-0.5" : "gap-3 px-2.5 py-2"
        } ${
          isActive
            ? "bg-canvas-soft text-ink"
            : "text-ink-muted hover:text-ink hover:bg-canvas-soft"
        }`}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? itemLabel : undefined}
        title={collapsed ? undefined : itemLabel}
      >
        <Icon className="shrink-0" />
        {!collapsed && (
          <>
            <span className="text-[13px] flex-1">{itemLabel}</span>
            {item.badge !== undefined && (
              <span className="font-mono text-[10px] tabular-nums text-ink-muted bg-canvas border border-rule rounded-full px-1.5 min-w-[20px] text-center">
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge !== undefined && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent" />
        )}
      </Link>
    </li>
  );
}

function SidebarShell({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={`hidden md:flex h-screen sticky top-0 shrink-0 flex-col bg-canvas border-r border-rule ${
        collapsed ? "w-[60px]" : "w-[232px]"
      }`}
    />
  );
}
