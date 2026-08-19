import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * draft_show_notes — produce structured show notes from a podcast
 * transcript. Output JSON:
 *   - title, episodeNumber, durationMin
 *   - intro: 2-3 sentence summary
 *   - keyMoments: [{ timestamp, label, summary }]
 *   - linksMentioned: [string] verbatim from transcript
 *   - guestBio: 1-2 sentences
 *   - quotableLines: [string] verbatim (≤140 chars each)
 *   - tags: 3-7 strings
 *
 * The model NEVER invents links or guest credentials not in the
 * provided guest bio / transcript.
 */

const MODEL = "gpt-4o-mini";

const MIN_TRANSCRIPT_LEN = 200;
const MAX_TRANSCRIPT_LEN = 18_000;

export const draftShowNotesTool: Tool = {
  name: "draft_show_notes",
  description:
    "Draft podcast show notes from a transcript: intro, key moments with timestamps, links mentioned (verbatim), guest bio, quotable lines, tags. NEVER invents URLs or guest credentials.",
  parameters: {
    type: "object",
    properties: {
      episodeTitle: { type: "string", description: "Working episode title." },
      episodeNumber: {
        type: "integer",
        description: "Episode number. Optional.",
        minimum: 1,
        maximum: 100_000,
      },
      durationMin: {
        type: "integer",
        description: "Episode duration in minutes.",
        minimum: 1,
        maximum: 480,
      },
      transcript: {
        type: "string",
        description:
          "Episode transcript. Timestamps in [mm:ss] preferred. ≤18,000 chars.",
      },
      guestName: { type: "string" },
      guestRole: { type: "string" },
      guestCompany: { type: "string" },
      knownLinks: {
        type: "array",
        description:
          "Operator-supplied URLs the show notes should include. The model NEVER invents URLs beyond this list.",
        items: { type: "string" },
      },
    },
    required: ["episodeTitle", "transcript", "guestName"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const episodeTitle = String(args.episodeTitle).trim();
    const episodeNumber = args.episodeNumber ? Number(args.episodeNumber) : undefined;
    const durationMin = args.durationMin ? Number(args.durationMin) : undefined;
    const transcript = String(args.transcript);
    const guestName = String(args.guestName).trim();
    const guestRole = args.guestRole ? String(args.guestRole).trim() : "";
    const guestCompany = args.guestCompany ? String(args.guestCompany).trim() : "";
    const knownLinks = Array.isArray(args.knownLinks)
      ? (args.knownLinks as string[])
          .filter((s) => typeof s === "string" && /^https?:\/\//i.test(s))
          .slice(0, 20)
      : [];

    if (episodeTitle.length < 3) {
      return { ok: false, refused: true, reason: "episodeTitle too short." };
    }
    if (guestName.length < 2) {
      return { ok: false, refused: true, reason: "guestName too short." };
    }
    if (transcript.length < MIN_TRANSCRIPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `transcript too short (need ≥${MIN_TRANSCRIPT_LEN} chars).`,
      };
    }
    if (transcript.length > MAX_TRANSCRIPT_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `transcript too long (max ${MAX_TRANSCRIPT_LEN} chars).`,
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `podcast show notes voice ${guestRole} ${guestCompany}`.slice(0, 300),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const linksClause =
      knownLinks.length > 0
        ? `Operator-supplied URLs (the ONLY ones you may include verbatim):\n${knownLinks.map((u) => `  - ${u}`).join("\n")}`
        : "No operator-supplied URLs. linksMentioned should be EMPTY (do not invent any).";

    const systemPrompt = [
      "You are the Podcast Producer drafting show notes from a transcript.",
      "Output STRICT JSON: { title, episodeNumber, durationMin, intro, keyMoments, linksMentioned, guestBio, quotableLines, tags }.",
      "title: echo episodeTitle.",
      "intro: 2-3 sentences — what this episode covers.",
      "keyMoments: 4-8 entries of { timestamp, label, summary }. timestamp must reference a [mm:ss] tag from the transcript when available.",
      "linksMentioned: list only URLs from the operator's knownLinks. EMPTY array if none supplied.",
      "guestBio: 1-2 sentences using ONLY guestName/guestRole/guestCompany supplied.",
      "quotableLines: 2-5 verbatim quotes from the transcript, each ≤140 chars.",
      "tags: 3-7 lowercase, hyphenated topical tags.",
      "ABSOLUTE RULES:",
      "  - NEVER invent guest credentials, employer history, or quotes.",
      "  - NEVER include URLs that aren't in knownLinks.",
      linksClause,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const userContent = [
      `episodeTitle: ${episodeTitle}`,
      episodeNumber ? `episodeNumber: ${episodeNumber}` : "",
      durationMin ? `durationMin: ${durationMin}` : "",
      `guestName: ${guestName}`,
      guestRole ? `guestRole: ${guestRole}` : "",
      guestCompany ? `guestCompany: ${guestCompany}` : "",
      "",
      "transcript:",
      transcript,
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
        max_tokens: 1400,
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

      // Enforce URL whitelist server-side.
      const rawLinks = Array.isArray(parsed.linksMentioned)
        ? (parsed.linksMentioned as string[])
        : [];
      const linksMentioned = rawLinks.filter((u) =>
        knownLinks.some((k) => k === u),
      );

      const rawMoments = Array.isArray(parsed.keyMoments)
        ? (parsed.keyMoments as Array<Record<string, unknown>>)
        : [];
      const keyMoments = rawMoments.map((m) => ({
        timestamp: typeof m.timestamp === "string" ? m.timestamp : "",
        label: typeof m.label === "string" ? m.label : "",
        summary: typeof m.summary === "string" ? m.summary : "",
      }));

      await logSecurityEvent({
        kind: "podcast.shownotes.drafted",
        tenantId: ctx.tenantId,
        payload: {
          subject: "podcast.shownotes.drafted",
          episodeTitle,
          episodeNumber: episodeNumber ?? null,
          guestName,
          keyMomentsCount: keyMoments.length,
          linksDroppedCount: rawLinks.length - linksMentioned.length,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          title: typeof parsed.title === "string" ? parsed.title : episodeTitle,
          episodeNumber: episodeNumber ?? null,
          durationMin: durationMin ?? null,
          intro: typeof parsed.intro === "string" ? parsed.intro : "",
          keyMoments,
          linksMentioned,
          guestBio: typeof parsed.guestBio === "string" ? parsed.guestBio : "",
          quotableLines: Array.isArray(parsed.quotableLines)
            ? (parsed.quotableLines as string[])
            : [],
          tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
          notForPublish:
            "Draft only. Confirm with guest and operator before publishing.",
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Show notes failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
