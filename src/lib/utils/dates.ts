import { DateTime } from "luxon";

export const DEFAULT_TZ = "Europe/Zurich";

export function dt(d: Date, zone = DEFAULT_TZ) {
  return DateTime.fromJSDate(d, { zone }).setLocale("de-CH");
}

/** "Sa., 7. Feb. 2026" */
export function formatDate(d: Date, zone = DEFAULT_TZ) {
  return dt(d, zone).toFormat("ccc, d. LLL yyyy");
}

/** "Samstag, 7. Februar 2026" */
export function formatDateLong(d: Date, zone = DEFAULT_TZ) {
  return dt(d, zone).toFormat("cccc, d. LLLL yyyy");
}

export function formatTime(d: Date, zone = DEFAULT_TZ) {
  return dt(d, zone).toFormat("HH:mm");
}

export function formatDateTime(d: Date, zone = DEFAULT_TZ) {
  return dt(d, zone).toFormat("d.M.yyyy, HH:mm");
}

/** "Samstag, 7. Februar 2026, 10:00 – 12:00 Uhr" or across days "Fr., 6.2.2026, 22:00 – Sa., 7.2.2026, 02:00 Uhr" */
export function formatRange(start: Date, end: Date, zone = DEFAULT_TZ) {
  const s = dt(start, zone);
  const e = dt(end, zone);
  if (s.hasSame(e, "day")) return `${s.toFormat("cccc, d. LLLL yyyy")}, ${s.toFormat("HH:mm")} – ${e.toFormat("HH:mm")} Uhr`;
  return `${s.toFormat("ccc, d.M.yyyy, HH:mm")} – ${e.toFormat("ccc, d.M.yyyy, HH:mm")} Uhr`;
}

export function todayISO(zone = DEFAULT_TZ) {
  return DateTime.now().setZone(zone).toISODate()!;
}
