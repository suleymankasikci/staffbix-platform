/**
 * Batch translates the help-center source (topics + agent enrichments)
 * from English into every locale we don't author natively (en + tr are
 * the natives). Output lands in `src/lib/help/translations.generated.ts`
 * which `resolve.ts` / `agents.ts` merge against the inline EN + TR
 * content.
 *
 * Idempotent: a JSON cache at `.help-translations.cache.json` saves
 * successful translations keyed by (locale, sha256 of input). Re-running
 * the script only re-translates entries that changed or never ran.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/translate-help-content.mts            # full batch
 *   LOCALES=es,de npx tsx scripts/translate-help-content.mts  # subset
 *   FORCE=1 npx tsx scripts/translate-help-content.mts    # ignore cache
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
import { HELP_TOPICS } from "../src/lib/help/topics";
import { ENRICHMENT } from "../src/lib/help/agents";
import { GENERATED_AGENT_HELP } from "../src/lib/help/agents-enriched.generated";
import { NATIVE_LOCALES } from "../src/lib/help/types";
import { GENERATED_HELP_TRANSLATIONS } from "../src/lib/help/translations.generated";
import type {
  HelpSection,
  LocalizedTopic,
  LocalizedAgent,
} from "../src/lib/help/types";

/* ── Config ─────────────────────────────────────────────────────── */

const MODEL = process.env.HELP_TRANSLATE_MODEL ?? "claude-opus-4-8";
const CACHE_PATH = path.join(process.cwd(), ".help-translations.cache.json");
const OUT_PATH = path.join(
  process.cwd(),
  "src/lib/help/translations.generated.ts",
);
const FORCE = process.env.FORCE === "1";

/** Every Staffbix locale we ship. en + tr are authored inline; the
 *  script translates from EN into the remaining list. */
const ALL_LOCALES = [
  "en", "tr", "de", "fr", "it", "es", "pt", "zh", "ko", "ja",
  "ru", "ar", "uk", "th", "hi", "no", "fi", "ms", "pl", "sv",
  "he", "da", "nl",
] as const;
type Locale = (typeof ALL_LOCALES)[number];

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese (Brazil)",
  zh: "Simplified Chinese",
  ko: "Korean",
  ja: "Japanese",
  ru: "Russian",
  ar: "Arabic",
  uk: "Ukrainian",
  th: "Thai",
  hi: "Hindi",
  no: "Norwegian Bokmål",
  fi: "Finnish",
  ms: "Malay",
  pl: "Polish",
  sv: "Swedish",
  he: "Hebrew",
  da: "Danish",
  nl: "Dutch",
};

/** Subset filter via env var: LOCALES=es,de,fr ... */
const targetLocales: Locale[] = (() => {
  const env = process.env.LOCALES;
  const candidates = ALL_LOCALES.filter(
    (l) => !(NATIVE_LOCALES as ReadonlyArray<string>).includes(l),
  );
  if (!env) return candidates;
  const wanted = new Set(env.split(",").map((s) => s.trim()));
  return candidates.filter((l) => wanted.has(l));
})();

/* ── Cache ──────────────────────────────────────────────────────── */

type CacheEntry = { value: unknown };
type Cache = Record<string, CacheEntry>;

function loadCache(): Cache {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as Cache;
  } catch {
    return {};
  }
}
function saveCache(c: Cache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2));
}
function cacheKey(locale: Locale, kind: string, payload: unknown): string {
  const h = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 12);
  return `${locale}:${kind}:${h}`;
}

const cache = loadCache();

/* ── Translation calls ──────────────────────────────────────────── */

const BRAND_PRESERVE = [
  "Staffbix",
  "Brand Bible",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Stripe",
  "OpenAI",
  "Anthropic",
  "Twilio",
  "Sentry",
  "Shopify",
  "Amazon",
  "eBay",
  "Etsy",
  "Plaid",
  "Tink",
  "Postmark",
  "Resend",
  "Sendgrid",
  "Yandex",
  "Meta",
  "Cloudflare R2",
  "Postgres",
  "Railway",
  "Stripe Connect",
  "GPT-4o",
  "Approval Center",
  "Workforce",
  "Approvals",
];

/**
 * Translate a JSON payload into the target locale. The model returns
 * STRICT JSON matching the input shape; brand names + technical terms
 * preserve verbatim.
 */
