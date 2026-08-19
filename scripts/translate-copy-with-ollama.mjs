import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const cachePath = path.join(root, ".i18n-copy-translations.json");
const outputPath = path.join(
  root,
  "src/lib/i18n/generated-copy-translations.ts"
);

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

const languageNames = {
  tr: "Turkish",
  de: "German",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
  zh: "Simplified Chinese",
  ko: "Korean",
  ja: "Japanese",
  ru: "Russian",
  ar: "Arabic",
  uk: "Ukrainian",
  th: "Thai",
  hi: "Hindi",
  no: "Norwegian Bokmal",
  fi: "Finnish",
  ms: "Malay",
  pl: "Polish",
  sv: "Swedish",
  he: "Hebrew",
  da: "Danish",
  nl: "Dutch",
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
]);

const model = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const chunkSize = Number(process.env.I18N_CHUNK_SIZE ?? 35);
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
  const strings = new Map();

  function walk(value, pointer) {
    if (typeof value === "string") {
      if (!value || shouldPreserve(value)) return;
      if (pointer.endsWith(".status") && ["available", "q3"].includes(value)) {
        return;
      }
      strings.set(value, {
        text: value,
        refs: [...(strings.get(value)?.refs ?? []), pointer],
      });
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
  return [...strings.keys()].sort((a, b) => a.localeCompare(b));
}

function requestOllama(prompt) {
  const body = JSON.stringify({
    model,
    prompt,
    stream: false,
    format: "json",
    options: { temperature: 0 },
  });

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 11434,
        path: "/api/generate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Ollama HTTP ${res.statusCode}: ${data}`));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.response ?? "");
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error(text);
    return JSON.parse(text.slice(start, end + 1));
  }
}

async function translateChunk(locale, strings) {
  const language = languageNames[locale];
  const payload = Object.fromEntries(strings.map((text, index) => [String(index), text]));
  const prompt = [
    `You are localizing Staffbix SaaS UI copy into ${language}.`,
    "Translate every JSON value from English into the target language.",
    "Return only one valid JSON object with the exact same keys.",
    "Do not translate JSON keys.",
    "Preserve placeholders, numbers, currency amounts, product names, Staffbix, URLs, file names, email addresses, and code-like tokens.",
    "Keep the tone concise and suitable for a professional SaaS interface.",
    `JSON: ${JSON.stringify(payload)}`,
  ].join("\n");

  const raw = await requestOllama(prompt);
  const parsed = parseJsonObject(raw);
  const translated = {};
  for (const [key, source] of Object.entries(payload)) {
    const value = parsed[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Missing translation for ${locale} key ${key}: ${source}`);
    }
    translated[source] = value.trim();
  }
  return translated;
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
    console.log(`${locale}: ${missing.length} missing`);
    for (let index = 0; index < missing.length; index += chunkSize) {
      const chunk = missing.slice(index, index + chunkSize);
      let translated = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          translated = await translateChunk(locale, chunk);
          break;
        } catch (error) {
          console.error(
            `${locale} chunk ${index / chunkSize + 1} attempt ${attempt} failed:`,
            error.message
          );
          if (attempt === 3 && chunk.length > 1) {
            const half = Math.ceil(chunk.length / 2);
            Object.assign(
              cache[locale],
              await translateChunk(locale, chunk.slice(0, half)),
              await translateChunk(locale, chunk.slice(half))
            );
            translated = {};
            break;
          }
          if (attempt === 3) throw error;
        }
      }
      Object.assign(cache[locale], translated);
      writeCache(cache);
      writeGenerated(cache, strings);
      console.log(
        `${locale}: ${Math.min(index + chunk.length, missing.length)}/${missing.length}`
      );
    }
  }

  writeCache(cache);
  writeGenerated(cache, strings);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
