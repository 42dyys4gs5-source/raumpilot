import { randomUUID } from "node:crypto";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";

/** Minimal Sentry envelope client (no SDK needed). Only active when SENTRY_DSN is set. */
async function sendToSentry(source: string, e: Error, context?: Record<string, unknown>) {
  if (!env.SENTRY_DSN) return;
  try {
    const dsn = new URL(env.SENTRY_DSN);
    const projectId = dsn.pathname.replace(/\//g, "");
    const eventId = randomUUID().replace(/-/g, "");
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "node",
      level: "error",
      environment: process.env.VERCEL_ENV ?? env.NODE_ENV,
      tags: { source },
      extra: context,
      exception: { values: [{ type: e.name, value: e.message, stacktrace: e.stack ? { frames: e.stack.split("\n").slice(1, 30).reverse().map((l) => ({ function: l.trim() })) } : undefined }] },
    };
    const body = [JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
    await fetch(`${dsn.protocol}//${dsn.host}/api/${projectId}/envelope/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.username}, sentry_client=raumvia/1.0` },
      body,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* never fail because of monitoring */
  }
}

/** Persist an error for the admin dashboard and forward it to Sentry if configured. */
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
  await sendToSentry(source, e, context);
}
