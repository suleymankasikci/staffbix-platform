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
  // TODO(Sprint 3): wire Pagination's "Per page", "Previous", "Next"
  // through next-intl. Tracked in docs/06-MVP-Build-Plan.md → Sprint 3.
  "src/components/app/Pagination.tsx",
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

const textNodePattern = />\s*([^<>{}\n][^<>{}]*[A-Za-zÀ-ž\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff][^<>{}]*)\s*</g;
const visibleAttributePattern =
  /\b(aria-label|alt|placeholder|title|label|description|confirmLabel|body)\s*=\s*"([^"]*[A-Za-zÀ-ž\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff][^"]*)"/g;
const visibleObjectFieldPattern =
  /\b(label|title|description|desc|body|intro|summary|name|eyebrow|subtitle|text|value|hint|action|category|plan|role|question)\s*:\s*"([^"]*[A-Za-zÀ-ž\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff][^"]*)"/g;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
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
