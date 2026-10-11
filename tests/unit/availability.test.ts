import { describe, expect, it } from "vitest";
import {
  availableStartTimes,
  dayStatus,
  occupiedRange,
  validateBookingTime,
  wallTime,
  type AvailabilityRoom,
} from "@/lib/booking/availability";

const Z = "Europe/Zurich";
const allWeek = (s: number, e: number) => [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMinute: s, endMinute: e }));
const room = (o: Partial<AvailabilityRoom> = {}): AvailabilityRoom => ({
  timezone: Z,
  openingHours: allWeek(8 * 60, 22 * 60),
  minDurationMinutes: 60,
  maxDurationMinutes: 720,
  slotIntervalMinutes: 60,
  leadTimeMinutes: 0,
  maxAdvanceDays: 365,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  ...o,
});
const now = new Date("2026-01-01T00:00:00Z");

describe("wallTime / DST", () => {
  it("maps Swiss winter time (UTC+1)", () => {
    expect(wallTime("2026-01-15", 10 * 60, Z).toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });
  it("maps Swiss summer time (UTC+2)", () => {
    expect(wallTime("2026-07-15", 10 * 60, Z).toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });
  it("handles windows past midnight", () => {
    expect(wallTime("2026-01-15", 26 * 60, Z).toISOString()).toBe("2026-01-16T01:00:00.000Z");
  });
  it("overnight booking across the spring-forward night lasts one hour less", () => {
    // 29 March 2026: clocks jump 02:00 -> 03:00
    const start = wallTime("2026-03-28", 22 * 60, Z);
    const end = wallTime("2026-03-28", 28 * 60, Z); // 04:00 next day
    expect((end.getTime() - start.getTime()) / 3600_000).toBe(5);
  });
  it("overnight booking across the fall-back night lasts one hour more", () => {
    // 25 October 2026: clocks go back 03:00 -> 02:00
    const start = wallTime("2026-10-24", 22 * 60, Z);
    const end = wallTime("2026-10-24", 28 * 60, Z);
    expect((end.getTime() - start.getTime()) / 3600_000).toBe(7);
  });
});

describe("availableStartTimes", () => {
  it("lists hourly slots inside opening hours", () => {
    const slots = availableStartTimes(room(), "2026-02-02", 120, [], now);
    expect(slots.length).toBe(13); // 08..20 start for 2h within 08-22
    expect(slots[0].toISOString()).toBe("2026-02-02T07:00:00.000Z");
  });
  it("respects existing bookings incl. cleaning buffer", () => {
    const r = room({ bufferAfterMinutes: 60 });
    const busy = [occupiedRange(r, wallTime("2026-02-02", 12 * 60, Z), wallTime("2026-02-02", 14 * 60, Z))];
    const slots = availableStartTimes(r, "2026-02-02", 60, busy, now).map((d) => d.toISOString());
    // 11:00 start would end at 12:00 + 60 min cleaning -> overlaps booking at 12:00
    expect(slots).not.toContain(wallTime("2026-02-02", 11 * 60, Z).toISOString());
    expect(slots).not.toContain(wallTime("2026-02-02", 14 * 60, Z).toISOString()); // cleaning of previous until 15:00
    expect(slots).toContain(wallTime("2026-02-02", 15 * 60, Z).toISOString());
    expect(slots).toContain(wallTime("2026-02-02", 10 * 60, Z).toISOString());
  });
  it("supports opening hours past midnight", () => {
    const r = room({ openingHours: allWeek(18 * 60, 26 * 60) });
    const slots = availableStartTimes(r, "2026-02-06", 240, [], now);
    expect(slots.map((d) => d.toISOString())).toContain(wallTime("2026-02-06", 22 * 60, Z).toISOString());
    const v = validateBookingTime(r, wallTime("2026-02-06", 22 * 60, Z), wallTime("2026-02-06", 26 * 60, Z), [], now);
    expect(v).toBeNull();
  });
  it("respects lead time and max advance", () => {
    const n = wallTime("2026-02-02", 9 * 60, Z);
    const r = room({ leadTimeMinutes: 180, maxAdvanceDays: 10 });
    const slots = availableStartTimes(r, "2026-02-02", 60, [], n);
    expect(slots[0].toISOString()).toBe(wallTime("2026-02-02", 12 * 60, Z).toISOString());
    expect(availableStartTimes(r, "2026-03-02", 60, [], n)).toHaveLength(0);
  });
  it("returns no slots for closed weekdays", () => {
    const r = room({ openingHours: [{ weekday: 1, startMinute: 480, endMinute: 1020 }] });
    expect(dayStatus(r, "2026-02-03", [], now)).toBe("closed"); // Tuesday
    expect(dayStatus(r, "2026-02-02", [], now)).toBe("available");
  });
  it("marks fully booked days", () => {
    const r = room();
    const busy = [{ start: wallTime("2026-02-02", 0, Z), end: wallTime("2026-02-03", 0, Z) }];
    expect(dayStatus(r, "2026-02-02", busy, now)).toBe("full");
  });
});

describe("validateBookingTime", () => {
  it("rejects outside opening hours and invalid durations", () => {
    const r = room();
    expect(validateBookingTime(r, wallTime("2026-02-02", 21 * 60, Z), wallTime("2026-02-02", 23 * 60, Z), [], now)).toBe("outside_opening_hours");
    expect(validateBookingTime(r, wallTime("2026-02-02", 10 * 60, Z), wallTime("2026-02-02", 10 * 60 + 30, Z), [], now)).toBe("too_short");
    expect(validateBookingTime(r, wallTime("2026-02-02", 10 * 60, Z), wallTime("2026-02-02", 9 * 60, Z), [], now)).toBe("invalid_range");
  });
  it("allows multi-day bookings across continuous 24h opening", () => {
    const r = room({ openingHours: allWeek(0, 1440), maxDurationMinutes: 3 * 1440 });
    expect(validateBookingTime(r, wallTime("2026-02-02", 10 * 60, Z), wallTime("2026-02-04", 10 * 60, Z), [], now)).toBeNull();
  });
});
