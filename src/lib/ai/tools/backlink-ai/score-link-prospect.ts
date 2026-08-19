import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * score_link_prospect — given a prospect domain + its description +
 * (optional) recent post titles, produce a structured fit score for
 * Backlink AI's daily outreach queue.
 *
 * Output JSON:
 *   - fitScore: 0-100 (composed of topical, authority, voice-fit)
 *   - topicalRelevance: 'low' | 'medium' | 'high'
 *   - redFlags[]: PBN signals, low-quality patterns, spam indicators
 *   - suggestedPitchAngle: 1 sentence pitch hook
 *   - recommendedAction: 'skip' | 'queue' | 'priority'
 *   - confidence: 'low' | 'medium' | 'high'
 *
 * Hard refusal rules:
 *   - domain must look like a domain (no protocol-stripping magic).
 *   - explicit PBN signals (link farm, expired-domain network) yield
 *     recommendedAction='skip' regardless of model output.
 */

const MODEL = "gpt-4o-mini";

const MIN_DOMAIN_LEN = 4;
const MAX_DOMAIN_LEN = 253;
const MIN_DESC_LEN = 20;
const MAX_DESC_LEN = 2500;

// Cheap heuristic flags evaluated server-side. The model gets these
// hints in its system prompt; we also override recommendedAction =
// 'skip' if any of these match.
const HARD_SKIP_PATTERNS = [
  /\bpbn\b/i,
  /private blog network/i,
  /link farm/i,
  /buy backlinks/i,
  /paid links/i,
  /expired domain network/i,
];

export const scoreLinkProspectTool: Tool = {
  name: "score_link_prospect",
  description:
    "Score a link-building prospect for fit, topical relevance, and red flags before queueing outreach. NEVER recommends 'priority' for PBN/link-farm patterns. Always returns a structured recommendation.",
  parameters: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        description: "Bare domain (e.g., 'outsidemagazine.com'). No protocol.",
      },
      description: {
        type: "string",
        description:
          "1-3 sentences about the site — what they cover, audience, posting cadence. Operator-supplied (we do not scrape).",
      },
      recentPostTitles: {
        type: "array",
        description: "Optional: 1-10 recent post titles for topical fit assessment.",
        items: { type: "string" },
      },
      topicAreas: {
        type: "array",
        description:
          "Operator's content beats (e.g., ['outdoor recreation','sustainable manufacturing']). Used to score topical relevance.",
        items: { type: "string" },
      },
    },
    required: ["domain", "description"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rawDomain = String(args.domain).trim().toLowerCase();
    const description = String(args.description).trim();
    const recentPostTitles = Array.isArray(args.recentPostTitles)
      ? (args.recentPostTitles as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];
    const topicAreas = Array.isArray(args.topicAreas)
      ? (args.topicAreas as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 10)
      : [];

    // Strip protocol if accidentally included; reject if it has path.
    const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (
      domain.length < MIN_DOMAIN_LEN ||
      domain.length > MAX_DOMAIN_LEN ||
      !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ||
      domain.includes(" ")
    ) {
      return {
        ok: false,
        refused: true,
        reason:
          "domain must be a bare domain like 'outsidemagazine.com' (no protocol, no path).",
      };
    }
    if (description.length < MIN_DESC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `description too short (need ≥${MIN_DESC_LEN} chars).`,
      };
    }
    if (description.length > MAX_DESC_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `description too long (max ${MAX_DESC_LEN} chars).`,
      };
    }

    const hardSkipMatches = HARD_SKIP_PATTERNS.filter((re) => re.test(description));
    const hardSkipReason = hardSkipMatches.length > 0
      ? `description matched skip pattern: ${hardSkipMatches.map((re) => String(re)).join(", ")}`
      : null;

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `${topicAreas.join(" ")} brand voice link-building beats`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches — score on topical + voice intuition)";

    const systemPrompt = [
      "You are scoring a link-building prospect for the operator's outreach queue.",
      "Output STRICT JSON: { fitScore, topicalRelevance, redFlags, suggestedPitchAngle, recommendedAction, confidence }.",
      "fitScore: integer 0-100. Composed of topical (50%), perceived authority (25%), voice-fit (25%).",
      "topicalRelevance: 'low' | 'medium' | 'high'.",
      "redFlags: 0-5 strings — PBN signals, sponsored-only outlets, irrelevance, voice mismatch.",
      "suggestedPitchAngle: 1 sentence — the hook the operator should lead with. Honest, no fake personalisation.",
      "recommendedAction: 'skip' | 'queue' | 'priority'.",
      "  - skip = do NOT pitch (any red flag of severity high)",
      "  - queue = standard outreach pile",
      "  - priority = top-of-list (high topical fit + low red flags)",
      "confidence: 'low' | 'medium' | 'high'.",
      hardSkipReason
        ? `MANDATORY: recommendedAction must be 'skip' (${hardSkipReason}).`
        : "",
      topicAreas.length > 0 ? `Operator topic areas: ${topicAreas.join(", ")}` : "",
      "Brand Bible context:",
      bbBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const userParts = [
      `domain: ${domain}`,
      `description: ${description}`,
      recentPostTitles.length > 0
        ? `recentPostTitles:\n${recentPostTitles.map((t) => `  - ${t}`).join("\n")}`
        : "",
    ].filter(Boolean);

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts.join("\n") },
        ],
        max_tokens: 600,
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

      const fitScoreRaw = Number(parsed.fitScore);
      const fitScore = Number.isFinite(fitScoreRaw)
        ? Math.max(0, Math.min(100, Math.round(fitScoreRaw)))
        : 0;
      const topicalRelevance =
        typeof parsed.topicalRelevance === "string" &&
        ["low", "medium", "high"].includes(parsed.topicalRelevance as string)
          ? (parsed.topicalRelevance as string)
          : "medium";
      let recommendedAction =
        typeof parsed.recommendedAction === "string" &&
        ["skip", "queue", "priority"].includes(parsed.recommendedAction as string)
          ? (parsed.recommendedAction as string)
          : "queue";
      if (hardSkipReason) recommendedAction = "skip";

      const redFlags = Array.isArray(parsed.redFlags)
        ? (parsed.redFlags as string[])
        : [];
      if (hardSkipReason) redFlags.unshift(hardSkipReason);

      await logSecurityEvent({
        kind: "backlink.prospect.scored",
        tenantId: ctx.tenantId,
        payload: {
          subject: "backlink.prospect.scored",
          domain,
          fitScore,
          topicalRelevance,
          recommendedAction,
          hardSkip: Boolean(hardSkipReason),
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          domain,
          fitScore,
          topicalRelevance,
          redFlags,
          suggestedPitchAngle:
            typeof parsed.suggestedPitchAngle === "string"
              ? parsed.suggestedPitchAngle
              : "",
          recommendedAction,
          hardSkipApplied: Boolean(hardSkipReason),
          confidence:
            typeof parsed.confidence === "string" ? parsed.confidence : "medium",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Scoring failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
