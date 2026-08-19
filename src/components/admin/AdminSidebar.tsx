"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconWorkforce,
  IconBilling,
  IconReports,
  IconIntegrations,
  IconSettings,
  IconChevronLeft,
  IconLogOut,
  IconLogs,
  IconHelp,
  IconTeam,
  IconBrandBible,
  IconConversations,
  IconApprovals,
} from "@/components/Icons";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  label: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
};

const OVERVIEW: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", Icon: IconDashboard },
];

const CUSTOMER_OPS: NavItem[] = [
  { label: "Tenants", href: "/admin/tenants", Icon: IconWorkforce, badge: 12 },
  { label: "Users", href: "/admin/users", Icon: IconTeam },
  { label: "Support", href: "/admin/support", Icon: IconConversations, badge: 6 },
];

const PLATFORM: NavItem[] = [
  { label: "Plans", href: "/admin/plans", Icon: IconBilling },
  { label: "Catalog", href: "/admin/catalog", Icon: IconBrandBible },
  { label: "Integrations", href: "/admin/integrations", Icon: IconIntegrations },
  { label: "Announcements", href: "/admin/announcements", Icon: IconApprovals },
];

const FINANCE: NavItem[] = [
  { label: "Billing", href: "/admin/billing", Icon: IconBilling },
  { label: "Reports", href: "/admin/reports", Icon: IconReports },
];

const SYSTEM: NavItem[] = [
  { label: "Audit log", href: "/admin/audit", Icon: IconLogs },
  { label: "Staff", href: "/admin/team", Icon: IconTeam },
  { label: "Settings", href: "/admin/settings", Icon: IconSettings },
  { label: "Help", href: "/admin/help", Icon: IconHelp },
];

const STORAGE_KEY = "staffbix.admin.sidebar.collapsed";

