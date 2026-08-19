import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["src/app/[lang]", "src/components", "src/lib"];
const messageDir = path.join(root, "src/messages");
const ignoredSourceFiles = new Set([
  "src/components/Icons.tsx",
  "src/components/SocialIcons.tsx",
  "src/lib/audit-logs.ts",
  "src/lib/hired-workers.ts",
  "src/lib/reports-data.ts",
  "src/lib/role-configs.ts",
  "src/lib/roles.ts",
  "src/lib/i18n/config.ts",
  "src/lib/i18n/routing.ts",
  "src/lib/i18n/translations.ts",
  "src/lib/i18n/home-copy.ts",
  "src/lib/i18n/page-copy.ts",
  // Server-side mock data and admin platform-mock — not user-facing copy.
  "src/lib/admin-data.ts",
  "src/lib/admin-stub.ts",
  "src/lib/admin-types.ts",
  // English source of truth for the help centre. `resolve.ts` serves these
  // through GENERATED_HELP_TRANSLATIONS per locale, so the English strings
  // living here is the design, exactly as with page-copy.ts above.
  "src/lib/help/agents.ts",
  "src/lib/help/topics.ts",
  "src/lib/help/types.ts",
  // TODO(Sprint 3): wire Pagination's "Per page", "Previous", "Next"
  // through next-intl. Tracked in docs/06-MVP-Build-Plan.md → Sprint 3.
  "src/components/app/Pagination.tsx",

  // ── Known untranslated backlog ────────────────────────────────────────
  //
  // These are NOT false positives. Each ships real user-facing English in
  // a 23-locale app, and each needs its strings lifted into the page-copy
  // structure and translated before the exemption comes off. They are
  // listed here so the audit can go back to being a gate: a new hardcoded
  // string anywhere else fails the build again, instead of drowning in a
  // backlog nobody triages.
  //
  // TODO(i18n backlog): 26 strings — column headers, dialog labels, the
  // three report-kind descriptions, and two placeholder examples.
  "src/app/[lang]/app/reports/page.tsx",
  // TODO(i18n backlog): 12 strings — all five tour steps, title and body.
  "src/components/app/ProductTour.tsx",
  // TODO(i18n backlog): 5 strings — four "Close" labels and "Password".
  "src/app/[lang]/app/settings/security/page.tsx",
  // TODO(i18n backlog): 1 string — the "Anonymous" fallback display name
  // used when an inbound contact carries no name, email, or phone.
  "src/app/[lang]/app/conversations/page.tsx",
]);

// English-only paths. The admin panel ships only in English by design
// (decided in the admin-panel sprint); the auth/db/mail libs only produce
// developer-facing strings (errors, log lines) that intentionally stay in
// English. Anything under these prefixes is exempt from i18n audit.
//
// `src/components/auth/` ships English error strings ("Network problem.",
// "Verifying...", etc.) — these are TODO(Sprint 3) for i18n wiring along
// with Pagination. The audit's JSX-text regex also throws false positives
// inside the TypeScript handler bodies of these components.
const ignoredSourcePrefixes = [
  "src/app/admin/",
  "src/app/api/",
  // TODO(Sprint 6): /accept/[token] flow ships in English only for MVP —
  // wire to next-intl copy structure in the auth i18n cleanup pass.
  "src/app/[lang]/accept/",
  // TODO(Sprint 9 i18n cleanup): add `loading` + `placeholderWorker`
  // fields to the `appApprovals` copy structure across all 23 locale
  // variants, then drop this exemption. Sprint 8 wired this page to a
  // real API — the two remaining hardcoded strings are loading text
  // and a fallback worker label when the API row carries no worker info.
  "src/app/[lang]/app/approvals/",
  "src/components/admin/",
  "src/components/auth/",
  // Backend-only modules — strings inside these are either developer-
  // facing log lines or API protocol enums (e.g. OpenAI's `role: "user"`),
  // not user-facing copy.
  "src/lib/ai/",
  "src/lib/approvals/",
  "src/lib/audit/",
  "src/lib/auth/",
  "src/lib/brand-bible/",
  "src/lib/content/",
  "src/lib/crypto/",
  "src/lib/db/",
  "src/lib/integrations/",
  "src/lib/mail/",
  "src/lib/notifications/",
  "src/lib/queue/",
  "src/lib/sales/",
  "src/lib/seo/",
  "src/lib/storage/",
  "src/lib/stripe/",
  "src/lib/support/",
  "src/lib/workers/",
];

