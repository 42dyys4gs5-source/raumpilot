import { expect, test } from "@playwright/test";
import { setupLandlord, uid } from "./utils";

for (const path of ["/", "/preise", "/loesungen/eventraeume", "/registrieren"]) {
  test(`Mobil: ${path} ohne horizontales Scrollen und mit Menü`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (path !== "/registrieren") {
      await page.getByRole("button", { name: "Menü öffnen" }).click();
      await expect(page.getByRole("navigation", { name: "Mobile Navigation" })).toBeVisible();
    }
  });
}

test("Mobil: Menü im Vermieter-Bereich öffnet sich über die ganze Höhe", async ({ page }) => {
  await setupLandlord(page, { email: `mobil-${uid()}@example.ch`, company: `Studio ${uid()}`, room: "Saal Mobil" });
  await page.goto("/app");
  await page.getByRole("button", { name: "Menü öffnen" }).click();
  const dialog = page.getByRole("dialog", { name: "Menü" });
  await expect(dialog.getByRole("link", { name: "Übersicht" })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Abmelden" })).toBeInViewport();
  await dialog.getByRole("link", { name: "Gutscheine" }).click();
  await expect(page).toHaveURL(/\/app\/gutscheine/);
  await expect(dialog).toBeHidden();
  await page.getByRole("navigation", { name: "Schnellzugriff" }).getByRole("link", { name: "Kalender" }).click();
  await expect(page).toHaveURL(/\/app\/kalender/);
});
