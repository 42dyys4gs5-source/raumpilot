import { db, schema } from "@/lib/db";

/** Persist an error for the admin dashboard (and Sentry, if configured via instrumentation). */
export async function logError(source: string, err: unknown, context?: Record<string, unknown>) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`[${source}]`, e);
  try {
    await db.insert(schema.errorLog).values({
      source,
      message: e.message.slice(0, 2000),
      stack: e.stack?.slice(0, 8000) ?? null,
      context: context ?? null,
    });
  } catch (inner) {
    console.error("[logError] failed to persist", inner);
  }
}
