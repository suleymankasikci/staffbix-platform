import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * coach_sdr — generate written coaching feedback for an SDR/BDR. The
 * operator pastes 2-5 recent outreach examples + names a focus area;
 * the Director returns structured feedback with concrete rewrites.
 *
 * Output JSON:
 *   - overallTone: 1-2 sentences on what works + what doesn't
 *   - focusArea: echo of operator selection
 *   - exampleRewrites: array of { original, rewrite, why }
 *   - drillThisWeek: 1 sentence skill drill
 *   - encouragement: 1 sentence positive note (never sycophantic)
 *   - escalationFlag: true if examples show patterns that need
 *     immediate operator attention (banned phrases, compliance risk)
 */

const MODEL = "gpt-4o-mini";

const FOCUS_AREAS = [
  "tone",
  "timing",
  "personalization",
  "value_prop",
  "qualification",
  "objection_handling",
  "follow_through",
  "ethics_compliance",
] as const;

const MIN_EXAMPLES = 1;
const MAX_EXAMPLES = 5;
const MAX_EXAMPLE_LEN = 2000;

export const coachSdrTool: Tool = {
  name: "coach_sdr",
  description:
    "Generate structured coaching feedback for an SDR/BDR based on 1-5 outreach examples + a chosen focus area. Returns example-by-example rewrites + a one-skill drill for the week. NEVER pretends success rates the examples don't demonstrate.",
  parameters: {
    type: "object",
    properties: {
      sdrName: { type: "string", description: "Name of the rep being coached." },
      focusArea: { type: "string", enum: FOCUS_AREAS },
      outreachExamples: {
        type: "array",
        description: "1-5 actual outreach messages from the rep.",
        items: { type: "string" },
      },
      productContext: {
        type: "string",
        description: "1-3 sentences about what the rep is selling. Optional.",
      },
      knownStrugglePatterns: {
        type: "array",
        description: "Optional: patterns the operator has noticed previously.",
        items: { type: "string" },
      },
    },
    required: ["sdrName", "focusArea", "outreachExamples"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const sdrName = String(args.sdrName).trim();
    const focusArea = String(args.focusArea);
    const outreachExamplesRaw = Array.isArray(args.outreachExamples)
      ? (args.outreachExamples as string[])
      : [];
    const outreachExamples = outreachExamplesRaw
      .filter((s) => typeof s === "string" && s.length > 0)
      .map((s) => s.slice(0, MAX_EXAMPLE_LEN));
    const productContext = args.productContext
      ? String(args.productContext).trim()
      : "";
    const knownStrugglePatterns = Array.isArray(args.knownStrugglePatterns)
      ? (args.knownStrugglePatterns as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];

    if (sdrName.length < 1 || sdrName.length > 80) {
      return {
        ok: false,
        refused: true,
        reason: "sdrName must be 1-80 chars.",
      };
    }
    if (!(FOCUS_AREAS as readonly string[]).includes(focusArea)) {
      return {
        ok: false,
        refused: true,
        reason: `focusArea must be one of: ${FOCUS_AREAS.join(", ")}`,
      };
    }
    if (
      outreachExamples.length < MIN_EXAMPLES ||
      outreachExamples.length > MAX_EXAMPLES
    ) {
      return {
        ok: false,
        refused: true,
        reason: `outreachExamples must have ${MIN_EXAMPLES}-${MAX_EXAMPLES} entries.`,
      };
    }
    if (outreachExamples.some((s) => s.trim().length < 20)) {
      return {
        ok: false,
        refused: true,
        reason: "every outreachExample must be ≥20 chars.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `sdr outbound voice ${focusArea} ${productContext}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — apply common SDR best practices)";

    const systemPrompt = [
      "You are the Sales Director coaching an SDR/BDR.",
      "Output STRICT JSON: { overallTone, focusArea, exampleRewrites, drillThisWeek, encouragement, escalationFlag }.",
      "overallTone: 1-2 sentences — what's working, what isn't.",
      "focusArea: echo the operator-supplied focusArea exactly.",
      "exampleRewrites: array of { original, rewrite, why }. One entry per supplied example. Keep rewrites realistic — not a brand-voice masterpiece, just a clear improvement.",
      "drillThisWeek: 1 sentence — a single deliberate-practice skill drill.",
      "encouragement: 1 sentence specific to what the rep is already doing well.",
      "escalationFlag: true ONLY if examples show banned phrases, compliance violations, or rep is materially misrepresenting the product.",
      "ABSOLUTE RULES:",
      "  - NEVER invent metrics about open rates / reply rates that aren't supplied.",
      "  - Encouragement must reference something specific in the examples, not generic praise.",
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `sdrName: ${sdrName}`,
      `focusArea: ${focusArea}`,
      productContext ? `productContext: ${productContext}` : "",
      knownStrugglePatterns.length > 0
        ? `knownStrugglePatterns:\n${knownStrugglePatterns.map((p) => `  - ${p}`).join("\n")}`
        : "",
      "",
      "outreachExamples:",
      ...outreachExamples.map((e, i) => `--- Example ${i + 1} ---\n${e}`),
    ]
      .filter(Boolean)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1300,
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

      const rewrites = Array.isArray(parsed.exampleRewrites)
        ? (parsed.exampleRewrites as Array<Record<string, unknown>>).map((r) => ({
            original: typeof r.original === "string" ? (r.original as string) : "",
            rewrite: typeof r.rewrite === "string" ? (r.rewrite as string) : "",
            why: typeof r.why === "string" ? (r.why as string) : "",
          }))
        : [];

      await logSecurityEvent({
        kind: "sd.sdr.coached",
        tenantId: ctx.tenantId,
        payload: {
          subject: "sd.sdr.coached",
          sdrName,
          focusArea,
          exampleCount: outreachExamples.length,
          rewriteCount: rewrites.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          sdrName,
          focusArea,
          overallTone:
            typeof parsed.overallTone === "string" ? parsed.overallTone : "",
          exampleRewrites: rewrites,
          drillThisWeek:
            typeof parsed.drillThisWeek === "string"
              ? parsed.drillThisWeek
              : "",
          encouragement:
            typeof parsed.encouragement === "string" ? parsed.encouragement : "",
          escalationFlag: Boolean(parsed.escalationFlag),
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Coaching failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
