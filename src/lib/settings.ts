import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";

/** Operator (= Plattformbetreiber) data for imprint, privacy policy and invoices. Edited in Admin › Einstellungen. */
export type OperatorInfo = {
  name: string;
  legalForm: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  uid: string;
  vatNumber: string;
  representative: string;
  vatRegistered: boolean;
};

export const DEFAULT_OPERATOR: OperatorInfo = {
  name: "",
  legalForm: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Schweiz",
  email: "",
  phone: "",
  uid: "",
  vatNumber: "",
  representative: "",
  vatRegistered: false,
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [r] = await db.select().from(schema.platformSettings).where(eq(schema.platformSettings.key, key));
  return r ? ({ ...fallback, ...(r.value as object) } as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(schema.platformSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.platformSettings.key, set: { value, updatedAt: new Date() } });
}

export const getOperator = cache(() => getSetting<OperatorInfo>("operator", DEFAULT_OPERATOR));

export async function vatNote(): Promise<string> {
  const op = await getOperator();
  const trial = env.TRIAL_DAYS > 0 ? `${env.TRIAL_DAYS} Tage kostenlos testen. ` : "";
  return `${trial}Preise in CHF, monatlich kündbar zum Ende der Laufzeit. ${op.vatRegistered ? "Preise inkl. 8.1 % MWST." : "Es wird keine Mehrwertsteuer erhoben."} Stripe-Gebühren für Onlinezahlungen Ihrer Mieter werden direkt von Stripe belastet.`;
}
