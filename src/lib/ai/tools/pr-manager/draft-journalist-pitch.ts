import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_journalist_pitch — write a short, personalised pitch email
 * for a single journalist. Structured output:
 *   { subjectLines: [string, string, string], openingHook, valueProp,
 *     ask, oneSentenceBoilerplate, suggestedAngle, warnings }
 *
 * Three subject lines so the operator can A/B. The ask MUST be
 * specific (a 15-min call, an embargoed sneak-peek, a quote for an
 * upcoming piece, etc.). Pitch types are constrained to the operator's
 * allowed list to honor role-config gates.
 */

const MODEL = "gpt-4o-mini";

const PITCH_TYPES = [
  "product_launch",
  "founder_interview",
  "embargoed_release",
  "expert_quote",
  "trend_commentary",
] as const;

const MIN_PROMPT_LEN = 30;
const MAX_PROMPT_LEN = 4000;

export const draftJournalistPitchTool: Tool = {
  name: "draft_journalist_pitch",
  description:
    "Write a personalised pitch email to a single journalist. Returns 3 subject lines + opening hook + value prop + specific ask + 1-sentence boilerplate. NEVER invents details about the journalist; if the operator hasn't supplied recentCoverage, the pitch keeps that section neutral.",
  parameters: {
    type: "object",
    properties: {
      journalistName: { type: "string" },
      outlet: { type: "string", description: "Publication / outlet name." },
      beat: {
        type: "string",
        description: "The journalist's beat (topic area). 1-5 words.",
      },
      pitchType: { type: "string", enum: PITCH_TYPES },
      storyAngle: {
        type: "string",
        description: "What's the story we want them to write? 1-3 sentences.",
      },
      recentCoverage: {
        type: "string",
        description:
          "Optional: 1-2 sentences about a recent article of theirs. Used to personalize the opening — never invented if absent.",
      },
      ask: {
        type: "string",
        description:
          "What specifically are we asking for? e.g., '15-min intro call', 'embargoed Q&A by Friday'. ≤120 chars.",
      },
    },
    required: ["journalistName", "outlet", "beat", "pitchType", "storyAngle", "ask"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const journalistName = String(args.journalistName).trim();
    const outlet = String(args.outlet).trim();
    const beat = String(args.beat).trim();
    const pitchType = String(args.pitchType);
    const storyAngle = String(args.storyAngle).trim();
    const recentCoverage = args.recentCoverage
      ? String(args.recentCoverage).trim()
      : "";
    const ask = String(args.ask).trim();

    if (!(PITCH_TYPES as readonly string[]).includes(pitchType)) {
      return {
        ok: false,
        refused: true,
        reason: `pitchType must be one of: ${PITCH_TYPES.join(", ")}`,
      };
    }
    if (journalistName.length < 2) {
      return { ok: false, refused: true, reason: "journalistName too short." };
    }
    if (outlet.length < 2) {
      return { ok: false, refused: true, reason: "outlet too short." };
    }
    if (beat.length < 2) {
      return { ok: false, refused: true, reason: "beat too short." };
    }
    if (storyAngle.length < MIN_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `storyAngle too short (need ≥${MIN_PROMPT_LEN} chars).`,
      };
    }
    if (storyAngle.length > MAX_PROMPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `storyAngle too long (max ${MAX_PROMPT_LEN} chars).`,
      };
    }
    if (ask.length < 8 || ask.length > 120) {
      return {
        ok: false,
        refused: true,
        reason: "ask must be 8-120 chars and specific (e.g., '15-min intro call').",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${beat} ${storyAngle}`.slice(0, 400),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — keep boilerplate generic)";

    const personalisationClause = recentCoverage
      ? `Use this recent coverage to personalize the openingHook (do NOT invent details beyond what is supplied here):\n${recentCoverage}`
      : "No recent coverage supplied — keep the openingHook focused on why this story fits their beat, NOT on inventing a reference to a past article.";

    const systemPrompt = [
      "You are writing a journalist pitch email for the operator.",
      "Output STRICT JSON: { subjectLines, openingHook, valueProp, ask, oneSentenceBoilerplate, suggestedAngle, warnings }.",
      "subjectLines: exactly 3 strings, each ≤60 chars. Distinct tones (curiosity, news-hook, value).",
      "openingHook: 1-2 sentences. Reference the beat or supplied recent coverage. Personal, not generic.",
      "valueProp: 2-3 sentences explaining why this matters NOW for the journalist's audience.",
      "ask: 1 sentence — restate the operator's ask cleanly.",
      "oneSentenceBoilerplate: ≤30 words about the company.",
      "suggestedAngle: 1 sentence — the headline you'd love them to take.",
      "warnings: 0-3 strings — risks the operator should know about (e.g., 'journalist is known for being skeptical of vendor pitches').",
      "ABSOLUTE RULES:",
      "  - NEVER invent past coverage details.",
      "  - NEVER claim a relationship (e.g., 'we last spoke') that wasn't in the inputs.",
      "  - NEVER cite metrics that aren't in the storyAngle / Brand Bible.",
      personalisationClause,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `journalistName: ${journalistName}`,
      `outlet: ${outlet}`,
      `beat: ${beat}`,
      `pitchType: ${pitchType}`,
      `ask: ${ask}`,
      "",
      "storyAngle:",
      storyAngle,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 900,
        temperature: 0.35,
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
        kind: "pr.pitch.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "pr.pitch.drafted",
          journalistName,
          outlet,
          beat,
          pitchType,
          hasRecentCoverage: Boolean(recentCoverage),
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          journalistName,
          outlet,
          beat,
          pitchType,
          subjectLines: Array.isArray(parsed.subjectLines)
            ? (parsed.subjectLines as string[]).slice(0, 3)
            : [],
          openingHook:
            typeof parsed.openingHook === "string" ? parsed.openingHook : "",
          valueProp: typeof parsed.valueProp === "string" ? parsed.valueProp : "",
          ask: typeof parsed.ask === "string" ? parsed.ask : ask,
          oneSentenceBoilerplate:
            typeof parsed.oneSentenceBoilerplate === "string"
              ? parsed.oneSentenceBoilerplate
              : "",
          suggestedAngle:
            typeof parsed.suggestedAngle === "string" ? parsed.suggestedAngle : "",
          warnings: Array.isArray(parsed.warnings)
            ? (parsed.warnings as string[])
            : [],
          notForDistribution:
            "Draft only. Operator approval required before sending to the journalist.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Pitch draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
