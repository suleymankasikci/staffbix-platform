import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * propose_brand_bible_update — given a recurring pattern the operator
 * has observed (or that the Brand Manager has surfaced via repeated
 * score_voice_match drifts), propose a Brand Bible amendment.
 *
 * Output JSON:
 *   - proposedSection: { title, body }
 *   - kind: 'addition' | 'amendment' | 'clarification' | 'removal'
 *   - rationale: 1-2 sentences
 *   - evidenceCitations: array of { chunkId, excerpt } — exactly what
 *     in the existing Brand Bible motivates the change
 *   - confidence: 'low' | 'medium' | 'high'
 *   - openQuestions: 0-3 strings the operator must answer
 *
 * The Brand Manager NEVER writes the update directly — this surfaces
 * a draft for operator approval. The downstream `propose_kb_update`
 * tool (KB Editor's surface) handles persistence once approved.
 */

const MODEL = "gpt-4o-mini";

const KINDS = ["addition", "amendment", "clarification", "removal"] as const;

const MIN_PATTERN_LEN = 30;
const MAX_PATTERN_LEN = 3000;

export const proposeBrandBibleUpdateTool: Tool = {
  name: "propose_brand_bible_update",
  description:
    "Draft a Brand Bible amendment based on a recurring pattern. Returns proposed section, kind (addition/amendment/clarification/removal), rationale, evidence citations, confidence. Suggestion only — never writes to the Brand Bible directly.",
  parameters: {
    type: "object",
    properties: {
      observedPattern: {
        type: "string",
        description: "What pattern keeps showing up? 2-5 sentences with examples.",
      },
      proposedKind: { type: "string", enum: KINDS },
      sourceWorkerSlugs: {
        type: "array",
        description: "Optional: which worker roles surfaced this pattern.",
        items: { type: "string" },
      },
    },
    required: ["observedPattern", "proposedKind"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const observedPattern = String(args.observedPattern).trim();
    const proposedKind = String(args.proposedKind);
    const sourceWorkerSlugs = Array.isArray(args.sourceWorkerSlugs)
      ? (args.sourceWorkerSlugs as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 20)
      : [];

    if (!(KINDS as readonly string[]).includes(proposedKind)) {
      return {
        ok: false,
        refused: true,
        reason: `proposedKind must be one of: ${KINDS.join(", ")}`,
      };
    }
    if (observedPattern.length < MIN_PATTERN_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `observedPattern too short (need ≥${MIN_PATTERN_LEN} chars).`,
      };
    }
    if (observedPattern.length > MAX_PATTERN_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `observedPattern too long (max ${MAX_PATTERN_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: observedPattern.slice(0, 400),
      k: 5,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits
            .map((h, i) => `[BB${i + 1} · id=${h.chunkId} · ${h.sourceTitle}]\n${h.content}`)
            .join("\n\n")
        : "(no Brand Bible matches — the proposal is an 'addition' regardless of proposedKind)";

    const finalKind = hits.length === 0 ? "addition" : proposedKind;

    const systemPrompt = [
      "You are the Brand Manager drafting a Brand Bible amendment for operator review.",
      "Output STRICT JSON: { proposedSection, kind, rationale, evidenceCitations, openQuestions, confidence }.",
      "proposedSection: { title (≤60 chars), body (≤300 words markdown) }.",
      "kind: 'addition' | 'amendment' | 'clarification' | 'removal'. Honor proposedKind unless Brand Bible is empty (then 'addition').",
      "rationale: 1-2 sentences — why this change matters.",
      "evidenceCitations: 0-4 entries of { chunkId, excerpt }. Use the BB chunk ids supplied. Each excerpt ≤150 chars and verbatim from the chunk.",
      "openQuestions: 0-3 things the operator must decide before this lands.",
      "confidence: 'low' | 'medium' | 'high'.",
      "ABSOLUTE RULES:",
      "  - DO NOT fabricate evidenceCitations or paraphrase them.",
      "  - DO NOT recommend 'removal' without a clear excerpt to remove.",
      `Operator's proposedKind: ${proposedKind}.${hits.length === 0 ? " (Overridden to 'addition' — no Brand Bible content yet.)" : ""}`,
      "Brand Bible context (current state):",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: observedPattern },
        ],
        max_tokens: 900,
        temperature: 0.3,
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

      const allowedChunkIds = new Set(hits.map((h) => h.chunkId));
      const rawCitations = Array.isArray(parsed.evidenceCitations)
        ? (parsed.evidenceCitations as Array<Record<string, unknown>>)
        : [];
      const evidenceCitations = rawCitations
        .map((c) => ({
          chunkId: typeof c.chunkId === "string" ? (c.chunkId as string) : "",
          excerpt: typeof c.excerpt === "string" ? (c.excerpt as string) : "",
        }))
        .filter((c) => allowedChunkIds.has(c.chunkId));

      await logSecurityEvent({
        kind: "brand.update.proposed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "brand.update.proposed",
          kind: finalKind,
          patternPreview: observedPattern.slice(0, 160),
          sourceWorkerSlugs,
          evidenceCount: evidenceCitations.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          kind: finalKind,
          proposedSection:
            typeof parsed.proposedSection === "object" && parsed.proposedSection !== null
              ? (parsed.proposedSection as Record<string, unknown>)
              : {},
          rationale:
            typeof parsed.rationale === "string" ? parsed.rationale : "",
          evidenceCitations,
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[])
            : [],
          confidence:
            typeof parsed.confidence === "string"
              ? (parsed.confidence as string)
              : "medium",
          notForPersistence:
            "Proposal only. Use propose_kb_update to stage the operator-approved change for the KB Editor's review queue.",
          brandBibleChunkIdsConsidered: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Brand update proposal failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
