import { expect, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_ENV } from "../../playwright.config";

export const db = postgres(E2E_ENV.DATABASE_URL, { max: 2, onnotice: () => {} });

export const uid = () => Math.random().toString(36).slice(2, 8);

/** Reads the newest logged e-mail (EMAIL_MODE=log) for a recipient and returns the first link matching `pattern`. */
export async function linkFromMail(to: string, pattern: RegExp, template?: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const rows = await db<{ debug_body: string }[]>`
      SELECT debug_body FROM email_log WHERE "to" = ${to} ${template ? db`AND template = ${template}` : db``} ORDER BY created_at DESC LIMIT 1`;
    const m = rows[0]?.debug_body?.match(pattern);
    if (m) return m[0];
    // Jobs are processed right after the response; give them a moment, then trigger the worker.
    await fetch(`${E2E_ENV.APP_URL}/api/cron/run`, { headers: { authorization: "Bearer dev-only-cron-secret" } }).catch(() => {});
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Keine E-Mail an ${to} mit ${pattern}`);
}

export async function mailTemplates(to: string): Promise<string[]> {
  await fetch(`${E2E_ENV.APP_URL}/api/cron/run`, { headers: { authorization: "Bearer dev-only-cron-secret" } }).catch(() => {});
  const rows = await db<{ template: string }[]>`SELECT template FROM email_log WHERE "to" = ${to} ORDER BY created_at`;
  return rows.map((r) => r.template);
}

export async function register(page: Page, o: { email: string; company: string; plan?: string }) {
  await page.goto(`/registrieren${o.plan ? `?tarif=${o.plan}` : ""}`);
  await page.getByLabel("Ihr Name").fill("Lea Vermieterin");
  await page.getByLabel("Firma / Angebotsname").fill(o.company);
  await page.getByLabel("E-Mail-Adresse").fill(o.email);
  await page.getByLabel("Passwort", { exact: true }).fill("Sicher-Test-2026");
  await page.getByLabel("Strasse und Nr.").fill("Seestrasse 1");
  await page.getByLabel("PLZ", { exact: true }).fill("8002");
  await page.getByLabel("Ort", { exact: true }).fill("Zürich");
  await page.waitForTimeout(1600); // anti-bot minimum fill time
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/email-bestaetigen/);
  const link = await linkFromMail(o.email, /http:\/\/localhost:3100\/email-bestaetigen\/[A-Za-z0-9_-]+/);
  await page.goto(link);
  await expect(page).toHaveURL(/app\/onboarding/);
}

export async function login(page: Page, email: string, password = "Sicher-Test-2026") {
  await page.goto("/login");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login") || u.search.includes("fehler"), { timeout: 15_000 }).catch(() => {});
}

/** Complete landlord setup: org + published room with active plan (via fake checkout). Returns room slug. */
export async function setupLandlord(page: Page, o: { email: string; company: string; room: string; plan?: string }) {
  await register(page, { email: o.email, company: o.company });
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByLabel("Name des Raums").fill(o.room);
  await page.getByLabel("Preis pro Stunde (CHF)").fill("60");
  await page.getByRole("button", { name: "Raum erstellen" }).click();
  await expect(page.getByRole("heading", { name: "Wählen Sie Ihren Tarif" })).toBeVisible();
  const planName = o.plan ?? "Professional";
  const card = page.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: planName, exact: true }) }).first();
  await card.getByRole("button", { name: "Tarif wählen" }).click();
  await expect(page).toHaveURL(/dev\/checkout/);
  await page.getByRole("button", { name: "Abo abschliessen" }).click();
  await expect(page).toHaveURL(/app\/abonnement/);
  await expect(page.getByText("Testphase", { exact: true }).first()).toBeVisible();
  // Publish room
  await page.goto("/app/raeume");
  await page.getByRole("link", { name: new RegExp(o.room) }).first().click();
  await page.getByRole("link", { name: "Allgemein" }).click();
  await page.getByLabel("Beschreibung", { exact: true }).fill("Heller Raum mit grossen Fenstern, ideal für Workshops, Geburtstage und Vereinsanlässe. Gute ÖV-Anbindung und Küche vorhanden.");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Gespeichert.")).toBeVisible();
  await page.getByRole("link", { name: "Veröffentlichen" }).first().click();
  await page.getByRole("button", { name: "Jetzt veröffentlichen" }).click();
  await expect(page.getByText("Der Raum ist jetzt online buchbar.")).toBeVisible();
  const rows = await db<{ slug: string }[]>`SELECT r.slug FROM rooms r JOIN organizations o ON o.id = r.org_id WHERE o.contact_email = ${o.email}`;
  return rows[0].slug;
}

/** Books the first available slot on the public room page; returns the resulting URL. */
export async function bookFirstSlot(page: Page, slug: string, c = { name: "Max Muster", email: `kunde-${uid()}@example.ch` }) {
  await page.goto(`/r/${slug}`);
  // pick next month to avoid lead-time edge cases
  await page.getByRole("button", { name: "Nächster Monat" }).click();
  const day = page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: /^\d+$/ }).first();
  await day.click();
  const slot = page.getByRole("group", { name: "Startzeiten" }).getByRole("button").first();
  await slot.click();
  await expect(page.getByText("Total")).toBeVisible();
  await page.getByLabel("Name *").fill(c.name);
  await page.getByLabel("E-Mail *").fill(c.email);
  await page.locator('form[aria-label="Buchungsformular"] input[type="checkbox"]').last().check();
  return c;
}