type TooltipState = { label: string; badge?: number; x: number; y: number };

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const logoutRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setMounted(true);
  }, []);

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

  useEffect(() => {
    setTooltip(null);
  }, [pathname, collapsed]);

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
      label: item.label,
      badge: item.badge,
      x: r.right + 10,
      y: r.top + r.height / 2,
    });
  }

  if (!mounted) {
    return (
      <aside
        className={`hidden md:flex h-screen sticky top-0 shrink-0 flex-col bg-[#0F1115] border-r border-white/10 ${
          collapsed ? "w-[60px]" : "w-[232px]"
        }`}
      />
    );
  }

  return (
    <>
      <aside
        className={`hidden md:flex h-screen sticky top-0 shrink-0 flex-col bg-[#0F1115] text-white/85 border-r border-white/10 transition-[width] duration-200 ease-out ${
          collapsed ? "w-[60px]" : "w-[232px]"
        }`}
        aria-label="Admin navigation"
      >
        <header
          className={`flex items-center h-16 border-b border-white/10 ${
            collapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={toggle}
              aria-label="Expand sidebar"
              title="Expand"
              className="inline-flex items-center justify-center size-9 rounded-md border border-white/15 text-white/70 hover:text-white hover:bg-white/5 hover:border-white/30 transition-colors"
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
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 text-white"
                aria-label="Staffbix Admin"
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
                  Staffbix
                </span>
                <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F97316] border border-[#F97316]/40 rounded px-1.5 py-0.5">
                  Admin
                </span>
              </Link>
              <button
                type="button"
                onClick={toggle}
                aria-label="Collapse sidebar"
                title="Collapse"
                className="inline-flex items-center justify-center size-7 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition-colors"
              >
                <IconChevronLeft />
              </button>
            </>
          )}
        </header>

        <nav className="flex-1 overflow-y-auto py-4">
          <NavGroup label="Overview" items={OVERVIEW} collapsed={collapsed} pathname={pathname} onShow={showTooltip} onHide={() => setTooltip(null)} />
          <Divider collapsed={collapsed} />
          <NavGroup label="Customers" items={CUSTOMER_OPS} collapsed={collapsed} pathname={pathname} onShow={showTooltip} onHide={() => setTooltip(null)} />
          <Divider collapsed={collapsed} />
          <NavGroup label="Platform" items={PLATFORM} collapsed={collapsed} pathname={pathname} onShow={showTooltip} onHide={() => setTooltip(null)} />
          <Divider collapsed={collapsed} />
          <NavGroup label="Finance" items={FINANCE} collapsed={collapsed} pathname={pathname} onShow={showTooltip} onHide={() => setTooltip(null)} />
          <Divider collapsed={collapsed} />
          <NavGroup label="System" items={SYSTEM} collapsed={collapsed} pathname={pathname} onShow={showTooltip} onHide={() => setTooltip(null)} />
        </nav>

        <footer className={`border-t border-white/10 py-3 ${collapsed ? "px-2" : "px-3"}`}>
          {collapsed ? (
            <Link
              ref={logoutRef}
              href="/admin/login"
              onMouseEnter={() => {
                if (logoutRef.current) {
                  const r = logoutRef.current.getBoundingClientRect();
                  setTooltip({ label: "Log out", x: r.right + 10, y: r.top + r.height / 2 });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
              className="flex items-center justify-center h-9 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Log out"
            >
              <IconLogOut />
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="flex items-center gap-3 px-2 py-2 rounded-md text-white/55 hover:text-white hover:bg-white/5 transition-colors"
            >
              <IconLogOut />
              <span className="text-[13px]">Log out</span>
            </Link>
          )}
        </footer>
      </aside>

      {collapsed && tooltip && (
        <div
          role="tooltip"
          style={{ position: "fixed", left: tooltip.x, top: tooltip.y, transform: "translateY(-50%)" }}
          className="pointer-events-none z-[60] whitespace-nowrap px-2.5 py-1.5 rounded-md bg-white text-[#0F1115] text-[12px] font-medium shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]"
        >
          {tooltip.label}
          {tooltip.badge !== undefined && (
            <span className="ml-1.5 font-mono text-[10px] text-[#0F1115]/55">
              {tooltip.badge}
            </span>
          )}
        </div>
      )}
    </>
  );
}

function NavGroup({
  label,
  items,
  collapsed,
  pathname,
  onShow,
  onHide,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
  onShow: (el: HTMLElement, item: NavItem) => void;
  onHide: () => void;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35 px-4 mb-2.5">
          {label}
        </p>
      )}
      <ul className="flex flex-col gap-0.5 px-2">
        {items.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} onShow={onShow} onHide={onHide} />
        ))}
      </ul>
    </div>
  );
}

function NavLink({
  item,
  collapsed,
  pathname,
  onShow,
  onHide,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  onShow: (el: HTMLElement, item: NavItem) => void;
  onHide: () => void;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const { Icon } = item;
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <li className="relative">
      <Link
        ref={ref}
        href={item.href}
        onMouseEnter={() => collapsed && ref.current && onShow(ref.current, item)}
        onMouseLeave={() => collapsed && onHide()}
        onFocus={() => collapsed && ref.current && onShow(ref.current, item)}
        onBlur={() => collapsed && onHide()}
        className={`flex items-center rounded-md transition-colors ${
          collapsed ? "justify-center h-9 mx-0.5" : "gap-3 px-2.5 py-2"
        } ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/55 hover:text-white hover:bg-white/5"
        }`}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? undefined : item.label}
      >
        <Icon className="shrink-0" />
        {!collapsed && (
          <>
            <span className="text-[13px] flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="font-mono text-[10px] tabular-nums text-white/65 bg-white/10 border border-white/15 rounded-full px-1.5 min-w-[20px] text-center">
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge !== undefined && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[#F97316]" />
        )}
      </Link>
    </li>
  );
}

function Divider({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={collapsed ? "my-3 mx-2 border-t border-white/10" : "my-3 mx-4 border-t border-white/10"}
    />
  );
}
