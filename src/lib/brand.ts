import { LANGUAGES } from "@/lib/i18n/config";

export const BRAND_NAME = "Staffbix";
export const BRAND_VERSION = "v1.0";
export const BRAND_DOMAIN = "staffbix.com";

export const ROLE_COUNT_TOTAL = 60;
export const ROLE_COUNT_AVAILABLE = 18;

export const NAV_LINKS = [
  { key: "Workforce", href: "/workforce" },
  { key: "Pricing", href: "/pricing" },
  { key: "Docs", href: "/docs" },
  { key: "Customers", href: "/customers" },
] as const;

export const FOOTER_LINKS = {
  product: {
    key: "product",
    links: [
      { key: "Workforce", href: "/workforce" },
      { key: "Pricing", href: "/pricing" },
      { key: "Brand Bible", href: "/brand-bible" },
      { key: "Approval Center", href: "/approval-center" },
      { key: "Changelog", href: "/changelog" },
    ],
  },
  developers: {
    key: "developers",
    links: [
      { key: "Docs", href: "/docs" },
      { key: "API reference", href: "/docs/api" },
      { key: "SDKs", href: "/docs/sdks" },
      { key: "Webhooks", href: "/docs/webhooks" },
      { key: "Status", href: "https://status.staffbix.com" },
    ],
  },
  company: {
    key: "company",
    links: [
      { key: "About", href: "/about" },
      { key: "Customers", href: "/customers" },
      { key: "Careers", href: "/careers" },
      { key: "Press", href: "/press" },
      { key: "Contact", href: "/contact" },
    ],
  },
  legal: {
    key: "legal",
    links: [
      { key: "Privacy", href: "/legal/privacy" },
      { key: "Terms", href: "/legal/terms" },
      { key: "Security", href: "/legal/security" },
      { key: "DPA", href: "/legal/dpa" },
      { key: "Cookies", href: "/legal/cookies" },
    ],
  },
} as const;

export const PRIMARY_CTA = { href: "/signup" };
export const SECONDARY_CTA = { href: "#how-it-works" };
export const LOGIN_CTA = { href: "/login" };

export { LANGUAGES } from "@/lib/i18n/config";

export type Language = (typeof LANGUAGES)[number];