async function translateJson(
  payload: unknown,
  locale: Locale,
  contextHint: string,
): Promise<unknown> {
  const system = [
    `You are a professional translator. Translate the user's JSON payload from English into ${LANGUAGE_NAMES[locale]}.`,
    "RULES:",
    "  1. Return STRICT JSON with the IDENTICAL shape — same keys, same array lengths, same nesting.",
    "  2. Translate string VALUES only. Never translate keys.",
    "  3. Preserve the following brand and technical names verbatim:",
    `     ${BRAND_PRESERVE.join(", ")}.`,
    "  4. Preserve placeholders like {count}, {limit}, {current} verbatim — do not translate them.",
    "  5. Preserve product UI labels mentioned in the source (e.g. 'Approval required', 'Auto', 'Suggest') verbatim if they refer to a specific in-app setting. Translate only the surrounding sentence.",
    "  6. Tone: professional, concise, B2B SaaS documentation register — same energy as the English source. Do NOT add disclaimers, marketing fluff, or commentary.",
    "  7. Output ONLY the JSON. No markdown fences, no prose, no notes.",
    `Context for tone calibration: ${contextHint}`,
  ].join("\n");

  // Anthropic Claude. Prefill the assistant turn with "{" so the model
  // emits raw JSON (Claude has no response_format=json_object); we prepend
  // it back and trim any trailing prose before the final brace.
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    temperature: 0.2,
    system,
    messages: [
      { role: "user", content: JSON.stringify(payload) },
      { role: "assistant", content: "{" },
    ],
  });
  const text = res.content[0]?.type === "text" ? res.content[0].text : "";
  let raw = "{" + text;
  const end = raw.lastIndexOf("}");
  if (end !== -1) raw = raw.slice(0, end + 1);
  return JSON.parse(raw);
}

async function translateCached<T>(
  locale: Locale,
  kind: string,
  payload: T,
  contextHint: string,
): Promise<T> {
  const key = cacheKey(locale, kind, payload);
  if (!FORCE && cache[key]) {
    return cache[key].value as T;
  }
  const value = (await translateJson(payload, locale, contextHint)) as T;
  cache[key] = { value };
  saveCache(cache);
  return value;
}

/* ── Topic + Agent translation ─────────────────────────────────── */

interface TopicBundle {
  title: string;
  tagline?: string;
  body: HelpSection[];
}

async function translateTopic(
  slug: string,
  source: TopicBundle,
  locale: Locale,
): Promise<LocalizedTopic> {
  return translateCached<LocalizedTopic>(
    locale,
    `topic:${slug}`,
    source,
    `Help center top-level topic "${slug}".`,
  );
}

async function translateAgent(
  slug: string,
  source: LocalizedAgent,
  locale: Locale,
): Promise<LocalizedAgent> {
  return translateCached<LocalizedAgent>(
    locale,
    `agent:${slug}`,
    source,
    `Per-agent help page for the "${slug}" role.`,
  );
}

interface FallbackTemplate {
  whatItDoes: string; // template like "{title} is part of the {category} group. {summary}"
  brandBibleReq: string;
  channelReq: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  exampleHint: string;
  approvalNote: string;
  tip: string;
}

const EN_FALLBACK_TEMPLATE: FallbackTemplate = {
  whatItDoes:
    "{title} is part of the {category} group. {summary}",
  brandBibleReq:
    "Brand Bible with enough context for the role to answer in your voice.",
  channelReq: "{channel} channel integration (Integrations page).",
  step1: "Add at least one Brand Bible source relevant to {title}.",
  step2: "Connect the channels listed under Required integrations.",
  step3: "Open Workforce → Hire from catalog, pick this role.",
  step4: "Set the worker name, channels, and Approval required mode.",
  step5: "Send a test message and approve the first drafts.",
  exampleHint:
    "Concrete example tasks for this role are added in a future release; in the meantime, treat the role summary as the spec.",
  approvalNote: "Approval required for the first week is recommended.",
  tip:
    "The first week is the calibration period. Edit drafts rather than rejecting them — your edits are how the worker learns.",
};

async function translateFallbackTemplate(
  locale: Locale,
): Promise<FallbackTemplate> {
  return translateCached<FallbackTemplate>(
    locale,
    "fallback-template",
    EN_FALLBACK_TEMPLATE,
    "Templated strings for the per-agent help fallback page. Preserve {title}, {category}, {summary}, {channel} placeholders.",
  );
}

