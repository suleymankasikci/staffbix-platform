import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * book_appointment_slot — decide whether a requested slot can be
 * booked given the practitioner's availability windows + buffer rules
 * + an optional list of already-booked slots. Pure rules.
 *
 * Output:
 *   - decision: 'book' | 'conflict' | 'outside_window' | 'past' |
 *     'lead_time_too_short' | 'over_max_per_day'
 *   - bookableNow: bool
 *   - reasons[]
 *   - suggestedAlternatives: 0-3 ISO slots within the same day,
 *     respecting buffer.
 */

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const MAX_AVAIL_WINDOWS = 50;
const MAX_BOOKED = 200;

export const bookAppointmentSlotTool: Tool = {
  name: "book_appointment_slot",
  description:
    "Decide whether to book an appointment slot. Pure rules — checks availability window, conflicts with booked slots, buffer, lead time, and per-day max. Returns decision + suggested alternatives.",
  parameters: {
    type: "object",
    properties: {
      requestedStartIso: { type: "string" },
      durationMin: { type: "integer", minimum: 5, maximum: 480 },
      bufferMin: {
        type: "integer",
        description: "Buffer minutes before AND after each booking. Default 0.",
        minimum: 0,
        maximum: 120,
      },
      minLeadTimeMin: {
        type: "integer",
        description: "Minimum minutes between now and start. Default 60.",
        minimum: 0,
        maximum: 60 * 24 * 7,
      },
      availabilityWindows: {
        type: "array",
        description:
          "≤50 weekly windows: { dayOfWeek (sun..sat), startTime ('09:00'), endTime ('18:00') }.",
        items: { type: "object" },
      },
      alreadyBookedSlots: {
        type: "array",
        description:
          "≤200 already-booked slot entries: { startIso, durationMin }.",
        items: { type: "object" },
      },
      maxPerDay: {
        type: "integer",
        description: "Max bookings allowed in the requested day. 0 = no cap. Default 0.",
        minimum: 0,
        maximum: 100,
      },
      timeZone: {
        type: "string",
        description:
          "IANA TZ string for the practitioner (e.g., 'Europe/Istanbul'). Default UTC.",
      },
    },
    required: ["requestedStartIso", "durationMin", "availabilityWindows"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const requestedStartIso = String(args.requestedStartIso).trim();
    const durationMin = Math.max(5, Math.min(480, Math.round(Number(args.durationMin))));
    const bufferMin = Math.max(0, Math.min(120, Math.round(Number(args.bufferMin ?? 0))));
    const minLeadTimeMin = Math.max(
      0,
      Math.min(60 * 24 * 7, Math.round(Number(args.minLeadTimeMin ?? 60))),
    );
    const rawWindows = Array.isArray(args.availabilityWindows)
      ? (args.availabilityWindows as Array<Record<string, unknown>>)
      : [];
    const rawBooked = Array.isArray(args.alreadyBookedSlots)
      ? (args.alreadyBookedSlots as Array<Record<string, unknown>>)
      : [];
    const maxPerDay = Math.max(0, Math.min(100, Math.round(Number(args.maxPerDay ?? 0))));
    const timeZone = args.timeZone
      ? String(args.timeZone).trim().slice(0, 40)
      : "UTC";

    const startMs = Date.parse(requestedStartIso);
    if (!Number.isFinite(startMs)) {
      return {
        ok: false,
        refused: true,
        reason: "requestedStartIso must be a valid ISO 8601 timestamp.",
      };
    }
    if (rawWindows.length === 0 || rawWindows.length > MAX_AVAIL_WINDOWS) {
      return {
        ok: false,
        refused: true,
        reason: `availabilityWindows must have 1-${MAX_AVAIL_WINDOWS} entries.`,
      };
    }
    if (rawBooked.length > MAX_BOOKED) {
      return {
        ok: false,
        refused: true,
        reason: `alreadyBookedSlots too many (max ${MAX_BOOKED}).`,
      };
    }

    type AvailWindow = {
      dayOfWeek: (typeof DOW)[number];
      startMinutes: number;
      endMinutes: number;
    };
    const windows: AvailWindow[] = [];
    for (let i = 0; i < rawWindows.length; i++) {
      const w = rawWindows[i];
      const dow = String(w.dayOfWeek ?? "").toLowerCase().slice(0, 3);
      const startTime = String(w.startTime ?? "");
      const endTime = String(w.endTime ?? "");
      if (!(DOW as readonly string[]).includes(dow)) {
        return {
          ok: false,
          refused: true,
          reason: `availabilityWindows[${i}].dayOfWeek must be one of: ${DOW.join(", ")}`,
        };
      }
      const startM = parseHHMM(startTime);
      const endM = parseHHMM(endTime);
      if (startM === null || endM === null) {
        return {
          ok: false,
          refused: true,
          reason: `availabilityWindows[${i}] times must be 'HH:MM' (00:00-23:59).`,
        };
      }
      if (endM <= startM) {
        return {
          ok: false,
          refused: true,
          reason: `availabilityWindows[${i}] endTime must be after startTime.`,
        };
      }
      windows.push({ dayOfWeek: dow as (typeof DOW)[number], startMinutes: startM, endMinutes: endM });
    }

    const bookedSlots: Array<{ startMs: number; endMs: number }> = [];
    for (let i = 0; i < rawBooked.length; i++) {
      const b = rawBooked[i];
      const bIso = String(b.startIso ?? "");
      const bDur = Math.max(1, Math.min(480, Math.round(Number(b.durationMin ?? 0))));
      const ms = Date.parse(bIso);
      if (!Number.isFinite(ms)) {
        return {
          ok: false,
          refused: true,
          reason: `alreadyBookedSlots[${i}].startIso invalid.`,
        };
      }
      bookedSlots.push({ startMs: ms, endMs: ms + bDur * 60_000 });
    }

    const endMs = startMs + durationMin * 60_000;
    const reasons: string[] = [];

    // Lead time check
    const minutesFromNow = (startMs - Date.now()) / 60_000;
    let decision:
      | "book"
      | "conflict"
      | "outside_window"
      | "past"
      | "lead_time_too_short"
      | "over_max_per_day" = "book";
    if (minutesFromNow < 0) {
      decision = "past";
      reasons.push("requestedStartIso is in the past.");
    } else if (minutesFromNow < minLeadTimeMin) {
      decision = "lead_time_too_short";
      reasons.push(
        `Lead time ${Math.round(minutesFromNow)}min < required ${minLeadTimeMin}min.`,
      );
    }

    // Availability window check
    const dt = new Date(startMs);
    const dowName = DOW[dt.getUTCDay()];
    const reqStartMinutes = dt.getUTCHours() * 60 + dt.getUTCMinutes();
    const reqEndMinutes = reqStartMinutes + durationMin;
    const inWindow = windows.some(
      (w) =>
        w.dayOfWeek === dowName &&
        reqStartMinutes >= w.startMinutes &&
        reqEndMinutes <= w.endMinutes,
    );
    if (decision === "book" && !inWindow) {
      decision = "outside_window";
      reasons.push(
        `Requested time (${dowName} ${formatMinutes(reqStartMinutes)}-${formatMinutes(reqEndMinutes)}) is outside any availability window.`,
      );
    }

    // Conflict check (with buffer)
    const conflictStart = startMs - bufferMin * 60_000;
    const conflictEnd = endMs + bufferMin * 60_000;
    const conflicts = bookedSlots.filter(
      (b) => b.startMs < conflictEnd && b.endMs > conflictStart,
    );
    if (decision === "book" && conflicts.length > 0) {
      decision = "conflict";
      reasons.push(
        `${conflicts.length} conflicting booking(s) within buffer (${bufferMin}min).`,
      );
    }

    // Max-per-day check
    if (decision === "book" && maxPerDay > 0) {
      const dayStart = new Date(startMs);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = dayStart.getTime() + 86_400_000;
      const sameDayCount = bookedSlots.filter(
        (b) => b.startMs >= dayStart.getTime() && b.startMs < dayEnd,
      ).length;
      if (sameDayCount >= maxPerDay) {
        decision = "over_max_per_day";
        reasons.push(
          `${sameDayCount} bookings already on the day (max ${maxPerDay}).`,
        );
      }
    }

    // Suggested alternatives (only if not 'book' and we have a window).
    const suggestedAlternatives: string[] = [];
    if (decision !== "book" && decision !== "past") {
      const sameDayWindow = windows.find((w) => w.dayOfWeek === dowName);
      if (sameDayWindow) {
        const dayBase = new Date(startMs);
        dayBase.setUTCHours(0, 0, 0, 0);
        for (
          let m = sameDayWindow.startMinutes;
          m + durationMin <= sameDayWindow.endMinutes;
          m += 30
        ) {
          const candidateMs = dayBase.getTime() + m * 60_000;
          if (candidateMs < Date.now() + minLeadTimeMin * 60_000) continue;
          const candidateEnd = candidateMs + durationMin * 60_000;
          const candConflictStart = candidateMs - bufferMin * 60_000;
          const candConflictEnd = candidateEnd + bufferMin * 60_000;
          const hasConflict = bookedSlots.some(
            (b) =>
              b.startMs < candConflictEnd && b.endMs > candConflictStart,
          );
          if (!hasConflict) {
            suggestedAlternatives.push(new Date(candidateMs).toISOString());
            if (suggestedAlternatives.length >= 3) break;
          }
        }
      }
    }

    if (decision === "book") reasons.push("All checks passed.");
    const bookableNow = decision === "book";

    await logSecurityEvent({
      kind: "receptionist.slot.evaluated",
      tenantId: ctx.tenantId,
      payload: {
        subject: "receptionist.slot.evaluated",
        decision,
        durationMin,
        bufferMin,
        conflictCount: conflicts.length,
        suggestedCount: suggestedAlternatives.length,
        timeZone,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        requestedStartIso,
        durationMin,
        bufferMin,
        minLeadTimeMin,
        decision,
        bookableNow,
        reasons,
        suggestedAlternatives,
        windowsCount: windows.length,
        bookedCount: bookedSlots.length,
        timeZone,
      },
    };
  },
};

function parseHHMM(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
