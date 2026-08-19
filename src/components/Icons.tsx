import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function IconDashboard(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconWorkforce(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 21v-1.5A4.5 4.5 0 0 1 6.5 15h5A4.5 4.5 0 0 1 16 19.5V21" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.5h2A4 4 0 0 1 22 18.5V20" />
    </svg>
  );
}

export function IconBrandBible(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15.5H5.5A1.5 1.5 0 0 1 4 17V4.5z" />
      <path d="M4 17a1.5 1.5 0 0 0 1.5 1.5H19V21H5.5A1.5 1.5 0 0 1 4 19.5V17z" />
      <path d="M8 7.5h7M8 11h7" />
    </svg>
  );
}

export function IconApprovals(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M21 11.5a9 9 0 1 1-3.5-7.1" />
      <path d="M9 12l3 3 9-9" />
    </svg>
  );
}

export function IconConversations(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M21 12a8 8 0 0 1-12.5 6.6L3 20l1.4-5A8 8 0 1 1 21 12z" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
    </svg>
  );
}

export function IconReports(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M3 20h18" />
      <rect x="5" y="11" width="3" height="8" rx="1" />
      <rect x="10.5" y="6" width="3" height="13" rx="1" />
      <rect x="16" y="13" width="3" height="6" rx="1" />
    </svg>
  );
}

export function IconIntegrations(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M8 2v4M16 2v4" />
      <rect x="5" y="6" width="14" height="9" rx="2" />
      <path d="M10 15v3a2 2 0 0 0 4 0v-3" />
      <path d="M12 22v-1" />
    </svg>
  );
}

export function IconBilling(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

export function IconTeam(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21v-1.5A4.5 4.5 0 0 1 9.5 15h5A4.5 4.5 0 0 1 19 19.5V21" />
    </svg>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.07.07a2 2 0 1 1-2.83 2.83l-.07-.07a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.13-1.56 1.7 1.7 0 0 0-1.87.34l-.07.07a2 2 0 1 1-2.83-2.83l.07-.07A1.7 1.7 0 0 0 4.66 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.66 8.87 1.7 1.7 0 0 0 4.32 7l-.07-.07a2 2 0 1 1 2.83-2.83l.07.07a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.07-.07a2 2 0 1 1 2.83 2.83l-.07.07a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1z" />
    </svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function IconBell(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconArrowRight(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconLogOut(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconMore(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

export function IconLogs(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}

export function IconTrend(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}

export function IconBriefing(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z" />
      <path d="M12 12l9-4.5M12 12v9M12 12L3 7.5" />
    </svg>
  );
}

export function IconHelp(p: IconProps) {
  return (
    <svg {...baseProps} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
