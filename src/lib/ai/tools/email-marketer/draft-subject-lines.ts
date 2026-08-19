import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";

/**
 * draft_subject_lines — generate N candidate subject lines for a
 * campaign brief. Used for A/B testing the open-rate before committing
 * to one.
 *
 * This tool makes a *second* OpenAI call (separate from the parent
 * chatReply turn) because the optimal prompt for "punchy 5-7 word
 * email subjects" is very different from a normal conversational
 * reply: more constraint-heavy, shorter context, hotter temperature.
 *
 * The model gets back a JSON array of subject lines; the parent agent
 * can present them to the operator as a multiple-choice or
 * automatically route them through an A/B split.
 *
 * Sprint 29+ wires this into the Approval Center as a comparable
 * choice card — for now the model formats the choices into its reply.
 */

const MODEL = "gpt-4o-mini";

export const draftSubjectLinesTool: Tool = {
  name: "draft_subject_lines",
  description:
    "Generate 3-8 alternative email subject lines for a campaign. Use this BEFORE you finalize an email so the operator can A/B test or choose. Each subject is ≤70 chars, no emojis unless requested, no all-caps, no clickbait.",
  parameters: {
    type: "object",
    properties: {
      briefText: {
        type: "string",
        description: "What the email is about. Be specific about the ONE message it carries.",
      },
      audienceDesc: {
        type: "string",
        description:
          "Who's receiving this? 'Existing customers who bought in the last 90 days', 'cold prospects from LinkedIn', etc.",
      },
      count: {
        type: "integer",
        description: "How many variants. 3-8.",
        minimum: 3,
        maximum: 8,
      },
      tone: {
        type: "string",
        description:
          "Tone hint: 'curiosity', 'urgency', 'plain-talk', 'warm-but-direct', etc.",
      },
      allowEmojis: {
        type: "boolean",
        description: "Whether to permit emojis. Default false (most operators dislike them).",
      },
    },
    required: ["briefText", "audienceDesc", "count"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const briefText = String(args.briefText).trim();
    const audienceDesc = String(args.audienceDesc).trim();
    const count = Math.max(3, Math.min(8, Number(args.count)));
    const tone = args.tone ? String(args.tone).trim() : "warm-but-direct";
    const allowEmojis = Boolean(args.allowEmojis);

    if (briefText.length < 15) {
      return { ok: false, refused: true, reason: "briefText too short — give at least 15 chars of context." };
    }
    if (audienceDesc.length < 5) {
      return { ok: false, refused: true, reason: "audienceDesc too short." };
    }

    const systemPrompt = [
      "You write email subject lines for B2B and DTC SaaS campaigns.",
      `Output exactly ${count} candidates as a JSON array of strings — no prose, no explanation.`,
      "Each subject MUST be ≤70 characters, no all-caps, no exclamation marks, no clickbait phrasing like 'You won't believe…'.",
      allowEmojis ? "One emoji per subject is allowed if it adds meaning." : "Do NOT use any emojis.",
      `Tone target: ${tone}.`,
      `Audience: ${audienceDesc}.`,
    ].join(" ");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Brief:\n${briefText}` },
        ],
        max_tokens: 600,
        temperature: 0.85,
        response_format: { type: "json_object" },
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let subjects: string[] = [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          subjects = parsed.map((s) => String(s));
        } else if (parsed && typeof parsed === "object") {
          // Model sometimes wraps in { subjects: [...] } despite the
          // prompt. Find an array property and take it.
          for (const v of Object.values(parsed as Record<string, unknown>)) {
            if (Array.isArray(v)) {
              subjects = v.map((s) => String(s));
              break;
            }
          }
        }
      } catch {
        return { ok: false, refused: true, reason: "Model returned non-JSON for subjects." };
      }

      const filtered = subjects
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 80)
        .slice(0, count);

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

      if (filtered.length === 0) {
        return {
          ok: false,
          refused: true,
          reason: "Model returned no usable subjects. Retry with a different tone or shorter brief.",
        };
      }

      return {
        ok: true,
        data: {
          subjects: filtered,
          count: filtered.length,
          tone,
          allowEmojis,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Subject generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
