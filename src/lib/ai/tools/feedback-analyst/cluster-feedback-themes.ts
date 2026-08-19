import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * cluster_feedback_themes — group a batch of feedback items into
 * themes. Output:
 *   - themes: [{ name, itemCount, sentimentBreakdown, sampleQuotes,
 *     suspectedOwner, isNewThisBatch }]
 *   - unclusteredCount: items the model couldn't bucket
 *   - totalItems
 *
 * Hard rules:
 *   - sampleQuotes are VERBATIM excerpts from the input feedback array,
 *     filtered server-side; the model can never invent a quote.
 *   - suspectedOwner is restricted to operator-supplied ownerTeams.
 */

const MODEL = "gpt-4o-mini";

const SENTIMENT_BUCKETS = ["positive", "neutral", "negative"] as const;
const SOURCES = [
  "support_ticket",
  "nps_survey",
  "app_store_review",
  "trustpilot",
  "social_mention",
  "interview",
  "other",
] as const;

const MIN_ITEMS = 3;
const MAX_ITEMS = 100;
const MAX_ITEM_LEN = 1500;

export const clusterFeedbackThemesTool: Tool = {
  name: "cluster_feedback_themes",
  description:
    "Cluster a batch of feedback items into themes with item counts, sentiment breakdown, verbatim sample quotes, and suspected owner team. Sample quotes are filtered to verbatim input only.",
  parameters: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description:
          "3-100 feedback entries. Each: { id, text, sentiment ('positive'|'neutral'|'negative'), source }.",
        items: { type: "object" },
      },
      ownerTeams: {
        type: "array",
        description:
          "Operator owner teams (e.g., 'product', 'support', 'billing'). suspectedOwner must come from this list.",
        items: { type: "string" },
      },
      maxThemes: {
        type: "integer",
        description: "Max themes to return. Default 8.",
        minimum: 1,
        maximum: 20,
      },
    },
    required: ["items", "ownerTeams"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rawItems = Array.isArray(args.items)
      ? (args.items as Array<Record<string, unknown>>)
      : [];
    const ownerTeams = Array.isArray(args.ownerTeams)
      ? (args.ownerTeams as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 20)
      : [];
    const maxThemes = Math.max(1, Math.min(20, Number(args.maxThemes ?? 8)));

    if (rawItems.length < MIN_ITEMS || rawItems.length > MAX_ITEMS) {
      return {
        ok: false,
        refused: true,
        reason: `items must have ${MIN_ITEMS}-${MAX_ITEMS} entries.`,
      };
    }
    if (ownerTeams.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "ownerTeams required (at least one).",
      };
    }

    const items: Array<{
      id: string;
      text: string;
      sentiment: string;
      source: string;
    }> = [];
    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const id = String(it.id ?? `auto_${i}`).slice(0, 60);
      const text = String(it.text ?? "").trim().slice(0, MAX_ITEM_LEN);
      const sentiment = String(it.sentiment ?? "neutral");
      const source = String(it.source ?? "other");
      if (text.length < 3) {
        return {
          ok: false,
          refused: true,
          reason: `items[${i}].text too short.`,
        };
      }
      if (!(SENTIMENT_BUCKETS as readonly string[]).includes(sentiment)) {
        return {
          ok: false,
          refused: true,
          reason: `items[${i}].sentiment must be one of: ${SENTIMENT_BUCKETS.join(", ")}`,
        };
      }
      if (!(SOURCES as readonly string[]).includes(source)) {
        return {
          ok: false,
          refused: true,
          reason: `items[${i}].source must be one of: ${SOURCES.join(", ")}`,
        };
      }
      items.push({ id, text, sentiment, source });
    }

    const systemPrompt = [
      "You are clustering feedback items into themes.",
      `Output STRICT JSON: { themes, unclusteredCount }. themes: array of EXACTLY up to ${maxThemes} entries.`,
      "Each theme: { name, itemIds, sentimentBreakdown, sampleQuotes, suspectedOwner, isNewThisBatch }.",
      "name: ≤6 words.",
      "itemIds: array of input item ids that belong to this theme.",
      "sentimentBreakdown: { positive, neutral, negative } integer counts.",
      "sampleQuotes: 1-3 verbatim text excerpts from the input items in this theme.",
      `suspectedOwner: one of: ${ownerTeams.join(", ")}. Use the closest match — never invent.`,
      "isNewThisBatch: best-effort boolean — true if you'd guess this didn't show up before.",
      "ABSOLUTE RULES:",
      "  - sampleQuotes MUST be verbatim from items[].text. NEVER summarise / paraphrase / invent.",
      "  - Every theme.itemIds entry MUST exist in input items[].id.",
      "  - Items not matching any theme → leave out + report unclusteredCount.",
    ].join("\n");

    const userContent = items
      .map((it) => `[${it.id}] (${it.sentiment}, ${it.source}) ${it.text}`)
      .join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1800,
        temperature: 0.25,
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

      const itemMap = new Map(items.map((it) => [it.id, it]));
      const idSet = new Set(items.map((it) => it.id));

      const rawThemes = Array.isArray(parsed.themes)
        ? (parsed.themes as Array<Record<string, unknown>>)
        : [];

      const themes = rawThemes.slice(0, maxThemes).map((t) => {
        const validIds = Array.isArray(t.itemIds)
          ? (t.itemIds as string[]).filter((id) => idSet.has(id))
          : [];
        const validTexts = new Set(
          validIds.map((id) => itemMap.get(id)?.text).filter(Boolean),
        );
        const rawQuotes = Array.isArray(t.sampleQuotes)
          ? (t.sampleQuotes as string[])
          : [];
        const sampleQuotes = rawQuotes.filter((q) => validTexts.has(q)).slice(0, 3);

        const sbRaw =
          typeof t.sentimentBreakdown === "object" &&
          t.sentimentBreakdown !== null
            ? (t.sentimentBreakdown as Record<string, unknown>)
            : {};
        const sentimentBreakdown = {
          positive: Math.max(0, Math.round(Number(sbRaw.positive ?? 0))),
          neutral: Math.max(0, Math.round(Number(sbRaw.neutral ?? 0))),
          negative: Math.max(0, Math.round(Number(sbRaw.negative ?? 0))),
        };
        const ownerRaw = typeof t.suspectedOwner === "string"
          ? (t.suspectedOwner as string)
          : "";
        const suspectedOwner = ownerTeams.includes(ownerRaw)
          ? ownerRaw
          : ownerTeams[0];

        return {
          name: typeof t.name === "string" ? t.name : "",
          itemCount: validIds.length,
          itemIds: validIds,
          sentimentBreakdown,
          sampleQuotes,
          suspectedOwner,
          isNewThisBatch: Boolean(t.isNewThisBatch),
        };
      });

      const clusteredIds = new Set(themes.flatMap((t) => t.itemIds));
      const unclusteredCount = items.filter((it) => !clusteredIds.has(it.id)).length;

      await logSecurityEvent({
        kind: "feedback.themes.clustered",
        tenantId: ctx.tenantId,
        payload: {
          subject: "feedback.themes.clustered",
          itemsTotal: items.length,
          themesCount: themes.length,
          unclusteredCount,
          ownerTeamsCount: ownerTeams.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          totalItems: items.length,
          themes,
          unclusteredCount,
          ownerTeams,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Theme clustering failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
