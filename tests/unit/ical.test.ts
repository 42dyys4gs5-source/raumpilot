import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/calendar/ics";
import { parseIcs } from "@/lib/calendar/ical-import";

const FEED = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VTIMEZONE
TZID:Europe/Zurich
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:single-1
DTSTART;TZID=Europe/Zurich:20270115T100000
DTEND;TZID=Europe/Zurich:20270115T120000
SUMMARY:Vereinssitzung
END:VEVENT
BEGIN:VEVENT
UID:weekly-1
DTSTART;TZID=Europe/Zurich:20270104T180000
DTEND;TZID=Europe/Zurich:20270104T200000
RRULE:FREQ=WEEKLY;COUNT=4
EXDATE;TZID=Europe/Zurich:20270111T180000
SUMMARY:Chorprobe
END:VEVENT
BEGIN:VEVENT
UID:allday-1
DTSTART;VALUE=DATE:20270201
DTEND;VALUE=DATE:20270203
SUMMARY:Ferien
END:VEVENT
BEGIN:VEVENT
UID:free-1
DTSTART:20270120T100000Z
DTEND:20270120T110000Z
TRANSP:TRANSPARENT
SUMMARY:Nur Info
END:VEVENT
BEGIN:VEVENT
UID:abc@raumvia
DTSTART:20270121T100000Z
DTEND:20270121T110000Z
SUMMARY:Eigener Export
END:VEVENT
END:VCALENDAR`;

describe("iCal import", () => {
  const events = parseIcs(FEED, { from: new Date("2027-01-01T00:00:00Z"), to: new Date("2027-12-31T00:00:00Z"), zone: "Europe/Zurich" });
  it("converts time zones correctly", () => {
    const e = events.find((x) => x.uid.startsWith("single-1"))!;
    expect(e.start.toISOString()).toBe("2027-01-15T09:00:00.000Z");
    expect(e.end.toISOString()).toBe("2027-01-15T11:00:00.000Z");
  });
  it("expands recurring events and honours exceptions", () => {
    const weekly = events.filter((x) => x.uid.startsWith("weekly-1"));
    expect(weekly).toHaveLength(3); // 4 occurrences minus 1 EXDATE
    expect(weekly.map((w) => w.start.toISOString())).not.toContain("2027-01-11T17:00:00.000Z");
  });
  it("handles all-day events in local time", () => {
    const a = events.find((x) => x.uid.startsWith("allday-1"))!;
    expect(a.start.toISOString()).toBe("2027-01-31T23:00:00.000Z");
    expect(a.end.toISOString()).toBe("2027-02-02T23:00:00.000Z");
  });
  it("skips transparent events and our own exported events (loop protection)", () => {
    expect(events.find((x) => x.uid.startsWith("free-1"))).toBeUndefined();
    expect(events.find((x) => x.uid.includes("@raumvia"))).toBeUndefined();
  });
});

describe("iCal export", () => {
  it("produces RFC 5545 compliant output with escaping and folding", () => {
    const ics = buildIcs([{ uid: "x@raumvia", start: new Date("2027-01-01T10:00:00Z"), end: new Date("2027-01-01T12:00:00Z"), summary: "Müller, Anna; Geburtstag", description: "Zeile 1\nZeile 2 " + "lang ".repeat(30) }], "Saal");
    expect(ics).toContain("DTSTART:20270101T100000Z");
    expect(ics).toContain("SUMMARY:Müller\\, Anna\; Geburtstag");
    expect(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    const back = parseIcs(ics.replace("x@raumvia", "y@other"), { from: new Date("2026-12-01"), to: new Date("2027-02-01"), zone: "Europe/Zurich" });
    expect(back).toHaveLength(1);
    expect(back[0].summary).toBe("Müller, Anna; Geburtstag");
  });
});
