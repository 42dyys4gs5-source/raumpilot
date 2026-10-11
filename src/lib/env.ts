import { z } from "zod";

/**
 * Central, validated runtime configuration.
 * Never import secrets elsewhere via process.env directly – always use `env`.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("postgres://raumpilot:raumpilot@localhost:5432/raumpilot_dev"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),
  /** ≥32 chars random. Used for HMAC of booking links and similar. */
  APP_SECRET: z.string().min(32).default("dev-only-insecure-app-secret-change-me-0000"),
  /** 32 bytes, base64. Used for AES-256-GCM encryption of TOTP secrets and iCal URLs. */
  ENCRYPTION_KEY: z.string().min(40).default("ZGV2LW9ubHktaW5zZWN1cmUta2V5LWNoYW5nZS1tZSE="),
  CRON_SECRET: z.string().min(16).default("dev-only-cron-secret"),

  PAYMENTS_MODE: z.enum(["stripe", "disabled", "fake"]).default("disabled"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(),
  /** Platform fee on tenant bookings in basis points (0 = none). */
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(2000).default(0),
  TRIAL_DAYS: z.coerce.number().int().min(0).max(60).default(14),

  EMAIL_MODE: z.enum(["resend", "log"]).default("log"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Raumvia <info@raumvia.ch>"),
  EMAIL_REPLY_TO: z.string().optional(),
  ADMIN_ALERT_EMAIL: z.string().email().optional(),

  STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("media"),

  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Ungültige Konfiguration: " + JSON.stringify(parsed.error.flatten().fieldErrors));
  }
  const e = parsed.data;
  // Hard production guards: never run production with dev defaults or fake payments.
  // E2E_TEST_MODE allows a production build with test settings – only on localhost.
  if (process.env.E2E_TEST_MODE && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.APP_URL)) {
    throw new Error("E2E_TEST_MODE ist nur mit APP_URL auf localhost erlaubt.");
  }
  if (e.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && !process.env.E2E_TEST_MODE) {
    const problems: string[] = [];
    if (e.APP_SECRET.startsWith("dev-only")) problems.push("APP_SECRET");
    if (e.ENCRYPTION_KEY === "ZGV2LW9ubHktaW5zZWN1cmUta2V5LWNoYW5nZS1tZSE=") problems.push("ENCRYPTION_KEY");
    if (e.CRON_SECRET.startsWith("dev-only")) problems.push("CRON_SECRET");
    if (e.PAYMENTS_MODE === "fake") problems.push("PAYMENTS_MODE=fake");
    if (e.PAYMENTS_MODE === "stripe" && (!e.STRIPE_SECRET_KEY || !e.STRIPE_WEBHOOK_SECRET)) problems.push("STRIPE_*");
    if (e.EMAIL_MODE === "resend" && !e.RESEND_API_KEY) problems.push("RESEND_API_KEY");
    if (e.STORAGE_DRIVER === "supabase" && (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY)) problems.push("SUPABASE_*");
    if (problems.length) throw new Error("Unsichere Produktionskonfiguration: " + problems.join(", "));
  }
  return e;
}

export const env = load();
export const isProd = env.NODE_ENV === "production";
export const paymentsEnabled = env.PAYMENTS_MODE !== "disabled";
export const appUrl = (path = "") => env.APP_URL.replace(/\/$/, "") + path;