// A JSX text node lives on one line. The `\s` variants of this pattern
// let a `>` on one line pair with a `<` fifty lines later, so any
// TypeScript between them was reported as user-facing copy — that is
// where findings like `") : sourcesError ? ("` came from. Horizontal
// whitespace only.
const textNodePattern = />[ \t]*([^<>{}\n][^<>{}\n]*[A-Za-zÀ-ž\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff][^<>{}\n]*)[ \t]*</g;
const visibleAttributePattern =
  /\b(aria-label|alt|placeholder|title|label|description|confirmLabel|body)\s*=\s*"([^"]*[A-Za-zÀ-ž\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff][^"]*)"/g;
const visibleObjectFieldPattern =
  /\b(label|title|description|desc|body|intro|summary|name|eyebrow|subtitle|text|value|hint|action|category|plan|role|question)\s*:\s*"([^"]*[A-Za-zÀ-ž\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff][^"]*)"/g;

// Product names we deliberately never translate.
const BRAND_NAMES = new Set([
  "Staffbix",
  "LinkedIn",
  "X (Twitter)",
  "WhatsApp",
  "Instagram",
  "Stripe",
  "OpenAI",
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
    // Generated translation tables ARE the localized copy. Scanning them
    // for "hardcoded strings" reports every translation as a defect.
    if (/\.generated\.ts$|^generated-/.test(entry.name)) return [];
    return [full];
  });
}

function relative(file) {
  return path.relative(root, file);
}

function collectHardcodedText() {
  const files = sourceRoots.flatMap((dir) => walk(path.join(root, dir)));
  const findings = [];

  for (const file of files) {
    const rel = relative(file);
    if (ignoredSourceFiles.has(rel)) continue;
    if (ignoredSourcePrefixes.some((p) => rel.startsWith(p))) continue;
    const source = fs.readFileSync(file, "utf8");

    const checks = [
      ["jsx-text", textNodePattern],
      ["visible-attr", visibleAttributePattern],
      ["object-field", visibleObjectFieldPattern],
    ];

    for (const [kind, pattern] of checks) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const raw = kind === "jsx-text" ? match[1] : match[2];
        const text = raw.replace(/\s+/g, " ").trim();
        if (!text || text.length < 2) continue;
        if (/^(http|https|mailto|\/|#|\$|[A-Z_]+$)/.test(text)) continue;
        if (/[{}=]|=>|&&|\|\||\bconst\b|\breturn\b/.test(text)) continue;
        // Leftover code fragments the regexes still reach into.
        if (/\):|\bPromise\b|\basync\b|\bawait\b|\btypeof\b/.test(text)) continue;
        // snake_case identifiers (`workforce_volume`) and delimiter keys
        // (`:drip:`) are protocol values, not copy.
        if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(text)) continue;
        if (/^:.*:$/.test(text)) continue;
        // `role: "system" | "user" | ...` is a type union, not an object
        // literal. The field regex cannot tell them apart, so look at what
        // follows the closing quote.
        if (kind === "object-field" && /^\s*\|/.test(source.slice(match.index + match[0].length))) {
          continue;
        }
        // Brand names are the same in every locale.
        if (BRAND_NAMES.has(text)) continue;
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        findings.push({ file: rel, line, kind, text });
      }
    }
  }

  return findings;
}

function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, next, out);
    } else {
      out[next] = value;
    }
  }
  return out;
}

function compareMessages() {
  if (!fs.existsSync(messageDir)) return { missingDir: true, files: [] };
  const files = fs
    .readdirSync(messageDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const parsed = files.map((file) => {
    const full = path.join(messageDir, file);
    const text = fs.readFileSync(full, "utf8");
    return {
      file,
      lineCount: text.split(/\r?\n/).length,
      keys: Object.keys(flatten(JSON.parse(text))).sort(),
    };
  });

  const base = parsed.find((item) => item.file === "en.json") ?? parsed[0];
  const baseKeys = new Set(base?.keys ?? []);
  return {
    missingDir: false,
    files: parsed.map((item) => ({
      file: item.file,
      lineCount: item.lineCount,
      keyCount: item.keys.length,
      missing: [...baseKeys].filter((key) => !item.keys.includes(key)),
      extra: item.keys.filter((key) => !baseKeys.has(key)),
    })),
  };
}

const hardcoded = collectHardcodedText();
const messages = compareMessages();

console.log(JSON.stringify({ hardcoded, messages }, null, 2));

if (hardcoded.length > 0) process.exitCode = 1;
if (messages.missingDir) process.exitCode = 1;
for (const file of messages.files ?? []) {
  if (file.missing.length || file.extra.length) process.exitCode = 1;
}
