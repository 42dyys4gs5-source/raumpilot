import ICAL from "ical.js";
import { DateTime } from "luxon";

export type ImportedEvent = { uid: string; start: Date; end: Date; summary: string };

type IcalTime = InstanceType<typeof ICAL.Time>;

function toDate(t: IcalTime, fallbackZone: string): Date {
  const tzid = t.zone?.tzid;
  if (tzid === "UTC" || tzid === "Z") return t.toJSDate();
  if (t.isDate) {
    return DateTime.fromObject({ year: t.year, month: t.month, day: t.day }, { zone: fallbackZone }).toJSDate();
  }
  const zone = tzid && tzid !== "floating" && DateTime.local().setZone(tzid).isValid ? tzid : fallbackZone;
  return DateTime.fromObject({ year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute, second: t.second }, { zone }).toJSDate();
}

/**
 * Parses an iCal document and expands recurring events within [from, to].
 * Skips free/transparent and cancelled events and events originally exported by Raumvia (loop protection).
 */
export function parseIcs(text: string, opts: { from: Date; to: Date; zone: string; maxEvents?: number }): ImportedEvent[] {
  const max = opts.maxEvents ?? 3000;
  const comp = new ICAL.Component(ICAL.parse(text));
  for (const tz of comp.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(tz);
    } catch {
      /* ignore broken timezone definitions */
    }
  }
  const out: ImportedEvent[] = [];
  const vevents = comp.getAllSubcomponents("vevent");
  // Exceptions (RECURRENCE-ID) are handled by relating them to their master event.
  const exceptions = vevents.filter((v) => v.hasProperty("recurrence-id"));
  for (const v of vevents) {
    if (out.length >= max) break;
    if (v.hasProperty("recurrence-id")) continue;
    const event = new ICAL.Event(v, { strictExceptions: false });
    for (const ex of exceptions) {
      if (ex.getFirstPropertyValue("uid") === event.uid) event.relateException(ex);
    }
    const uid = String(event.uid ?? "");
    if (uid.endsWith("@raumvia")) continue;
    const transp = String(v.getFirstPropertyValue("transp") ?? "").toUpperCase();
    const status = String(v.getFirstPropertyValue("status") ?? "").toUpperCase();
    if (transp === "TRANSPARENT" || status === "CANCELLED") continue;
    const summary = String(event.summary ?? "Belegt").slice(0, 200);

    const push = (start: IcalTime, end: IcalTime | null, occurrenceKey: string) => {
      const s = toDate(start, opts.zone);
      let e: Date;
      if (end) e = toDate(end, opts.zone);
      else if (start.isDate) e = new Date(DateTime.fromJSDate(s, { zone: opts.zone }).plus({ days: 1 }).toMillis());
      else e = s;
      if (e <= s) return;
      if (e < opts.from || s > opts.to) return;
      out.push({ uid: `${uid}#${occurrenceKey}`, start: s, end: e, summary });
    };

    if (event.isRecurring()) {
      const it = event.iterator();
      let next: IcalTime | null;
      let guard = 0;
      while ((next = it.next()) && guard++ < 5000 && out.length < max) {
        const occStart = toDate(next, opts.zone);
        if (occStart > opts.to) break;
        const d = event.getOccurrenceDetails(next);
        const ex = d.item;
        const exStatus = String(ex.component.getFirstPropertyValue("status") ?? "").toUpperCase();
        if (exStatus === "CANCELLED") continue;
        push(d.startDate, d.endDate, next.toString());
      }
    } else {
      push(event.startDate, event.endDate ?? null, "single");
    }
  }
  return out;
}
