import { sql as dsql } from "drizzle-orm";
import { db, schema, type DbOrTx } from "@/lib/db";
import type { OutgoingEmail } from "@/lib/email/send";

export type JobType =
  | "email.send"
  | "welcome.step"
  | "ical.sync"
  | "booking.reminders"
  | "booking.expire"
  | "system.daily"
  | "report.monthly";

export type EnqueueOptions = { runAt?: Date; dedupeKey?: string; maxAttempts?: number };

/**
 * Enqueue a background job. Call with the current transaction so the job is only
 * created when the business change commits (transactional outbox).
 * With a dedupeKey, repeated calls (e.g. duplicate webhooks) never create a second job.
 */
export async function enqueue(tx: DbOrTx, type: JobType, payload: Record<string, unknown>, opts: EnqueueOptions = {}) {
  await tx
    .insert(schema.jobs)
    .values({
      type,
      payload,
      runAt: opts.runAt ?? new Date(),
      dedupeKey: opts.dedupeKey ?? null,
      maxAttempts: opts.maxAttempts ?? 6,
    })
    .onConflictDoNothing({ target: schema.jobs.dedupeKey });
}

export async function enqueueEmail(tx: DbOrTx, mail: OutgoingEmail, dedupeKey?: string, runAt?: Date) {
  await enqueue(tx, "email.send", mail as unknown as Record<string, unknown>, { dedupeKey, runAt, maxAttempts: 8 });
}

export async function pendingJobCount() {
  const r = await db.execute<{ n: number }>(dsql`SELECT count(*)::int AS n FROM jobs WHERE status = 'pending' AND run_at <= now()`);
  return r[0]?.n ?? 0;
}
