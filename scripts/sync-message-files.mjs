import fs from "node:fs";
import path from "node:path";

const locales = [
  "en",
  "tr",
  "de",
  "fr",
  "it",
  "es",
  "pt",
  "zh",
  "ko",
  "ja",
  "ru",
  "ar",
  "uk",
  "th",
  "hi",
  "no",
  "fi",
  "ms",
  "pl",
  "sv",
  "he",
  "da",
  "nl",
];

const root = process.cwd();
const outDir = path.join(root, "src/messages");

const base = {
  meta: {
    generated: "This file is managed by scripts/sync-message-files.mjs.",
    status: "Page copy is being migrated route by route.",
  },
};

const localeStatus = {
  en: "English source copy.",
  tr: "Turkish copy in progress.",
  de: "German copy pending page migration.",
  fr: "French copy pending page migration.",
  it: "Italian copy pending page migration.",
  es: "Spanish copy pending page migration.",
  pt: "Portuguese copy pending page migration.",
  zh: "Simplified Chinese copy pending page migration.",
  ko: "Korean copy pending page migration.",
  ja: "Japanese copy pending page migration.",
  ru: "Russian copy pending page migration.",
  ar: "Arabic copy pending page migration.",
  uk: "Ukrainian copy pending page migration.",
  th: "Thai copy pending page migration.",
  hi: "Hindi copy pending page migration.",
  no: "Norwegian copy pending page migration.",
  fi: "Finnish copy pending page migration.",
  ms: "Malay copy pending page migration.",
  pl: "Polish copy pending page migration.",
  sv: "Swedish copy pending page migration.",
  he: "Hebrew copy pending page migration.",
  da: "Danish copy pending page migration.",
  nl: "Flemish copy pending page migration.",
};

fs.mkdirSync(outDir, { recursive: true });

for (const locale of locales) {
  const payload = {
    ...base,
    meta: {
      ...base.meta,
      locale,
      status: localeStatus[locale],
    },
  };
  fs.writeFileSync(
    path.join(outDir, `${locale}.json`),
    `${JSON.stringify(payload, null, 2)}\n`
  );
}
