import type { PlanFeatures } from "@/lib/db/schema";

/**
 * Default plan configuration. Values are seeded into the `plans` table
 * (npm run db:seed-plans) and can afterwards be adjusted in the admin area.
 * Feature limits are enforced server-side via lib/billing/entitlements.
 */
export type PlanConfig = {
  key: "starter" | "professional" | "business";
  name: string;
  description: string;
  priceMonthly: number; // Rappen
  maxRooms: number;
  maxLocations: number;
  maxMembers: number;
  features: PlanFeatures;
  highlights: string[];
  sort: number;
};

export const DEFAULT_PLANS: PlanConfig[] = [
  {
    key: "starter",
    name: "Starter",
    description: "Für Vermieterinnen und Vermieter mit einem Raum.",
    priceMonthly: 3900,
    maxRooms: 1,
    maxLocations: 1,
    maxMembers: 1,
    features: {
      extras: false,
      discountCodes: false,
      priceRules: false,
      statistics: false,
      advancedStatistics: false,
      reminders: false,
      team: false,
      branding: false,
      prioritySupport: false,
      calendarImport: true,
    },
    highlights: [
      "1 Raum",
      "Eigene Buchungsseite mit QR-Code",
      "Verfügbarkeitskalender & iCal-Export",
      "Onlinebuchungen & Buchungsanfragen",
      "Automatische Buchungsbestätigungen",
      "Onlinezahlung via Stripe (optional)",
    ],
    sort: 1,
  },
  {
    key: "professional",
    name: "Professional",
    description: "Für Betriebe mit mehreren Räumen und Zusatzangeboten.",
    priceMonthly: 6900,
    maxRooms: 5,
    maxLocations: 1,
    maxMembers: 1,
    features: {
      extras: true,
      discountCodes: true,
      priceRules: true,
      statistics: true,
      advancedStatistics: false,
      reminders: true,
      team: false,
      branding: false,
      prioritySupport: false,
      calendarImport: true,
    },
    highlights: [
      "Bis zu 5 Räume",
      "Alle Starter-Funktionen",
      "Zusatzleistungen",
      "Rabattcodes",
      "Wochenend- & Saisonpreise",
      "Umsatzstatistiken",
      "Automatische Erinnerungen an Mieter",
    ],
    sort: 2,
  },
  {
    key: "business",
    name: "Business",
    description: "Für mehrere Standorte und Teams.",
    priceMonthly: 12900,
    maxRooms: 25,
    maxLocations: 10,
    maxMembers: 10,
    features: {
      extras: true,
      discountCodes: true,
      priceRules: true,
      statistics: true,
      advancedStatistics: true,
      reminders: true,
      team: true,
      branding: true,
      prioritySupport: true,
      calendarImport: true,
    },
    highlights: [
      "Mehrere Standorte (bis 10)",
      "Bis 25 Räume (Fair Use)",
      "Teamzugänge (bis 10 Personen)",
      "Erweiterte Statistiken",
      "Eigenes Logo & eigene Markenfarbe",
      "Priorisierter Support",
    ],
    sort: 3,
  },
];

export const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  extras: "Zusatzleistungen",
  discountCodes: "Rabattcodes",
  priceRules: "Wochenend- und Saisonpreise",
  statistics: "Umsatzstatistiken",
  advancedStatistics: "Erweiterte Statistiken",
  reminders: "Automatische Erinnerungen",
  team: "Teamzugänge",
  branding: "Individuelle Gestaltung",
  prioritySupport: "Priorisierter Support",
  calendarImport: "Kalenderimport (iCal)",
};
