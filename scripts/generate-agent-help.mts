/**
 * Generates rich per-agent help content (EN + TR) for every catalog role
 * that doesn't already have a hand-authored ENRICHMENT entry. Output →
 * `src/lib/help/agents-enriched.generated.ts`, consumed by getAgentHelp.
 *
 * Grounded in each role's catalog row (title/summary/category/channels)
 * AND its real tool set (names + descriptions from the registry), so the
 * guide reflects what the agent can actually do — not a generic template.
 *
 * Idempotent: caches per (slug, locale, hash) in
 * `.agent-help.cache.json`; persists output after each agent so a crash
 * keeps progress. Re-run safely.
 *
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/generate-agent-help.mts            # all missing
 *   AGENTS=recruiter,tutor npx tsx scripts/generate-agent-help.mts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { openai } from "../src/lib/ai/openai";
import { loadCatalogRoles } from "../src/lib/roles-server";
import { ROLE_TOOLS } from "../src/lib/ai/tools/registry";
import { ENRICHMENT } from "../src/lib/help/agents";
import type { LocalizedAgent } from "../src/lib/help/types";

const MODEL = process.env.AGENT_HELP_MODEL ?? "gpt-4o";
const OUT = path.join(process.cwd(), "src/lib/help/agents-enriched.generated.ts");
const CACHE = path.join(process.cwd(), ".agent-help.cache.json");

const cache: Record<string, LocalizedAgent> = fs.existsSync(CACHE)
  ? JSON.parse(fs.readFileSync(CACHE, "utf8"))
  : {};
const saveCache = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));

/** Generate the EN rich help page grounded in the role + its real tools. */
async function genEn(
  role: { slug: string; title: string; summary: string; category: string; channels: string[] },
  tools: { name: string; description: string }[],
): Promise<LocalizedAgent> {
  const key = `en:${crypto.createHash("sha256").update(JSON.stringify({ role, tools, v: 2 })).digest("hex").slice(0, 12)}`;
  if (cache[key]) return cache[key];
  const sys = [
    "You are writing the in-product help page for an AI worker role on the Staffbix platform, in English.",
    "Return STRICT JSON with EXACTLY these keys:",
    "{ title, tagline, whatItDoes (2-3 short paragraph strings), integrationsRequired (string[]), steps (5 ordered string steps to activate), exampleTasks (3-5 concrete tasks this role handles), approvalNote (1 string), tips (2-3 strings) }",
    "Ground every sentence in the role + its ACTUAL tools below — be specific to what these tools do, never generic.",
    "Tone: concise, practical, B2B SaaS docs. Each paragraph/step under 40 words. No marketing fluff.",
    "Preserve product/brand terms verbatim: Staffbix, Brand Bible, Approval Center, WhatsApp, Stripe, Instagram, LinkedIn.",
    "Output ONLY the JSON object.",
  ].join("\n");
  const user = JSON.stringify({
    role: { title: role.title, summary: role.summary, category: role.category, channels: role.channels },
    tools: tools.map((t) => ({ name: t.name, does: t.description })),
  });
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    temperature: 0.3, response_format: { type: "json_object" }, max_tokens: 1400,
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as LocalizedAgent;
  cache[key] = parsed; saveCache();
  return parsed;
}

/** Translate the EN page to Turkish. Direct generation in TR drifted back
 *  to English (the grounding data is English), so we translate the EN
 *  object instead — the same strict-translation approach used for the
 *  other 21 locales, which produces proper Turkish. */
async function transTr(en: LocalizedAgent): Promise<LocalizedAgent> {
  const key = `trx:${crypto.createHash("sha256").update(JSON.stringify(en)).digest("hex").slice(0, 12)}`;
  if (cache[key]) return cache[key];
  const sys = [
    "Translate the user's JSON payload from English into Turkish.",
    "Return STRICT JSON with the IDENTICAL shape — same keys, same array lengths.",
    "Translate string VALUES only; never translate keys. Output ONLY the JSON.",
    "Every string value MUST be natural Turkish — do NOT leave any value in English.",
    "Preserve these terms verbatim: Staffbix, Brand Bible, Approval Center, WhatsApp, Stripe, Instagram, LinkedIn, X.",
    "Tone: professional, concise B2B SaaS documentation Turkish.",
  ].join("\n");
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: sys }, { role: "user", content: JSON.stringify(en) }],
    temperature: 0.2, response_format: { type: "json_object" }, max_tokens: 1600,
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as LocalizedAgent;
  cache[key] = parsed; saveCache();
  return parsed;
}

function persist(out: Record<string, { en: LocalizedAgent; tr: LocalizedAgent }>) {
  const body = `// AUTO-GENERATED — do not edit by hand.
// Rich per-agent help (EN + TR) for catalog roles without a hand-authored
// ENRICHMENT entry. Produced by scripts/generate-agent-help.mts (${MODEL}),
// grounded in each role's catalog row + real tool set. The other 21 locales
// are machine-translated from these via translations.generated.ts.
import type { LocalizedAgent } from "./types";

export const GENERATED_AGENT_HELP: Record<string, { en: LocalizedAgent; tr: LocalizedAgent }> =
${JSON.stringify(out, null, 2)};
`;
  fs.writeFileSync(OUT, body);
}

async function main() {
  const roles = await loadCatalogRoles();
  const enriched = new Set(ENRICHMENT.map((e) => e.slug));
  const filter = process.env.AGENTS?.split(",").map((s) => s.trim());
  const targets = roles.filter(
    (r) => !enriched.has(r.slug) && (!filter || filter.includes(r.slug)),
  );
  // seed from existing output so partial runs merge
  const out: Record<string, { en: LocalizedAgent; tr: LocalizedAgent }> = fs.existsSync(OUT)
    ? (await import(OUT)).GENERATED_AGENT_HELP ?? {}
    : {};

  console.log(`${targets.length} agent için zengin içerik üretiliyor (EN+TR)...`);
  let i = 0;
  for (const role of targets) {
    const tools = (ROLE_TOOLS[role.slug] ?? []).map((t) => ({ name: t.name, description: t.description }));
    const en = await genEn(role, tools);
    const tr = await transTr(en);
    out[role.slug] = { en, tr };
    persist(out);
    i++;
    console.log(`  [${i}/${targets.length}] ${role.slug} ✓`);
  }
  console.log(`Bitti — ${Object.keys(out).length} agent agents-enriched.generated.ts içinde.`);
}
main().catch((e) => { console.error("FATAL:", e instanceof Error ? e.message : e); process.exit(1); });
