import { DateTime } from "luxon";

/**
 * Pure availability logic (no database access) – fully unit-tested.
 * All instants are JS Dates (UTC); wall-clock rules are evaluated in the room's IANA time zone,
 * so Swiss summer/winter time changes are handled correctly.
 */

export type OpeningHour = { weekday: number; startMinute: number; endMinute: number };
export type Interval = { start: Date; end: Date };

export type AvailabilityRoom = {
  timezone: string;
  openingHours: OpeningHour[];
  minDurationMinutes: number;
  maxDurationMinutes: number;
  slotIntervalMinutes: number;
  leadTimeMinutes: number;
  maxAdvanceDays: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

const MIN = 60_000;

/** Local wall time `minute` minutes after local midnight of `isoDate`, as a UTC instant. */
export function wallTime(isoDate: string, minute: number, zone: string): Date {
  const base = DateTime.fromISO(isoDate, { zone });
  const dayOffset = Math.floor(minute / 1440);
  const m = minute - dayOffset * 1440;
  const local = base.plus({ days: dayOffset }).set({ hour: Math.floor(m / 60), minute: m % 60, second: 0, millisecond: 0 });
  return local.toJSDate();
}

export function localDate(instant: Date, zone: string): string {
  return DateTime.fromJSDate(instant, { zone }).toISODate()!;
}

function addDays(isoDate: string, days: number): string {
  return DateTime.fromISO(isoDate).plus({ days }).toISODate()!;
}

/** Opening windows that START on the given local date. Windows may extend past midnight. */
export function openingWindowsForDate(room: Pick<AvailabilityRoom, "timezone" | "openingHours">, isoDate: string): Interval[] {
  const weekday = DateTime.fromISO(isoDate, { zone: room.timezone }).weekday;
  return room.openingHours
    .filter((o) => o.weekday === weekday)
    .map((o) => ({ start: wallTime(isoDate, o.startMinute, room.timezone), end: wallTime(isoDate, o.endMinute, room.timezone) }))
    .filter((w) => w.end > w.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Merge touching/overlapping intervals (e.g. 00:00–24:00 every day becomes one continuous period). */
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start.getTime() <= last.end.getTime()) {
      if (iv.end > last.end) last.end = iv.end;
    } else out.push({ start: new Date(iv.start), end: new Date(iv.end) });
  }
  return out;
}

