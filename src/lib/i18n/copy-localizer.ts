import { DEFAULT_LOCALE, type Locale } from "./config";
import { COPY_TRANSLATIONS } from "./generated-copy-translations";

const PRESERVED_VALUES = new Set([
  "available",
  "q3",
  "Email",
  "Slack",
  "Teams",
  "Webhook",
  "USD",
  "EUR",
  "GBP",
  "TRY",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  // Brand + product names — never translate. Google Translate happily
  // turns "Staffbix" into "Personelbix" (tr), "工作人员比克斯" (zh) etc.
  // which destroys brand recognition + SEO. Preserve them verbatim
  // in every locale.
  "Staffbix",
  "Brand Bible",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Twitter",
  "LinkedIn",
  "Stripe",
  "OpenAI",
  "Anthropic",
  "Claude",
  "ChatGPT",
  "Cloudflare",
  "Railway",
  "Postgres",
  "PostgreSQL",
  "Redis",
  "Node.js",
  "TypeScript",
  "Python",
  "PHP",
  "Go",
  "@staffbix/sdk",
  "staffbix.com",
  // Lowercase + package-path variants Google still tries to translate
  "staffbix",
  "staffbix/sdk",
  "composer require staffbix/sdk",
  "composer staffbix",
  "go get github.com/staffbix/go-sdk",
]);

const PRESERVED_ROLE_VALUES = new Set([
  "owner",
  "admin",
  "editor",
  "reviewer",
]);

const PRESERVED_STATUS_VALUES = new Set([
  "active",
  "invited",
  "online",
  "idle",
  "paused",
  "all",
  "available",
  "q3",
]);

function shouldPreserve(value: string, path: string[]) {
  const last = path.at(-1);
  if (
    last &&
    [
      "id",
      "slug",
      "value",
      "code",
      "locale",
      "href",
      "templateSlug",
      "numberLocale",
      "dateLocale",
      "channel",
      "state",
    ].includes(last)
  ) {
    return true;
  }
  if (last === "role" && PRESERVED_ROLE_VALUES.has(value)) return true;
  if (last === "status" && PRESERVED_STATUS_VALUES.has(value)) return true;
  if (path.includes("values")) return true;
  if (path.includes("delivery") && path.includes("channels")) return true;
  if (PRESERVED_VALUES.has(value)) return true;
  if (value === "unlimited") return true;
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(value)) return true;
  if (/^[A-Z]{2}$/.test(value)) return true;
  if (/^[\w.-]+@[\w.-]+$/.test(value)) return true;
  if (/^[\w.-]+\.json$/.test(value)) return true;
  if (/^[-+]?\d/.test(value) && !/[A-Za-zÀ-ž]/.test(value)) return true;
  // Code blocks: multi-line strings or strings starting with "import",
  // "const ", "function ", "npm ", "pip ", "composer ", "go get",
  // "curl ", "<script", "GET /", "POST /" etc. should NEVER be
  // translated — they ARE the code we're documenting.
  if (value.includes("\n")) return true;
  if (
    /^(import |const |let |function |class |npm |yarn |pnpm |pip |composer |go get |curl |GET \/|POST \/|PATCH \/|DELETE \/|PUT \/|<script|export )/.test(
      value,
    )
  ) {
    return true;
  }
  // Any string containing Staffbix-derived TypeScript identifiers
  // (StaffbixError, StaffbixClient, …). Google translates these into
  // ugly transliterations otherwise.
  if (/\bStaffbix[A-Z]\w*/.test(value)) return true;
  return false;
}

function localizeValue(value: string, locale: Locale, path: string[]) {
  if (locale === DEFAULT_LOCALE || shouldPreserve(value, path)) return value;
  return COPY_TRANSLATIONS[locale]?.[value] ?? value;
}

export function localizeCopy<T>(value: T, locale: Locale, path: string[] = []): T {
  if (typeof value === "string") return localizeValue(value, locale, path) as T;
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      localizeCopy(item, locale, [...path, String(index)])
    ) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        localizeCopy(item, locale, [...path, key]),
      ])
    ) as T;
  }
  return value;
}

export function getCopy<T extends { en: unknown }>(
  copies: T,
  locale: Locale
): T[keyof T] {
  const selected = copies[locale as keyof T] ?? copies.en;
  return localizeCopy(selected, locale) as T[keyof T];
}
