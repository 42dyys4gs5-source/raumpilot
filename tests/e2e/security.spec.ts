import { expect, test } from "@playwright/test";
import { totp } from "../../src/lib/auth/totp";
import { db, login, register, uid } from "./utils";

test("Geschützte Bereiche leiten zur Anmeldung um", async ({ page }) => {
  await page.goto("/app/buchungen");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("Falsches Passwort wird abgelehnt, ohne Konto-Existenz zu verraten", async ({ page }) => {
  await login(page, "gibt-es-nicht@example.ch", "Irgendwas-123");
  await expect(page.getByText("E-Mail-Adresse oder Passwort ist falsch.")).toBeVisible();
});

test("Datenisolation: Vermieter B sieht keine Buchungen und Räume von Vermieter A", async ({ page, browser }) => {
  const a = `a-${uid()}@example.ch`;
  await register(page, { email: a, company: `Firma A ${uid()}` });
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByLabel("Name des Raums").fill("Geheimer Raum");
  await page.getByLabel("Ort", { exact: true }).fill("Bern");
  await page.getByLabel("Preis pro Stunde (CHF)").fill("75");
  await page.getByRole("button", { name: "Raum erstellen" }).click();
  await expect(page.getByRole("heading", { name: "Wählen Sie Ihren Tarif" })).toBeVisible();
  const [room] = await db<{ id: string }[]>`SELECT r.id FROM rooms r JOIN organizations o ON o.id = r.org_id WHERE o.contact_email = ${a}`;

  const ctx = await browser.newContext();
  const pb = await ctx.newPage();
  await register(pb, { email: `b-${uid()}@example.ch`, company: `Firma B ${uid()}` });
  const res = await pb.goto(`/app/raeume/${room.id}`);
  expect(res?.status()).toBe(404);
  await pb.goto("/app/raeume");
  await expect(pb.getByText("Geheimer Raum")).toHaveCount(0);
  const qr = await pb.request.get(`/api/qr?room=${room.id}`);
  expect(qr.status()).toBe(404);
  await ctx.close();
});

test("API lehnt fremde Herkunft (CSRF) ab", async ({ request }) => {
  const res = await request.post("/api/bookings", { headers: { origin: "https://evil.example" }, data: {} });
  expect(res.status()).toBe(403);
});

test("Sicherheits-Header sind gesetzt", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  const embed = await request.get("/embed/gibt-es-nicht");
  expect(embed.headers()["x-frame-options"]).toBeUndefined();
});

test("Admin-Anmeldung erfordert Zwei-Faktor-Code", async ({ page }) => {
  await login(page, "admin@raumvia.test", "Admin-Passwort-2026");
  await expect(page).toHaveURL(/login\/mfa/);
  await page.getByLabel("Code").fill("000000");
  await page.getByRole("button", { name: "Bestätigen" }).click();
  await expect(page.getByText("Der Code ist ungültig.")).toBeVisible();
  await page.getByLabel("Code").fill(totp("JBSWY3DPEHPK3PXP"));
  await page.getByRole("button", { name: "Bestätigen" }).click();
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Plattform-Übersicht" })).toBeVisible();
  await expect(page.getByText("MRR (Stripe)")).toBeVisible();
  await page.goto("/admin/vermieter");
  await expect(page.getByRole("heading", { name: "Vermieter" })).toBeVisible();
});
