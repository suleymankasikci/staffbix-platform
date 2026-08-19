import type { Tool } from "../types";
import { openai } from "@/lib/ai/openai";
import { recordAiUsage } from "@/lib/ai/usage";
import { searchBrandBible } from "@/lib/ai/retrieve";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * recommend_local_options — produce 1-5 recommendations for a guest's
 * request (dining, activity, transfer, shopping). Operator-supplied
 * partner venues get priority + EXPLICIT disclosure ("we have an
 * arrangement"). Non-partner options are clearly labelled.
 *
 * Hard rules:
 *   - NEVER invent a venue not in operator's partners OR a verbatim
 *     general-name in the guest request.
 *   - ALWAYS disclose partner relationships ("we partner with X").
 *   - NEVER claim availability / pricing not supplied.
 */

const MODEL = "gpt-4o-mini";

const REQUEST_KINDS = [
  "dining",
  "activity",
  "transfer",
  "shopping",
  "wellness",
  "nightlife",
  "family_friendly",
] as const;

const MIN_REQUEST_LEN = 10;
const MAX_REQUEST_LEN = 1000;

export const recommendLocalOptionsTool: Tool = {
  name: "recommend_local_options",
  description:
    "Recommend 1-5 local options. Operator-partner venues prioritised + ALWAYS disclosed. Non-partners labelled. NEVER invents venues outside the supplied partner list / guest-mentioned names.",
  parameters: {
    type: "object",
    properties: {
      requestKind: { type: "string", enum: REQUEST_KINDS },
      guestRequest: {
        type: "string",
        description: "Free-form guest ask. ≤1000 chars.",
      },
      partyDetails: {
        type: "object",
        description: "Optional party context: { size, hasChildren, mobilityNotes }.",
        properties: {
          size: { type: "integer", minimum: 1, maximum: 100 },
          hasChildren: { type: "boolean" },
          mobilityNotes: { type: "string" },
        },
      },
      operatorPartners: {
        type: "array",
        description:
          "Partner venues (≤20). Each: { name, kind, notes }. These are the ONLY venues the tool can recommend besides what the guest names.",
        items: { type: "object" },
      },
      languageHint: {
        type: "string",
        description: "2-letter target language. Default 'en'.",
      },
    },
    required: ["requestKind", "guestRequest", "operatorPartners"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const requestKind = String(args.requestKind);
    const guestRequest = String(args.guestRequest).trim();
    const rawPartners = Array.isArray(args.operatorPartners)
      ? (args.operatorPartners as Array<Record<string, unknown>>)
      : [];
    const languageHint = args.languageHint
      ? String(args.languageHint).trim().toLowerCase().slice(0, 2)
      : "en";

    const partyRaw =
      typeof args.partyDetails === "object" && args.partyDetails !== null
        ? (args.partyDetails as Record<string, unknown>)
        : {};
    const partyDetails = {
      size: Math.max(1, Math.min(100, Math.round(Number(partyRaw.size ?? 1)))),
      hasChildren: Boolean(partyRaw.hasChildren),
      mobilityNotes:
        typeof partyRaw.mobilityNotes === "string"
          ? (partyRaw.mobilityNotes as string).slice(0, 200)
          : "",
    };

    if (!(REQUEST_KINDS as readonly string[]).includes(requestKind)) {
      return {
        ok: false,
        refused: true,
        reason: `requestKind must be one of: ${REQUEST_KINDS.join(", ")}`,
      };
    }
    if (
      guestRequest.length < MIN_REQUEST_LEN ||
      guestRequest.length > MAX_REQUEST_LEN
    ) {
      return {
        ok: false,
        refused: true,
        reason: `guestRequest must be ${MIN_REQUEST_LEN}-${MAX_REQUEST_LEN} chars.`,
      };
    }

    const partners = rawPartners.slice(0, 20).map((p) => ({
      name: typeof p.name === "string" ? p.name.trim() : "",
      kind: typeof p.kind === "string" ? p.kind.trim() : "",
      notes: typeof p.notes === "string" ? p.notes.slice(0, 200) : "",
    })).filter((p) => p.name.length > 0);

    if (partners.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "operatorPartners required (at least one). Concierge never invents venues.",
      };
    }

    const hits = await searchBrandBible({
      tenantId: ctx.tenantId,
      query: `concierge voice ${requestKind}`.slice(0, 200),
      k: 3,
      workerId: ctx.workerId,
      conversationId: ctx.conversationId,
    });
    const bbBlock =
      hits.length > 0
        ? hits.map((h, i) => `[BB${i + 1} · ${h.sourceTitle}]\n${h.content}`).join("\n\n")
        : "(no Brand Bible matches)";

    const systemPrompt = [
      `You are a property concierge in language code '${languageHint}'.`,
      "Output STRICT JSON: { recommendations, disclosureLine, openQuestions }.",
      "recommendations: 1-5 entries of { name, kind, isPartner, partnerNotes, why }.",
      "  - name MUST be from operatorPartners[] OR explicitly named in guestRequest.",
      "  - isPartner=true iff matches operatorPartners[].name.",
      "  - partnerNotes: only set when isPartner=true (operator-supplied notes verbatim).",
      "  - why: ≤25 words — tied to guestRequest + partyDetails.",
      "disclosureLine: 1 sentence — discloses any partner relationships shown.",
      "openQuestions: 0-3 strings — what to confirm with the guest before booking.",
      "ABSOLUTE RULES:",
      "  - NEVER invent venues, prices, availability, hours.",
      "  - NEVER omit the partner-relationship disclosure.",
      `Operator partners (whitelisted): ${partners.map((p) => `${p.name} (${p.kind || "?"})`).join(" | ")}`,
      `requestKind: ${requestKind}`,
      `partyDetails: size=${partyDetails.size}, hasChildren=${partyDetails.hasChildren}, mobility="${partyDetails.mobilityNotes}"`,
      "Brand Bible context:",
      bbBlock,
    ].join("\n");

    const t0 = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: guestRequest },
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

      // Whitelist names server-side.
      const partnerNamesLc = new Map(
        partners.map((p) => [p.name.toLowerCase(), p]),
      );
      const guestRequestLc = guestRequest.toLowerCase();
      const rawRecs = Array.isArray(parsed.recommendations)
        ? (parsed.recommendations as Array<Record<string, unknown>>)
        : [];
      const recommendations = rawRecs
        .map((r) => {
          const name = typeof r.name === "string" ? r.name.trim() : "";
          const partner = partnerNamesLc.get(name.toLowerCase());
          const isPartner = Boolean(partner);
          const guestNamed =
            !isPartner && name.length >= 3 && guestRequestLc.includes(name.toLowerCase());
          if (!isPartner && !guestNamed) return null; // drop invented venues
          return {
            name,
            kind: typeof r.kind === "string" ? r.kind : partner?.kind ?? "",
            isPartner,
            partnerNotes: isPartner ? partner?.notes ?? "" : "",
            why: typeof r.why === "string" ? r.why.slice(0, 300) : "",
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .slice(0, 5);

      const hasPartner = recommendations.some((r) => r.isPartner);
      let disclosureLine =
        typeof parsed.disclosureLine === "string"
          ? parsed.disclosureLine
          : "";
      if (hasPartner && !/partner|arrangement|relationship/i.test(disclosureLine)) {
        disclosureLine =
          "Some venues recommended here are property partners (we have an arrangement with them).";
      }

      await logSecurityEvent({
        kind: "concierge.options.recommended",
        tenantId: ctx.tenantId,
        payload: {
          subject: "concierge.options.recommended",
          requestKind,
          partnersCount: partners.length,
          recommendationsReturned: recommendations.length,
          droppedCount: rawRecs.length - recommendations.length,
          hasPartner,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          requestKind,
          languageHint,
          partyDetails,
          recommendations,
          disclosureLine,
          openQuestions: Array.isArray(parsed.openQuestions)
            ? (parsed.openQuestions as string[]).slice(0, 3)
            : [],
          partnersWhitelistCount: partners.length,
          brandBibleChunkIds: hits.map((h) => h.chunkId),
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Recommendation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
