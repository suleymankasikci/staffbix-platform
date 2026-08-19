"use client";

import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { useLocalizedPath } from "@/lib/i18n/client";

export function BrandLogo({ className = "" }: { className?: string }) {
  const href = useLocalizedPath();

  return (
    <Link
      href={href("/")}
      className={`inline-flex items-center gap-2 text-ink ${className}`}
      aria-label={BRAND_NAME}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect x="0" y="2" width="9" height="1.5" fill="currentColor" />
        <rect x="2.5" y="6.25" width="9" height="1.5" fill="currentColor" />
        <rect x="0" y="10.5" width="9" height="1.5" fill="currentColor" />
      </svg>
      <span className="text-[19px] font-medium tracking-[-0.015em]">
        {BRAND_NAME}
      </span>
    </Link>
  );
}
