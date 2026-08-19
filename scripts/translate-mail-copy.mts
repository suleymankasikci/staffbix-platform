/**
 * Translates EN_COPY (src/lib/mail/copy.ts) into the other 22 locales and
 * writes src/lib/mail/copy.generated.ts. One gpt-4o call per locale over
 * the whole nested object; {placeholders} and brand terms are preserved.
 *
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/translate-mail-copy.mts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { openai } from "../src/lib/ai/openai";
import { LOCALES } from "../src/lib/i18n/config";
import { EN_COPY, type MailCopy } from "../src/lib/mail/copy";

const MODEL = process.env.MAIL_COPY_MODEL ?? "gpt-4o";
const OUT = path.join(process.cwd(), "src/lib/mail/copy.generated.ts");
const CACHE = path.join(process.cwd(), ".mail-copy.cache.json");

const LANG: Record<string, string> = {
  tr: "Turkish", de: "German", fr: "French", it: "Italian", es: "Spanish",
  pt: "Portuguese", zh: "Simplified Chinese", ko: "Korean", ja: "Japanese",
  ru: "Russian", ar: "Arabic", uk: "Ukrainian", th: "Thai", hi: "Hindi",
  no: "Norwegian", fi: "Finnish", ms: "Malay", pl: "Polish", sv: "Swedish",
  he: "Hebrew", da: "Danish", nl: "Dutch",
};

const cache: Record<string, MailCopy> = fs.existsSync(CACHE)
  ? JSON.parse(fs.readFileSync(CACHE, "utf8"))
  : {};

const enHash = crypto.createHash("sha256").update(JSON.stringify(EN_COPY)).digest("hex").slice(0, 12);

async function translate(locale: string): Promise<MailCopy> {
  const key = `${locale}:${enHash}`;
  if (cache[key]) return cache[key];
  const sys = [
    `Translate the user's JSON payload from English into ${LANG[locale]}.`,
    "Return STRICT JSON with the IDENTICAL shape — same keys, same array lengths, same order.",
    "Translate string VALUES only; never translate or reorder keys.",
    "CRITICAL: keep every {placeholder} token (e.g. {code}, {min}, {tenant}, {inviter}, {role}, {days}, {name}) EXACTLY as-is — do not translate, space, or reorder the braces' contents.",
    "Preserve these brand terms verbatim: Staffbix, Brand Bible, Approval Center, Conversations, Customer Support, WhatsApp, Stripe.",
    "Keep the word 'stop' (the unsubscribe keyword in drip d1) in English.",
    "Tone: professional, warm, concise B2B SaaS product email copy.",
    "Output ONLY the JSON object.",
  ].join("\n");
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: sys }, { role: "user", content: JSON.stringify(EN_COPY) }],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as MailCopy;
  cache[key] = parsed;
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  return parsed;
}

async function main() {
  const targets = LOCALES.filter((l) => l !== "en");
  const out: Record<string, MailCopy> = {};
  console.log(`${targets.length} dile mail copy çevriliyor...`);
  for (const locale of targets) {
    out[locale] = await translate(locale);
    console.log(`  ${locale} ✓`);
  }
  const body = `// AUTO-GENERATED — do not edit by hand.
// Machine-translated mail copy for the 22 non-English locales, produced by
// scripts/translate-mail-copy.mts (${MODEL}) from EN_COPY in ./copy.ts.
import type { Locale } from "@/lib/i18n/config";
import type { MailCopy } from "./copy";

export const GENERATED_MAIL_COPY: Partial<Record<Locale, MailCopy>> =
${JSON.stringify(out, null, 2)};
`;
  fs.writeFileSync(OUT, body);
  console.log(`Bitti — ${targets.length} locale copy.generated.ts içinde.`);
}
main().catch((e) => { console.error("FATAL:", e instanceof Error ? e.message : e); process.exit(1); });
