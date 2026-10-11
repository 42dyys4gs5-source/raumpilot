import { expect, test } from "@playwright/test";
import { bookFirstSlot, db, linkFromMail, login, mailTemplates, setupLandlord, uid } from "./utils";

test.describe.configure({ mode: "serial" });

const email = `vermieterin-${uid()}@example.ch`;
let slug = "";

test("Vermieterin registriert sich, richtet Raum ein, schliesst Abo ab und veröffentlicht", async ({ page }) => {
  slug = await setupLandlord(page, { email, company: `Studio ${uid()}`, room: "Saal Seeblick" });
  expect(slug).toContain("saal-seeblick");
  await page.goto(`/r/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "Saal Seeblick" })).toBeVisible();
  const mails = await mailTemplates(email);
  expect(mails).toContain("auth.verify_email");
  expect(mails).toContain("subscription.started");
});

test("Kunde bucht (Bezahlung vor Ort) und erhält Bestätigung; Vermieterin sieht Buchung", async ({ page, browser }) => {
  const c = await bookFirstSlot(page, slug);
  await page.getByRole("button", { name: "Verbindlich buchen" }).click();
  await expect(page).toHaveURL(/\/buchung\//);
  await expect(page.getByText("Bestätigt")).toBeVisible();
  const mails = await mailTemplates(c.email);
  expect(mails).toContain("booking.confirmed");
  expect((await mailTemplates(email))).toContain("landlord.new_booking");

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, email);
  await p2.goto("/app/buchungen");
  await expect(p2.getByText(c.name)).toBeVisible();
  await ctx.close();
});

test("Derselbe Termin kann nicht ein zweites Mal gebucht werden", async ({ page }) => {
  const rows = await db<{ starts_at: Date }[]>`SELECT b.starts_at FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE r.slug = ${slug} AND b.status = 'confirmed' LIMIT 1`;
  const taken = rows[0].starts_at.toISOString();
  const roomId = (await db<{ id: string }[]>`SELECT id FROM rooms WHERE slug = ${slug}`)[0].id;
  const res = await page.request.post("/api/bookings", {
    headers: { origin: "http://localhost:3100" },
    data: { roomId, start: taken, durationMinutes: 120, guests: 2, extras: [], customer: { name: "Zweiter", email: "zweiter@example.ch" }, acceptTerms: true },
  });
  expect(res.status()).toBe(409);
  expect((await res.json()).error).toContain("nicht mehr verfügbar");
});

test("Kunde storniert selbst über den Link", async ({ page }) => {
  const c = await bookFirstSlot(page, slug);
  await page.getByRole("button", { name: "Verbindlich buchen" }).click();
  await expect(page.getByText("Bestätigt")).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Verbindlich stornieren" }).click();
  await expect(page.getByText("Ihre Buchung wurde storniert.")).toBeVisible();
  expect(await mailTemplates(c.email)).toContain("booking.cancelled");
});

test("Onlinezahlung: Stripe verbinden, bezahlen, Beleg, Stornierung mit Rückerstattung", async ({ page }) => {
  await login(page, email);
  await page.goto("/app/einnahmen");
  await page.getByRole("button", { name: "Stripe-Konto verbinden" }).click();
  await expect(page).toHaveURL(/dev\/checkout/);
  await page.getByRole("button", { name: "Konto verifizieren" }).click();
  await expect(page).toHaveURL(/app\/einnahmen/);
  await expect(page.getByText("Aktiv").first()).toBeVisible();

  await page.goto("/app/raeume");
  await page.getByRole("link", { name: /Saal Seeblick/ }).first().click();
  await page.getByRole("link", { name: "Preise & Buchungsart" }).click();
  await page.getByLabel(/Online bei Buchung/).check();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Gespeichert.")).toBeVisible();

  const c = await bookFirstSlot(page, slug);
  await page.getByRole("button", { name: "Weiter zur Zahlung" }).click();
  await expect(page).toHaveURL(/dev\/checkout/);
  await page.getByRole("button", { name: "Zahlung erfolgreich" }).click();
  await expect(page).toHaveURL(/zahlung=erfolgreich/);
  await expect(page.getByText("Zahlung erhalten – Buchung bestätigt")).toBeVisible();
  await expect(page.getByText("Online bezahlt")).toBeVisible();
  await page.getByRole("link", { name: "Zahlungsbeleg" }).click();
  await expect(page.getByRole("heading", { name: "Zahlungsbeleg" }).or(page.getByText("Zahlungsbeleg").first())).toBeVisible();
  await page.goBack();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Verbindlich stornieren" }).click();
  await expect(page.getByText("Die Rückerstattung ist veranlasst.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Rückerstattet").first()).toBeVisible();
  const mails = await mailTemplates(c.email);
  expect(mails).toContain("booking.receipt");
  expect(mails.filter((m) => m === "booking.confirmed")).toHaveLength(1);
});

test("Zahlungsabbruch gibt den Termin wieder frei", async ({ page }) => {
  const c = await bookFirstSlot(page, slug);
  await page.getByRole("button", { name: "Weiter zur Zahlung" }).click();
  await expect(page).toHaveURL(/dev\/checkout/);
  await page.getByRole("button", { name: "Abbrechen (Sitzung abgelaufen)" }).click();
  await expect(page).toHaveURL(/zahlung=abgebrochen/);
  await expect(page.getByText("Abgelaufen")).toBeVisible();
  const rows = await db<{ status: string }[]>`SELECT status FROM bookings WHERE customer_email = ${c.email}`;
  expect(rows[0].status).toBe("expired");
});

test("Zahlungsfehler wird dem Kunden gemeldet", async ({ page }) => {
  const c = await bookFirstSlot(page, slug);
  await page.getByRole("button", { name: "Weiter zur Zahlung" }).click();
  await page.getByRole("button", { name: "Zahlung fehlgeschlagen" }).click();
  await expect(page).toHaveURL(/zahlung=abgebrochen/);
  expect(await mailTemplates(c.email)).toContain("booking.payment_failed");
});

test("Buchungsanfrage: Vermieterin nimmt an, Kunde bezahlt über Link", async ({ page, browser }) => {
  await login(page, email);
  await page.goto("/app/raeume");
  await page.getByRole("link", { name: /Saal Seeblick/ }).first().click();
  await page.getByRole("link", { name: "Preise & Buchungsart" }).click();
  await page.getByLabel(/Buchungsanfrage/).check();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Gespeichert.")).toBeVisible();

  const ctx = await browser.newContext();
  const customer = await ctx.newPage();
  const c = await bookFirstSlot(customer, slug);
  await customer.getByRole("button", { name: "Unverbindlich anfragen" }).click();
  await expect(customer.getByText("Anfrage beim Vermieter")).toBeVisible();
  const manageUrl = customer.url();

  await page.goto("/app/buchungen?f=offen");
  await page.getByRole("link", { name: /Uhr/ }).first().click();
  await page.getByRole("button", { name: "Annehmen" }).click();
  await expect(page.getByText("Anfrage angenommen.")).toBeVisible();
  expect(await mailTemplates(c.email)).toContain("booking.awaiting_payment");

  await customer.goto(manageUrl);
  await customer.getByRole("link", { name: "Jetzt bezahlen" }).click();
  await customer.getByRole("button", { name: "Zahlung erfolgreich" }).click();
  await expect(customer.getByText("Zahlung erhalten – Buchung bestätigt")).toBeVisible();
  await ctx.close();
});

test("Abo: Kündigung zum Laufzeitende, Verlängerung und fehlgeschlagene Zahlung", async ({ page }) => {
  await login(page, email);
  await page.goto("/app/abonnement");
  await page.getByRole("button", { name: /Tarif wechseln, Zahlungsmittel ändern oder kündigen/ }).click();
  await page.getByRole("button", { name: "Verlängerung simulieren (Zahlung OK)" }).click();
  await expect(page.getByText("Bezahlt")).toBeVisible();
  await page.getByRole("button", { name: /Tarif wechseln/ }).click();
  await page.getByRole("button", { name: "Fehlgeschlagene Zahlung simulieren" }).click();
  await expect(page.getByText("Zahlung offen").first()).toBeVisible();
  await page.getByRole("button", { name: /Tarif wechseln/ }).click();
  await page.getByRole("button", { name: "Zum Laufzeitende kündigen" }).click();
  await expect(page.getByText(/Ihr Abo ist gekündigt/)).toBeVisible();
  const mails = await mailTemplates(email);
  expect(mails).toContain("subscription.renewed");
  expect(mails).toContain("subscription.payment_failed");
  expect(mails).toContain("subscription.cancel_scheduled");
});

test("Passwort zurücksetzen", async ({ page }) => {
  await page.goto("/passwort-vergessen");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Link senden" }).click();
  await expect(page.getByText(/Falls ein Konto/)).toBeVisible();
  const link = await linkFromMail(email, /http:\/\/localhost:3100\/passwort-zuruecksetzen\/[A-Za-z0-9_-]+/, "auth.password_reset");
  await page.goto(link);
  await page.getByLabel("Neues Passwort").fill("Neues-Passwort-2027");
  await page.getByLabel("Passwort wiederholen").fill("Neues-Passwort-2027");
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(page).toHaveURL(/login\?passwort=neu/);
  await login(page, email, "Neues-Passwort-2027");
  await expect(page).toHaveURL(/\/app/);
  // Link is single-use
  await page.goto(link);
  await expect(page.getByText("Link ungültig oder abgelaufen")).toBeVisible();
});
