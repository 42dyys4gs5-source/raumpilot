import { expect, test } from "@playwright/test";

test("Demo berechnet Extras, simuliert lokal und übergibt an Vermieteransicht", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST") writes.push(request.url()); });
  await page.goto("/demo");
  await expect(page.getByTestId("demo-total")).toHaveText("CHF 140.–");
  await page.getByLabel("Dauer", { exact: true }).selectOption("4");
  await page.getByLabel("Beamer dazubuchen").uncheck();
  await expect(page.getByTestId("demo-total")).toHaveText("CHF 240.–");
  await page.getByRole("button", { name: "Demo-Buchung simulieren" }).click();
  await expect(page.getByRole("heading", { name: "Demo-Buchung bestätigt" })).toBeVisible();
  await page.getByRole("button", { name: "In der Vermieteransicht ansehen" }).click();
  await expect(page.getByRole("article")).toContainText("CHF 240.–");
  await expect(page.getByRole("article")).toContainText("14:00–18:00");
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Demo zurücksetzen" }).click();
  await expect(page.getByTestId("demo-total")).toHaveText("CHF 140.–");
});

test("Erklärvideo lädt erst auf Wunsch und hat Textfassung", async ({ page }) => {
  await page.goto("/so-funktionierts");
  await expect(page.locator("video")).toHaveAttribute("preload", "none");
  await expect(page.locator("video")).toHaveAttribute("controls", "");
  await page.getByText("Videoinhalt als Text lesen", { exact: true }).click();
  await expect(page.getByText("Im Beispiel kosten zwei Stunden", { exact: false })).toBeVisible();
  const video = await page.request.get("/media/raumvia-erklaervideo.mp4");
  expect(video.ok()).toBeTruthy();
  expect(video.headers()["content-type"]).toContain("video/mp4");
});
