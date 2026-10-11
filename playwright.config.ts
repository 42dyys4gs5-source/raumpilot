import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_ENV = {
  NODE_ENV: "production",
  E2E_TEST_MODE: "1",
  APP_URL: `http://localhost:${PORT}`,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://raumpilot:raumpilot@localhost:5432/raumpilot_e2e",
  PAYMENTS_MODE: "fake",
  EMAIL_MODE: "log",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: "./test-results/storage",
  TRIAL_DAYS: "14",
  ADMIN_ALERT_EMAIL: "alerts@example.ch",
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure", locale: "de-CH", timezoneId: "Europe/Zurich" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: E2E_ENV,
  },
});
