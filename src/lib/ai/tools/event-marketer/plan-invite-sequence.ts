import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * plan_event_invite_sequence — given an event start time + operator's
 * invite cadence ("days before" list), compute the exact ISO send
 * timestamps + recommended copy angle for each send.
 *
 * Output:
 *   - eventStartIso, eventTitle
 *   - sequence: [{ daysBefore, sendAtIso, angle, audienceTag, subjectHint }]
 *   - postEvent: [{ delayHours, audienceTag, angle, subjectHint }] for
 *     attendees + no-shows
 *
 * No LLM call — purely arithmetic + canonical sequence patterns.
 */

const EVENT_TYPES = ["webinar", "product_launch", "conference", "workshop", "ama"] as const;

const SEQUENCE_ANGLES: Record<number, { angle: string; subjectHint: string }> = {
  21: { angle: "save_the_date", subjectHint: "Save the date — <Event Title>" },
  14: { angle: "speakers_revealed", subjectHint: "Who you'll hear from on <Event Title>" },
  10: { angle: "agenda_drop", subjectHint: "The full agenda for <Event Title>" },
  7: { angle: "speakers_revealed", subjectHint: "One week to <Event Title>" },
  5: { angle: "early_bird_last_call", subjectHint: "Last week to register" },
  3: { angle: "fomo_quote", subjectHint: "What attendees said last time" },
  2: { angle: "fomo_quote", subjectHint: "48 hours to <Event Title>" },
  1: { angle: "day_before_logistics", subjectHint: "Tomorrow: join link inside" },
  0: { angle: "day_of_join_now", subjectHint: "Starting in 30 minutes" },
};

function angleFor(daysBefore: number): { angle: string; subjectHint: string } {
  if (SEQUENCE_ANGLES[daysBefore]) return SEQUENCE_ANGLES[daysBefore];
  // Pick the nearest known daysBefore.
  let best = 7;
  let bestDist = Infinity;
  for (const key of Object.keys(SEQUENCE_ANGLES)) {
    const k = Number(key);
    const d = Math.abs(k - daysBefore);
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  }
  return SEQUENCE_ANGLES[best];
}

const MAX_DAYS_BEFORE = 365;

export const planEventInviteSequenceTool: Tool = {
  name: "plan_event_invite_sequence",
  description:
    "Compute the exact send schedule for an event invite sequence + post-event follow-up. Returns ISO send timestamps and angle/subjectHint per send. Deterministic — no LLM.",
  parameters: {
    type: "object",
    properties: {
      eventTitle: { type: "string", description: "Event title for subject lines." },
      eventStartIso: {
        type: "string",
        description: "ISO 8601 event start timestamp (UTC).",
      },
      eventType: { type: "string", enum: EVENT_TYPES },
      daysBeforeCadence: {
        type: "array",
        description:
          "Operator's cadence list, e.g., [14, 7, 3, 1]. Each integer represents 'days before event start'.",
        items: { type: "integer", minimum: 0, maximum: MAX_DAYS_BEFORE },
      },
      audienceTag: {
        type: "string",
        description: "Audience tag (e.g., 'enterprise-customers'). Optional.",
      },
      includePostEventFollowUps: {
        type: "boolean",
        description: "Default true — include attendees + no-show follow-ups.",
      },
    },
    required: ["eventTitle", "eventStartIso", "eventType", "daysBeforeCadence"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const eventTitle = String(args.eventTitle).trim();
    const eventStartIso = String(args.eventStartIso).trim();
    const eventType = String(args.eventType);
    const rawCadence = Array.isArray(args.daysBeforeCadence)
      ? (args.daysBeforeCadence as number[])
      : [];
    const audienceTag = args.audienceTag ? String(args.audienceTag).trim() : "all_subscribers";
    const includePostEventFollowUps =
      args.includePostEventFollowUps === undefined ? true : Boolean(args.includePostEventFollowUps);

    if (!(EVENT_TYPES as readonly string[]).includes(eventType)) {
      return {
        ok: false,
        refused: true,
        reason: `eventType must be one of: ${EVENT_TYPES.join(", ")}`,
      };
    }
    if (eventTitle.length < 3) {
      return { ok: false, refused: true, reason: "eventTitle too short." };
    }
    const eventStartMs = Date.parse(eventStartIso);
    if (!Number.isFinite(eventStartMs)) {
      return {
        ok: false,
        refused: true,
        reason: "eventStartIso must be a valid ISO 8601 timestamp.",
      };
    }
    if (eventStartMs < Date.now() - 5 * 60_000) {
      return {
        ok: false,
        refused: true,
        reason: "eventStartIso is in the past — can't plan a forward invite sequence.",
      };
    }

    const cadence: number[] = [];
    for (const d of rawCadence) {
      const n = Math.round(Number(d));
      if (!Number.isFinite(n) || n < 0 || n > MAX_DAYS_BEFORE) {
        return {
          ok: false,
          refused: true,
          reason: `daysBeforeCadence entries must be 0-${MAX_DAYS_BEFORE} integers.`,
        };
      }
      if (!cadence.includes(n)) cadence.push(n);
    }
    if (cadence.length === 0) {
      return {
        ok: false,
        refused: true,
        reason: "daysBeforeCadence must have at least one entry.",
      };
    }
    cadence.sort((a, b) => b - a); // largest first → earliest send

    const sequence = cadence
      .map((daysBefore) => {
        const sendAtMs = eventStartMs - daysBefore * 86400_000;
        if (sendAtMs < Date.now() - 60_000) return null;
        const { angle, subjectHint } = angleFor(daysBefore);
        return {
          daysBefore,
          sendAtIso: new Date(sendAtMs).toISOString(),
          angle,
          audienceTag,
          subjectHint: subjectHint.replace("<Event Title>", eventTitle),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const postEvent = includePostEventFollowUps
      ? [
          {
            delayHours: 2,
            audienceTag: `${audienceTag}.attendees`,
            angle: "thank_you_replay",
            subjectHint: `Thanks for joining ${eventTitle} — replay inside`,
          },
          {
            delayHours: 24,
            audienceTag: `${audienceTag}.no_shows`,
            angle: "missed_it_replay",
            subjectHint: `Sorry we missed you at ${eventTitle} — watch the replay`,
          },
          {
            delayHours: 24 * 7,
            audienceTag: `${audienceTag}.attendees`,
            angle: "next_steps_offer",
            subjectHint: `Where to go next after ${eventTitle}`,
          },
        ]
      : [];

    await logSecurityEvent({
      kind: "event.sequence.planned",
      tenantId: ctx.tenantId,
      payload: {
        subject: "event.sequence.planned",
        eventTitle,
        eventType,
        eventStartIso,
        sequenceCount: sequence.length,
        postEventCount: postEvent.length,
        skippedPastCount: cadence.length - sequence.length,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        eventTitle,
        eventType,
        eventStartIso: new Date(eventStartMs).toISOString(),
        sequence,
        postEvent,
        skippedPastCount: cadence.length - sequence.length,
      },
    };
  },
};
