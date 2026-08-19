import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_legal_document — generate a structured first-pass draft of a
 * standard legal document (NDA, MSA, DPA, supplier agreement,
 * employment offer, contractor agreement). The Legal Helper is
 * "Approval required" by default and the tool description hammers
 * home that the operator MUST review with counsel before signing.
 *
 * What we return:
 *   - title
 *   - structuredSections: [{ heading, body }]
 *   - keyTerms: { party, counterparty, effectiveDate, term,
 *       governingLaw, signatures }
 *   - openFields: [strings] — things the operator must fill in
 *   - notLegalAdvice: boilerplate disclaimer (always returned)
 *
 * Brand Bible context pulls in company-specific standards (preferred
 * governing law, indemnity caps, etc.).
 */

const MODEL = "gpt-4o-mini";

const DOC_TYPES = [
  "NDA",
  "MSA",
  "DPA",
  "supplier_agreement",
  "employment_offer",
  "contractor_agreement",
] as const;

const JURISDICTIONS = [
  "US-Delaware",
  "US-California",
  "EU-Germany",
  "EU-Ireland",
  "UK",
  "Türkiye",
  "Switzerland",
  "Canada-Ontario",
  "Australia",
] as const;

const MIN_PARTY_LEN = 2;
const MAX_PARTY_LEN = 200;

export const draftLegalDocumentTool: Tool = {
  name: "draft_legal_document",
  description:
    "Generate a first-pass legal document draft (NDA / MSA / DPA / supplier_agreement / employment_offer / contractor_agreement). NEVER produces a final document — the response is structured for human + counsel review. ALWAYS includes a 'not legal advice' disclaimer. NEVER inserts party signatures or commits the company.",
  parameters: {
    type: "object",
    properties: {
      docType: { type: "string", enum: DOC_TYPES },
      party: {
        type: "string",
        description: "The operator's company / role on the document.",
      },
      counterparty: {
        type: "string",
        description: "The other party's name / entity type.",
      },
      jurisdiction: {
        type: "string",
        enum: JURISDICTIONS,
        description: "Governing law jurisdiction.",
      },
      effectiveDateIso: {
        type: "string",
        description: "ISO YYYY-MM-DD effective date. Optional — omit for 'to be agreed'.",
      },
      termMonths: {
        type: "integer",
        description: "Term length in months. Optional — omit for 'evergreen' / 'until terminated'.",
        minimum: 1,
        maximum: 240,
      },
      specialClauses: {
        type: "array",
        description:
          "Operator-requested non-standard clauses (e.g., 'mutual indemnity cap at $500k', 'right to use logo'). Each ≤200 chars.",
        items: { type: "string" },
      },
    },
    required: ["docType", "party", "counterparty", "jurisdiction"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const docType = String(args.docType);
    const party = String(args.party).trim();
    const counterparty = String(args.counterparty).trim();
    const jurisdiction = String(args.jurisdiction);
    const effectiveDateIso = args.effectiveDateIso
      ? String(args.effectiveDateIso).trim()
      : null;
    const termMonths = args.termMonths ? Number(args.termMonths) : null;
    const specialClauses = Array.isArray(args.specialClauses)
      ? (args.specialClauses as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .map((s) => s.slice(0, 200))
      : [];

    if (!(DOC_TYPES as readonly string[]).includes(docType)) {
      return {
        ok: false,
        refused: true,
        reason: `docType must be one of: ${DOC_TYPES.join(", ")}`,
      };
    }
    if (!(JURISDICTIONS as readonly string[]).includes(jurisdiction)) {
      return {
        ok: false,
        refused: true,
        reason: `jurisdiction must be one of: ${JURISDICTIONS.join(", ")}`,
      };
    }
    if (party.length < MIN_PARTY_LEN || party.length > MAX_PARTY_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `party length must be ${MIN_PARTY_LEN}-${MAX_PARTY_LEN}.`,
      };
    }
    if (counterparty.length < MIN_PARTY_LEN || counterparty.length > MAX_PARTY_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `counterparty length must be ${MIN_PARTY_LEN}-${MAX_PARTY_LEN}.`,
      };
    }
    if (effectiveDateIso && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDateIso)) {
      return {
        ok: false,
        refused: true,
        reason: "effectiveDateIso must be YYYY-MM-DD.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${docType} ${jurisdiction} standard terms`,
      k: 4,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — fall back to plain-vanilla standard terms)";

    const systemPrompt = [
      "You are drafting a first-pass legal document for the operator's review.",
      "You are NOT a lawyer; the document MUST be reviewed by counsel before signing.",
      "Output STRICT JSON: { title, structuredSections, keyTerms, openFields, drafterNotes }.",
      "title: doc title (e.g., 'Mutual Non-Disclosure Agreement').",
      "structuredSections: array of { heading, body }. 5-12 sections appropriate to the doc type. Each body ≤200 words.",
      "keyTerms: { party, counterparty, effectiveDate, term, governingLaw, jurisdictionVenue }. Use the supplied values; if missing put '[TBD]'.",
      "openFields: 2-6 placeholders the operator must fill in BEFORE sending to the counterparty (e.g., 'Schedule A — list of confidential data categories').",
      "drafterNotes: 2-4 bullets calling out the clauses most likely to be negotiated.",
      "DO NOT include 'signature' blocks with names filled in. DO NOT instruct anyone to sign.",
      "Brand Bible context (use to honor company-specific standards):",
      bbBlock,
    ].join("\n");

    const userParts: string[] = [
      `docType: ${docType}`,
      `party: ${party}`,
      `counterparty: ${counterparty}`,
      `jurisdiction: ${jurisdiction}`,
    ];
    if (effectiveDateIso) userParts.push(`effectiveDate: ${effectiveDateIso}`);
    if (termMonths) userParts.push(`termMonths: ${termMonths}`);
    if (specialClauses.length > 0) {
      userParts.push("specialClauses:");
      for (const c of specialClauses) userParts.push(`  - ${c}`);
    }

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts.join("\n") },
        ],
        max_tokens: 1800,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      await recordAiUsage({
        tenantId: ctx.tenantId,
        workerId: ctx.workerId,
        conversationId: ctx.conversationId,
        provider: "openai",
        kind: "chat",
        model: MODEL,
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - t0,
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return { ok: false, refused: true, reason: "Model returned invalid JSON." };
      }

      await logSecurityEvent({
        kind: "legal.document.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "legal.document.drafted",
          docType,
          party,
          counterparty,
          jurisdiction,
          effectiveDateIso,
          termMonths,
          specialClausesCount: specialClauses.length,
          workerId: ctx.workerId,
        },
      });

      const sections = Array.isArray(parsed.structuredSections)
        ? (parsed.structuredSections as Array<Record<string, unknown>>).map((s) => ({
            heading: typeof s.heading === "string" ? s.heading : "",
            body: typeof s.body === "string" ? s.body : "",
          }))
        : [];

      return {
        ok: true,
        data: {
          docType,
          jurisdiction,
          title: typeof parsed.title === "string" ? parsed.title : "",
          structuredSections: sections,
          keyTerms:
            typeof parsed.keyTerms === "object" && parsed.keyTerms !== null
              ? (parsed.keyTerms as Record<string, unknown>)
              : {},
          openFields: Array.isArray(parsed.openFields)
            ? (parsed.openFields as string[])
            : [],
          drafterNotes: Array.isArray(parsed.drafterNotes)
            ? (parsed.drafterNotes as string[])
            : [],
          notLegalAdvice:
            "This is a first-pass draft only. It is NOT legal advice. Have qualified counsel review before signing or sharing.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Draft generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
