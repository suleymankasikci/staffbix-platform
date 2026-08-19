import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const cachePath = path.join(root, ".i18n-copy-translations.json");
const outputPath = path.join(
  root,
  "src/lib/i18n/generated-copy-translations.ts"
);
const delimiter = "\n<|SBX_I18N|>\n";

const locales = [
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

const googleLocales = {
  tr: "tr",
  de: "de",
  fr: "fr",
  it: "it",
  es: "es",
  pt: "pt",
  zh: "zh-CN",
  ko: "ko",
  ja: "ja",
  ru: "ru",
  ar: "ar",
  uk: "uk",
  th: "th",
  hi: "hi",
  no: "no",
  fi: "fi",
  ms: "ms",
  pl: "pl",
  sv: "sv",
  he: "he",
  da: "da",
  nl: "nl",
};

const preservedValues = new Set([
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
  // Brand + product names — kept in sync with src/lib/i18n/copy-localizer.ts
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
  "staffbix",
  "staffbix/sdk",
  "composer require staffbix/sdk",
  "composer staffbix",
  "go get github.com/staffbix/go-sdk",
]);

/**
 * Asian-language brand romanizations Google produces for "Staffbix"
 * inside larger sentences (where the whole sentence is translated,
 * even when "Staffbix" is in the preserve set — preserve only blocks
 * the standalone token, not when it appears mid-sentence). After each
 * fetch we run a final replace pass to restore the canonical brand.
 */
const BRAND_ROMANIZATIONS = [
  // Japanese
  "スタッフビックス",
  "スタッフビクス",
  "スタッフベックス",
  // Korean
  "스태프빅스",
  "스타프빅스",
  "스태프비크스",
  // Chinese (Simplified)
  "工作人员比克斯",
  "斯塔夫比克斯",
  "工作比克斯",
  // Hindi
  "स्टाफबिक्स",
  "स्टाफिक्स",
  "स्टाफ़बिक्स",
  // Thai
  "สตาฟฟ์บิกซ์",
  "สตาฟบิกซ์",
  // Latin/Cyrillic mis-translations (older cache entries)
  "Personelbix",
  "personalbix",
  "Стаффбикс",
];

function restoreBrand(value) {
  let out = value;
  for (const variant of BRAND_ROMANIZATIONS) {
    if (out.includes(variant)) {
      out = out.split(variant).join("Staffbix");
    }
  }
  return out;
}

const onlyLocales = process.env.I18N_LOCALES
  ? process.env.I18N_LOCALES.split(",").map((item) => item.trim())
  : locales;

function readCache() {
  if (!fs.existsSync(cachePath)) return {};
  return JSON.parse(fs.readFileSync(cachePath, "utf8"));
}

function writeCache(cache) {
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

function evaluateTsFile(file, names) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const sandbox = {
    exports: {},
    require: (id) => {
      if (id.endsWith("/config") || id === "./config") {
        return { DEFAULT_LOCALE: "en" };
      }
      if (id.endsWith("/copy-localizer") || id === "./copy-localizer") {
        return { getCopy: (copies) => copies.en, localizeCopy: (value) => value };
      }
      if (
        id.endsWith("/generated-copy-translations") ||
        id === "./generated-copy-translations"
      ) {
        return { COPY_TRANSLATIONS: {} };
      }
      return {};
    },
    console,
  };

  vm.runInNewContext(
    `${js}\nexports.__picked = {${names
      .map((name) => `${name}: ${name}`)
      .join(",")}};`,
    sandbox
  );
  return sandbox.exports.__picked;
}

function shouldPreserve(value) {
  if (preservedValues.has(value)) return true;
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(value)) return true;
  if (/^[A-Z]{2}$/.test(value)) return true;
  if (/^[\w.-]+@[\w.-]+$/.test(value)) return true;
  if (/^[\w.-]+\.json$/.test(value)) return true;
  if (/^[-+]?\d/.test(value) && !/[A-Za-zÀ-ž]/.test(value)) return true;
  // Code blocks: multi-line + recognizable code starters (see
  // src/lib/i18n/copy-localizer.ts for the mirror logic).
  if (value.includes("\n")) return true;
  if (
    /^(import |const |let |function |class |npm |yarn |pnpm |pip |composer |go get |curl |GET \/|POST \/|PATCH \/|DELETE \/|PUT \/|<script|export )/.test(
      value,
    )
  ) {
    return true;
  }
  if (/\bStaffbix[A-Z]\w*/.test(value)) return true;
  return false;
}

