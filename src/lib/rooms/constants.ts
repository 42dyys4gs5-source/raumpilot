import type { RoomCategory } from "@/lib/db/schema";

export const CATEGORY_LABELS: Record<RoomCategory, string> = {
  eventraum: "Eventraum",
  partyraum: "Partyraum",
  sitzungszimmer: "Sitzungszimmer",
  seminarraum: "Seminarraum",
  fotostudio: "Fotostudio",
  proberaum: "Proberaum / Musikraum",
  tanzstudio: "Tanzstudio",
  yogastudio: "Yoga- & Bewegungsraum",
  gemeinschaftsraum: "Gemeinschaftsraum",
  atelier: "Atelier / Werkraum",
  andere: "Anderer Raum",
};

export const AMENITIES = [
  "WLAN", "Beamer / Projektor", "Leinwand", "Grosser Bildschirm", "Soundanlage", "Mikrofon", "Videokonferenz",
  "Whiteboard", "Flipchart", "Küche", "Kühlschrank", "Kaffeemaschine", "Geschirr & Besteck", "Tische", "Stühle",
  "Lounge-Möbel", "Bühne", "Tanzfläche", "Lichtanlage", "Spiegelwand", "Schwingboden", "Klavier / Flügel",
  "Schlagzeug", "Verstärker", "Fotohintergründe", "Blitz- / Dauerlicht", "Umkleide", "Garderobe", "Toiletten",
  "Dusche", "Rollstuhlgängig", "Lift", "Parkplätze", "Gute ÖV-Anbindung", "Klimaanlage", "Tageslicht",
  "Verdunkelung", "Aussenbereich / Terrasse", "Rauchfrei",
] as const;

export const WEEKDAYS = [
  { n: 1, short: "Mo", long: "Montag" },
  { n: 2, short: "Di", long: "Dienstag" },
  { n: 3, short: "Mi", long: "Mittwoch" },
  { n: 4, short: "Do", long: "Donnerstag" },
  { n: 5, short: "Fr", long: "Freitag" },
  { n: 6, short: "Sa", long: "Samstag" },
  { n: 7, short: "So", long: "Sonntag" },
] as const;

export function minutesToTime(m: number): string {
  const mm = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}

export function timeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}
