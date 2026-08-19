import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { seoAudits } from "../db/schema";
import { openai } from "../ai/openai";
import { recordAiUsage } from "../ai/usage";
import { searchBrandBible } from "../ai/retrieve";

/**
 * SEO audit: fetch a URL, extract its text, ask the model for a
 * structured audit grounded in the tenant's Brand Bible.
 *
 * Output shape (stored in `seo_audits.result`):
 *   {
 *     summary: string,
 *     suggestedTitle: string,
 *     suggestedMetaDescription: string,
 *     voiceCritique: string,
 *     topFixes: [ { priority: 'high'|'medium'|'low', what: string, why: string } ],
 *     brandBibleAlignment: { score: 0..1, notes: string },
 *   }
 *
 * Audit run lifecycle: fetching → analyzing → ready / failed. The web
 * fetch is bounded to 5s and 200KB; longer pages are truncated.
 */

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 200_000;
const MODEL = "gpt-4o-mini" as const; // tier-appropriate; switch to gpt-4o for Scale plans (Sprint 11)

export interface SeoAuditResult {
  summary: string;
  suggestedTitle: string;
  suggestedMetaDescription: string;
  voiceCritique: string;
  topFixes: Array<{
    priority: "high" | "medium" | "low";
    what: string;
    why: string;
  }>;
  brandBibleAlignment: {
    score: number;
    notes: string;
  };
}

export interface RunAuditArgs {
  auditId: string;
  tenantId: string;
  /** Test override for the fetch — used by audit fixtures. */
  fetchImpl?: typeof fetch;
}

export async function runSeoAudit(args: RunAuditArgs): Promise<SeoAuditResult> {
  const [row] = await db
    .select()
    .from(seoAudits)
    .where(eq(seoAudits.id, args.auditId))
    .limit(1);
  if (!row) throw new Error(`audit ${args.auditId} not found`);
  if (row.tenantId !== args.tenantId) throw new Error("tenant mismatch on audit");

  try {
    // Step 1: fetch
    await db
      .update(seoAudits)
      .set({ status: "fetching", updatedAt: new Date(), errorMessage: null })
      .where(eq(seoAudits.id, row.id));

    const f = args.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let html: string;
    let status: number;
    try {
      const res = await f(row.url, {
        signal: controller.signal,
        headers: {
          // Identify ourselves so site operators can attribute traffic.
          "User-Agent":
            "StaffbixSEOBot/1.0 (+https://staffbix.com/bots/seo)",
        },
      });
      status = res.status;
      // Truncate to bound memory/tokens
      const reader = res.body?.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (received >= MAX_HTML_BYTES) {
              try {
                await reader.cancel();
              } catch {
                /* noop */
              }
              break;
            }
          }
        }
      }
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      html = buf.toString("utf8").slice(0, MAX_HTML_BYTES);
    } finally {
      clearTimeout(timer);
    }

    const text = extractText(html);
    await db
      .update(seoAudits)
      .set({
        fetchedHtml: html.slice(0, MAX_HTML_BYTES),
        fetchedText: text,
        fetchStatus: status,
        status: "analyzing",
        updatedAt: new Date(),
      })
      .where(eq(seoAudits.id, row.id));

    if (status >= 400) {
      throw new Error(`fetch returned HTTP ${status}`);
    }
    if (text.trim().length < 30) {
      throw new Error("fetched body has no meaningful text content");
    }

    // Step 2: pull Brand Bible context relevant to the page
    const bbHits = await searchBrandBible({
      tenantId: row.tenantId,
      query: text.slice(0, 1500),
      k: 4,
    });
    const brandBibleBlock =
      bbHits.length > 0
        ? bbHits.map((h) => `- ${h.content.slice(0, 400)}`).join("\n\n")
        : "(No Brand Bible content available — note this in the critique.)";

    // Step 3: run the audit
    const systemPrompt = `You are an SEO + brand-voice auditor for the tenant on the Staffbix platform.

Brand Bible excerpts (the SOURCE OF TRUTH for voice and facts):
${brandBibleBlock}

Audit rules:
- Never invent product names, prices, hours, or policies. Use only what the Brand Bible above states.
- Be specific. "Improve the title" is useless. "Title should lead with the customer benefit, not the brand name" is useful.
- topFixes: 3-6 items, sorted by impact. priority must be 'high', 'medium', or 'low'.
- brandBibleAlignment.score: 0 (totally off-brand) to 1 (perfect fit). Be honest, not generous.

Output strict JSON in this shape and nothing else:
{
  "summary": string,
  "suggestedTitle": string,
  "suggestedMetaDescription": string,
  "voiceCritique": string,
  "topFixes": [{ "priority": "high"|"medium"|"low", "what": string, "why": string }],
  "brandBibleAlignment": { "score": number, "notes": string }
}`;

    const userMessage = `URL: ${row.url}

Page text (truncated to 8000 chars):
${text.slice(0, 8000)}`;

    const t0 = Date.now();
    let usage = { prompt: 0, completion: 0 };
    let errorCode: string | null = null;
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1200,
      });
      usage = {
        prompt: completion.usage?.prompt_tokens ?? 0,
        completion: completion.usage?.completion_tokens ?? 0,
      };
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as SeoAuditResult;
      validate(parsed);

      await recordAiUsage({
        tenantId: row.tenantId,
        workerId: row.workerId ?? null,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: usage.prompt,
        completionTokens: usage.completion,
        latencyMs: Date.now() - t0,
      });

      await db
        .update(seoAudits)
        .set({
          result: parsed,
          status: "ready",
          updatedAt: new Date(),
          errorMessage: null,
        })
        .where(eq(seoAudits.id, row.id));

      return parsed;
    } catch (err) {
      errorCode =
        (err as { code?: string; status?: number }).code ??
        String((err as { status?: number }).status ?? "unknown");
      await recordAiUsage({
        tenantId: row.tenantId,
        workerId: row.workerId ?? null,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: usage.prompt,
        completionTokens: usage.completion,
        latencyMs: Date.now() - t0,
        errorCode,
      });
      throw err;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(seoAudits)
      .set({
        status: "failed",
        errorMessage: msg.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(seoAudits.id, row.id));
    throw err;
  }
}

/**
 * Strip tags, comments, scripts, styles. Not a full HTML parser — just
 * enough to give the LLM the page's words without a wall of `<div>` noise.
 */
function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function validate(obj: unknown): asserts obj is SeoAuditResult {
  const o = obj as Record<string, unknown>;
  if (typeof o?.summary !== "string") throw new Error("audit: missing summary");
  if (typeof o?.suggestedTitle !== "string") throw new Error("audit: missing suggestedTitle");
  if (typeof o?.suggestedMetaDescription !== "string") throw new Error("audit: missing suggestedMetaDescription");
  if (typeof o?.voiceCritique !== "string") throw new Error("audit: missing voiceCritique");
  if (!Array.isArray(o?.topFixes)) throw new Error("audit: topFixes must be array");
  if (typeof o?.brandBibleAlignment !== "object" || o.brandBibleAlignment === null)
    throw new Error("audit: missing brandBibleAlignment");
}