/** Continuous open periods covering a date range (with one day of look-back for overnight windows). */
export function openPeriods(room: Pick<AvailabilityRoom, "timezone" | "openingHours">, fromDate: string, toDate: string): Interval[] {
  const all: Interval[] = [];
  for (let d = addDays(fromDate, -1); d <= toDate; d = addDays(d, 1)) all.push(...openingWindowsForDate(room, d));
  return mergeIntervals(all);
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** The range a booking occupies including preparation and cleaning buffers. */
export function occupiedRange(room: Pick<AvailabilityRoom, "bufferBeforeMinutes" | "bufferAfterMinutes">, start: Date, end: Date): Interval {
  return {
    start: new Date(start.getTime() - room.bufferBeforeMinutes * MIN),
    end: new Date(end.getTime() + room.bufferAfterMinutes * MIN),
  };
}

export type ValidationError =
  | "invalid_range"
  | "too_short"
  | "too_long"
  | "not_aligned"
  | "outside_opening_hours"
  | "lead_time"
  | "too_far_ahead"
  | "in_past"
  | "unavailable";

export const VALIDATION_MESSAGES: Record<ValidationError, string> = {
  invalid_range: "Ungültiger Zeitraum.",
  too_short: "Die gewählte Mietdauer ist kürzer als die Mindestmietdauer.",
  too_long: "Die gewählte Mietdauer überschreitet die maximale Mietdauer.",
  not_aligned: "Bitte wählen Sie eine der angebotenen Startzeiten.",
  outside_opening_hours: "Der gewählte Zeitraum liegt ausserhalb der buchbaren Zeiten.",
  lead_time: "Dieser Termin ist zu kurzfristig. Bitte wählen Sie einen späteren Zeitpunkt.",
  too_far_ahead: "Dieser Termin liegt zu weit in der Zukunft.",
  in_past: "Dieser Termin liegt in der Vergangenheit.",
  unavailable: "Dieser Zeitraum ist leider nicht mehr verfügbar.",
};

export function validateBookingTime(
  room: AvailabilityRoom,
  start: Date,
  end: Date,
  busy: Interval[],
  now: Date,
  opts: { ignoreRules?: boolean } = {},
): ValidationError | null {
  if (!(start instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return "invalid_range";
  const minutes = (end.getTime() - start.getTime()) / MIN;
  if (!opts.ignoreRules) {
    if (start < now) return "in_past";
    if (minutes < room.minDurationMinutes) return "too_short";
    if (minutes > room.maxDurationMinutes) return "too_long";
    if (start.getTime() < now.getTime() + room.leadTimeMinutes * MIN) return "lead_time";
    if (start.getTime() > now.getTime() + room.maxAdvanceDays * 86400_000) return "too_far_ahead";
    const periods = openPeriods(room, localDate(start, room.timezone), localDate(end, room.timezone));
    if (!periods.some((p) => p.start <= start && p.end >= end)) return "outside_opening_hours";
  }
  const occ = occupiedRange(room, start, end);
  if (busy.some((b) => overlaps(occ, b))) return "unavailable";
  return null;
}

/** Bookable start times on a local date for a given duration. */
export function availableStartTimes(room: AvailabilityRoom, isoDate: string, durationMinutes: number, busy: Interval[], now: Date): Date[] {
  if (durationMinutes < room.minDurationMinutes || durationMinutes > room.maxDurationMinutes) return [];
  const periods = openPeriods(room, isoDate, addDays(isoDate, Math.ceil(durationMinutes / 1440) + 1));
  const result: Date[] = [];
  const seen = new Set<number>();
  for (const w of openingWindowsForDate(room, isoDate)) {
    const period = periods.find((p) => p.start <= w.start && p.end >= w.start);
    if (!period) continue;
    for (let t = w.start.getTime(); t < w.end.getTime(); t += room.slotIntervalMinutes * MIN) {
      const start = new Date(t);
      const end = new Date(t + durationMinutes * MIN);
      if (end > period.end) break;
      if (seen.has(t)) continue;
      if (validateBookingTime(room, start, end, busy, now) === null) {
        result.push(start);
        seen.add(t);
      }
    }
  }
  return result;
}

export type DayStatus = "available" | "full" | "closed";

export function dayStatus(room: AvailabilityRoom, isoDate: string, busy: Interval[], now: Date): DayStatus {
  const windows = openingWindowsForDate(room, isoDate);
  if (!windows.length) return "closed";
  const lastEnd = windows[windows.length - 1].end;
  if (lastEnd.getTime() < now.getTime() + room.leadTimeMinutes * MIN) return "closed";
  if (wallTime(isoDate, 0, room.timezone).getTime() > now.getTime() + room.maxAdvanceDays * 86400_000) return "closed";
  return availableStartTimes(room, isoDate, room.minDurationMinutes, busy, now).length ? "available" : "full";
}

/** Duration choices offered to customers. */
export function durationOptions(room: Pick<AvailabilityRoom, "minDurationMinutes" | "maxDurationMinutes" | "slotIntervalMinutes">): number[] {
  const step = Math.max(30, room.slotIntervalMinutes);
  const out: number[] = [];
  for (let d = room.minDurationMinutes; d <= room.maxDurationMinutes && out.length < 120; d += d < 600 ? step : 60) out.push(d);
  if (!out.includes(room.maxDurationMinutes) && room.maxDurationMinutes <= 7 * 1440) out.push(room.maxDurationMinutes);
  return out;
}

export function formatDuration(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d} ${d === 1 ? "Tag" : "Tage"}`);
  if (h) parts.push(`${h} Std.`);
  if (m) parts.push(`${m} Min.`);
  return parts.join(" ") || "0 Min.";
}