/* ── Main ───────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  // Gather work units.
  const topicsBySlug = new Map<string, TopicBundle>();
  for (const t of HELP_TOPICS) {
    const en = t.content.en;
    if (en) topicsBySlug.set(t.slug, en);
  }

  const agentsBySlug = new Map<string, LocalizedAgent>();
  for (const a of ENRICHMENT) {
    const en = a.content.en;
    if (en) agentsBySlug.set(a.slug, en);
  }
  // Also translate the generated rich content for the other 58 agents, so
  // every one of the 64 roles gets native-language help in all locales.
  for (const [slug, pair] of Object.entries(GENERATED_AGENT_HELP)) {
    if (!agentsBySlug.has(slug) && pair?.en) agentsBySlug.set(slug, pair.en);
  }

  const totalUnits =
    targetLocales.length * (topicsBySlug.size + agentsBySlug.size + 1);
  console.log(
    `[help-translate] ${targetLocales.length} locales × (${topicsBySlug.size} topics + ${agentsBySlug.size} agents + fallback template) = ${totalUnits} translation units`,
  );

  // Resulting nested map: { locale: { topics: {slug: ...}, agents: {slug: ...}, fallback: ... } }
  type LocalePayload = {
    topics: Record<string, LocalizedTopic>;
    agents: Record<string, LocalizedAgent>;
    fallback: FallbackTemplate;
  };
  // Seed from whatever is already generated so a per-locale run (e.g.
  // LOCALES=de) MERGES instead of clobbering the other locales.
  const out: Partial<Record<Locale, LocalePayload>> = {
    ...(GENERATED_HELP_TRANSLATIONS as unknown as Partial<
      Record<Locale, LocalePayload>
    >),
  };

  function persist(): void {
    const body = `// AUTO-GENERATED — do not edit by hand.
//
// Source-of-truth for EN + TR is the authored content in
// \`src/lib/help/topics.ts\` and \`src/lib/help/agents.ts\`. This file
// holds professional LLM translations for the remaining locales,
// produced by \`scripts/translate-help-content.mts\` using
// ${MODEL}. Re-generate via \`npx tsx scripts/translate-help-content.mts\`.

import type {
  LocalizedAgent,
  LocalizedTopic,
} from "./types";
import type { Locale } from "@/lib/i18n/config";

export interface GeneratedHelpFallback {
  whatItDoes: string;
  brandBibleReq: string;
  channelReq: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  exampleHint: string;
  approvalNote: string;
  tip: string;
}

export interface GeneratedLocalePayload {
  topics: Record<string, LocalizedTopic>;
  agents: Record<string, LocalizedAgent>;
  fallback: GeneratedHelpFallback;
}

export const GENERATED_HELP_TRANSLATIONS: Partial<
  Record<Locale, GeneratedLocalePayload>
> = ${JSON.stringify(out, null, 2)};
`;
    fs.writeFileSync(OUT_PATH, body);
  }

  let done = 0;
  for (const locale of targetLocales) {
    const localePayload: LocalePayload = {
      topics: {},
      agents: {},
      fallback: EN_FALLBACK_TEMPLATE,
    };
    for (const [slug, src] of topicsBySlug) {
      localePayload.topics[slug] = await translateTopic(slug, src, locale);
      done++;
      console.log(`  [${done}/${totalUnits}] ${locale} topic ${slug}`);
    }
    for (const [slug, src] of agentsBySlug) {
      localePayload.agents[slug] = await translateAgent(slug, src, locale);
      done++;
      console.log(`  [${done}/${totalUnits}] ${locale} agent ${slug}`);
    }
    localePayload.fallback = await translateFallbackTemplate(locale);
    done++;
    console.log(`  [${done}/${totalUnits}] ${locale} fallback template`);
    out[locale] = localePayload;
    // Persist after each locale so a crash mid-batch keeps finished
    // locales (the per-(locale,hash) cache also makes re-runs cheap).
    persist();
    console.log(`  [persist] ${locale} written`);
  }

  // Final write (no-op beyond the per-locale persists, but ensures the
  // file reflects the full `out` even if targetLocales was empty).
  persist();
  console.log(`[help-translate] wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
