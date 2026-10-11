import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://raumpilot:raumpilot@localhost:5432/raumpilot_test",
      EMAIL_MODE: "log",
      PAYMENTS_MODE: "fake",
      APP_URL: "http://localhost:3100",
      STRIPE_WEBHOOK_SECRET: "whsec_test_platform_secret",
      STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_test_connect_secret",
    },
    setupFiles: ["tests/setup.ts"],
  },
});
