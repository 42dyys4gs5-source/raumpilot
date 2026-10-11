import { expect, test } from "@playwright/test";

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