function collectStrings() {
  const pageSource = fs.readFileSync(
    path.join(root, "src/lib/i18n/page-copy.ts"),
    "utf8"
  );
  const pageNames = [...pageSource.matchAll(/^const (\w+) = \{/gm)].map(
    (match) => match[1]
  );
  const pageCopy = evaluateTsFile("src/lib/i18n/page-copy.ts", pageNames);
  const homeCopy = evaluateTsFile("src/lib/i18n/home-copy.ts", ["en"]);
  const commonCopy = evaluateTsFile("src/lib/i18n/translations.ts", ["en"]);
  const strings = new Set();

  function walk(value, pointer) {
    if (typeof value === "string") {
      if (!value || shouldPreserve(value)) return;
      if (pointer.endsWith(".status") && ["available", "q3"].includes(value)) {
        return;
      }
      strings.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${pointer}.${index}`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) =>
        walk(item, pointer ? `${pointer}.${key}` : key)
      );
    }
  }

  for (const [name, object] of Object.entries(pageCopy)) {
    walk(object.en, `page.${name}.en`);
  }
  walk(homeCopy.en, "home.en");
  walk(commonCopy.en, "common.en");
  return [...strings].sort((a, b) => a.localeCompare(b));
}

function request(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          resolve(data);
        });
      })
      .on("error", reject);
  });
}

function translatedTextFromResponse(text) {
  const parsed = JSON.parse(text);
  return (parsed[0] ?? []).map((part) => part[0]).join("");
}

async function translateJoined(locale, texts) {
  const target = googleLocales[locale];
  const query = texts.join(delimiter);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(
    target
  )}&dt=t&q=${encodeURIComponent(query)}`;
  const translated = translatedTextFromResponse(await request(url));
  return translated
    .split(/<\|SBX_I18N\|>/)
    .map((item) => item.replace(/^\s+|\s+$/g, ""));
}

async function translateChunk(locale, texts) {
  const result = await translateJoined(locale, texts);
  if (result.length === texts.length) return result;

  const translated = [];
  for (const text of texts) {
    const single = await translateJoined(locale, [text]);
    translated.push(single[0] ?? text);
  }
  return translated;
}

function chunksBySize(texts, maxLength = 4200) {
  const chunks = [];
  let current = [];
  let length = 0;
  for (const text of texts) {
    const nextLength = length + text.length + delimiter.length;
    if (current.length && nextLength > maxLength) {
      chunks.push(current);
      current = [];
      length = 0;
    }
    current.push(text);
    length += text.length + delimiter.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function writeGenerated(cache, strings) {
  const payload = {};
  for (const locale of locales) {
    payload[locale] = {};
    for (const source of strings) {
      const translated = cache[locale]?.[source];
      if (translated) payload[locale][source] = translated;
    }
  }

  fs.writeFileSync(
    outputPath,
    [
      'import type { Locale } from "./config";',
      "",
      "export const COPY_TRANSLATIONS: Partial<Record<Locale, Record<string, string>>> =",
      `${JSON.stringify(payload, null, 2)} as const;`,
      "",
    ].join("\n")
  );
}

async function main() {
  const strings = collectStrings();
  const cache = readCache();
  console.log(`Collected ${strings.length} unique translatable strings.`);

  for (const locale of onlyLocales) {
    if (!locales.includes(locale)) throw new Error(`Unknown locale: ${locale}`);
    cache[locale] ??= {};
    const missing = strings.filter((text) => !cache[locale][text]);
    const chunks = chunksBySize(missing);
    console.log(`${locale}: ${missing.length} missing in ${chunks.length} chunks`);

    let done = 0;
    for (const chunk of chunks) {
      const translated = await translateChunk(locale, chunk);
      chunk.forEach((source, index) => {
        // restoreBrand reverses any Asian-language romanization Google
        // applied to "Staffbix" mid-sentence ("スタッフビックス" → "Staffbix").
        const raw = translated[index] || source;
        cache[locale][source] = restoreBrand(raw);
      });
      done += chunk.length;
      writeCache(cache);
      writeGenerated(cache, strings);
      console.log(`${locale}: ${done}/${missing.length}`);
    }
  }

  writeCache(cache);
  writeGenerated(cache, strings);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
