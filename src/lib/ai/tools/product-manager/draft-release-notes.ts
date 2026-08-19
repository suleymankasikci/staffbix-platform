import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_release_notes — produce release notes from a list of shipped
 * items + audience tier. Output JSON:
 *   - headline, audienceTier, highlights, bugFixes, breakingChanges,
 *     oneLineSummary, internalChangelog
 *
 * Two voices in the same call:
 *   - audienceTier='customer' produces plain-English customer notes
 *   - audienceTier='developer' produces a precise changelog with
 *     version bumps and migration tips
 *
 * Tool is NEVER a publishing surface — it returns markdown the
 * operator copies into the appropriate channel (changelog page, email,
 * in-app announcement).
 */

const MODEL = "gpt-4o-mini";

const AUDIENCE_TIERS = ["customer", "developer", "internal"] as const;

const MIN_ITEM_COUNT = 1;
const MAX_ITEM_COUNT = 30;
const MAX_ITEM_LEN = 300;

export const draftReleaseNotesTool: Tool = {
  name: "draft_release_notes",
  description:
    "Draft release notes for a list of shipped items. Returns customer-facing highlights + bug fixes + breaking changes + one-line summary + an internal changelog. Use this every release.",
  parameters: {
    type: "object",
    properties: {
      releaseLabel: {
        type: "string",
        description: "Version / date label (e.g., 'v2.4.0', '2026-05-17').",
      },
      audienceTier: { type: "string", enum: AUDIENCE_TIERS },
      shippedItems: {
        type: "array",
        description:
          "1-30 items shipped this release. Each: '<kind>: <short summary>'. kind ∈ feature, improvement, bugfix, breaking, security.",
        items: { type: "string" },
      },
      knownIssues: {
        type: "array",
        description: "Optional: 0-5 issues operators want to acknowledge.",
        items: { type: "string" },
      },
    },
    required: ["releaseLabel", "audienceTier", "shippedItems"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const releaseLabel = String(args.releaseLabel).trim();
    const audienceTier = String(args.audienceTier);
    const shippedItems = Array.isArray(args.shippedItems)
      ? (args.shippedItems as string[])
          .filter((s) => typeof s === "string" && s.length > 0 && s.length <= MAX_ITEM_LEN)
      : [];
    const knownIssues = Array.isArray(args.knownIssues)
      ? (args.knownIssues as string[])
          .filter((s) => typeof s === "string" && s.length > 0)
          .slice(0, 5)
      : [];

    if (!(AUDIENCE_TIERS as readonly string[]).includes(audienceTier)) {
      return {
        ok: false,
        refused: true,
        reason: `audienceTier must be one of: ${AUDIENCE_TIERS.join(", ")}`,
      };
    }
    if (releaseLabel.length < 2) {
      return { ok: false, refused: true, reason: "releaseLabel too short." };
    }
    if (
      shippedItems.length < MIN_ITEM_COUNT ||
      shippedItems.length > MAX_ITEM_COUNT
    ) {
      return {
        ok: false,
        refused: true,
        reason: `shippedItems must have ${MIN_ITEM_COUNT}-${MAX_ITEM_COUNT} entries.`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `release notes voice changelog ${releaseLabel}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const audienceClause =
      audienceTier === "customer"
        ? "Audience is end customers. Write in plain English. Lead with user benefit, not technical detail. Avoid jargon."
        : audienceTier === "developer"
          ? "Audience is developers integrating the platform. Be precise about behavior changes, version bumps, and migration steps."
          : "Audience is internal staff. Concise + functional. Include workstream tags if obvious.";

    const systemPrompt = [
      "You are drafting release notes for the operator.",
      "Output STRICT JSON: { headline, oneLineSummary, highlights, bugFixes, breakingChanges, knownIssues, internalChangelog, audienceTier }.",
      "headline: ≤14 words.",
      "oneLineSummary: tweet-length summary.",
      "highlights: 1-6 strings — features + improvements worth lead billing.",
      "bugFixes: 0-10 strings — bug fixes phrased as outcomes ('Fixed an issue where …').",
      "breakingChanges: 0-3 strings. EMPTY array unless a shippedItem says 'breaking'.",
      "knownIssues: echo the supplied knownIssues array verbatim.",
      "internalChangelog: markdown string, one line per shippedItem, prefixed with kind tag.",
      "ABSOLUTE RULES:",
      "  - NEVER invent metrics ('30% faster') unless explicit in the shippedItem text.",
      "  - NEVER promise future fixes that aren't in shippedItems.",
      audienceClause,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `releaseLabel: ${releaseLabel}`,
      `audienceTier: ${audienceTier}`,
      "shippedItems:",
      ...shippedItems.map((it) => `  - ${it}`),
      knownIssues.length > 0
        ? `\nknownIssues:\n${knownIssues.map((k) => `  - ${k}`).join("\n")}`
        : "",
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
        max_tokens: 1100,
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

      await logSecurityEvent({
        kind: "pm.release.notes.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "pm.release.notes.drafted",
          releaseLabel,
          audienceTier,
          itemCount: shippedItems.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          releaseLabel,
          audienceTier,
          headline: typeof parsed.headline === "string" ? parsed.headline : "",
          oneLineSummary:
            typeof parsed.oneLineSummary === "string"
              ? parsed.oneLineSummary
              : "",
          highlights: Array.isArray(parsed.highlights)
            ? (parsed.highlights as string[])
            : [],
          bugFixes: Array.isArray(parsed.bugFixes)
            ? (parsed.bugFixes as string[])
            : [],
          breakingChanges: Array.isArray(parsed.breakingChanges)
            ? (parsed.breakingChanges as string[])
            : [],
          knownIssues: Array.isArray(parsed.knownIssues)
            ? (parsed.knownIssues as string[])
            : knownIssues,
          internalChangelog:
            typeof parsed.internalChangelog === "string"
              ? parsed.internalChangelog
              : "",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Release notes draft failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
