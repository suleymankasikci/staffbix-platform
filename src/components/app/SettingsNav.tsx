"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useLocalizedPath } from "@/lib/i18n/client";
import { canonicalizePath } from "@/lib/i18n/routing";
import { getCommonCopy } from "@/lib/i18n/translations";

const TABS = [
  { key: "Profile", href: "/app/settings/profile" },
  { key: "Security", href: "/app/settings/security" },
  { key: "Notifications", href: "/app/settings/notifications" },
  { key: "Language", href: "/app/settings/language" },
];

export function SettingsNav() {
  const locale = useLocale();
  const href = useLocalizedPath();
  const copy = getCommonCopy(locale);
  const pathname = usePathname();
  const canonicalPathname = canonicalizePath(pathname, locale);
  return (
    <nav className="mb-8 border-b border-rule">
      <ul className="flex gap-1 -mb-px overflow-x-auto">
        {TABS.map((t) => {
          const active = canonicalPathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={href(t.href)}
                className={`inline-flex items-center text-[13px] font-medium px-4 py-3 border-b-2 transition-colors ${
                  active
                    ? "text-ink border-ink"
                    : "text-ink-muted border-transparent hover:text-ink"
                }`}
              >
                {copy.links[t.key] ?? copy.labels[t.key] ?? t.key}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
