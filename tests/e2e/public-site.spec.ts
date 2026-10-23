import { expect, test } from "@playwright/test";

const PAGES = ["/", "/funktionen", "/preise", "/so-funktionierts", "/faq", "/kontakt", "/loesungen", "/loesungen/partyraeume", "/raeume", "/hilfe", "/hilfe/onlinezahlung", "/ratgeber", "/ratgeber/partyraum-vermieten", "/ratgeber/vereinslokal-vermieten", "/loesungen/gemeinschaftsraeume", "/tools/raum-umsatzrechner", "/rechtliches/datenschutz", "/rechtliches/impressum", "/registrieren", "/login"];

for (const path of PAGES) {
  test(`Seite ${path} lädt mit Titel und ohne Fehler`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.title()).toContain("Raumvia");
    expect(errors).toEqual([]);
  });
}

test("SEO: sitemap, robots, canonical und strukturierte Daten", async ({ page, request }) => {
  const sm = await request.get("/sitemap.xml");
  expect(sm.status()).toBe(200);
  expect(await sm.text()).toContain("/loesungen/eventraeume");
  expect(await sm.text()).toContain("/tools/raum-umsatzrechner");
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /app");
  await page.goto("/faq");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe("http://localhost:3100/faq");
  expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain("FAQPage");
});

test("Umsatzrechner zeigt nachvollziehbare CHF-Schätzungen", async ({ page }) => {
  await page.goto("/tools/raum-umsatzrechner");
  await page.getByLabel("Mietpreis pro Stunde (CHF)").fill("100");
  await page.getByLabel("Buchbare Stunden pro Woche").fill("10");
  await page.getByLabel(/Erwartete Auslastung/).fill("50");
  await page.getByLabel(/Monatliche Betriebskosten/).fill("500");
  await expect(page.getByText("CHF 2’167.– / Monat").first()).toBeVisible();
  await expect(page.getByText("CHF 1’667.– pro Monat")).toBeVisible();
  await expect(page.getByText(/keine Umsatzgarantie/)).toBeVisible();
});

test("Umsatzrechner lässt sich mit der Tastatur bedienen", async ({ page }) => {
  await page.goto("/tools/raum-umsatzrechner");
  const occupancy = page.getByRole("slider", { name: /Erwartete Auslastung/ });
  await occupancy.focus();
  await occupancy.press("End");
  await expect(page.getByText(/Erwartete Auslastung: 100%/)).toBeVisible();
  await expect(page.getByText("CHF 6’933.– / Monat").first()).toBeVisible();
});

test("Kontaktformular erstellt eine Anfrage", async ({ page }) => {
  await page.goto("/kontakt");
  await page.getByLabel("Name").fill("Interessentin");
  await page.getByLabel("E-Mail").fill("interessentin@example.ch");
  await page.getByLabel("Nachricht").fill("Ich habe drei Proberäume und eine Frage zu TWINT.");
  await page.getByRole("checkbox").check();
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: "Nachricht senden" }).click();
  await expect(page.getByText("Danke für Ihre Nachricht!")).toBeVisible();
});
