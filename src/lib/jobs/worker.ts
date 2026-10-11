import { and, eq, gte, lt, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { expireManualPlans } from "@/lib/billing/subscription";
import { expireStale, sendDueReminders } from "@/lib/booking/engine";
import { syncFeed } from "@/lib/calendar/sync";
import { adminAlertMail, welcomeMail } from "@/lib/email/templates";
import { sendEmail, type OutgoingEmail } from "@/lib/email/send";
import { cleanupRateLimits } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/errors";
import { formatMoney } from "@/lib/utils/money";
import { enqueue, enqueueEmail, type JobType } from "./queue";

type Job = typeof schema.jobs.$inferSelect;

const handlers: Record<JobType, (job: Job) => Promise<void>> = {
  "email.send": async (job) => {
    await sendEmail(job.payload as unknown as OutgoingEmail, job.dedupeKey ?? `job-${job.id}`);
  },

  "welcome.step": async (job) => {
    const { userId, step } = job.payload as { userId: string; step: number };
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!u || u.disabledAt) return;
    // Skip tips that are no longer relevant.
    const [m] = await db
      .select({ org: schema.organizations })
      .from(schema.memberships)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.orgId))
      .where(eq(schema.memberships.userId, userId))
      .limit(1);
    if (step === 10 && m?.org.stripeChargesEnabled) return;
    if (step === 2) {
      const [r] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM rooms WHERE org_id = ${m?.org.id ?? null} AND status = 'published'`);
      if ((r?.n ?? 0) > 0) return;
    }
    const mail = welcomeMail(step, u.name);
    if (mail) await sendEmail({ to: u.email, ...mail, template: `welcome.${step}` }, `welcome:${userId}:${step}`);
  },

  "ical.sync": async (job) => {
    const { feedId } = job.payload as { feedId?: string };
    const feeds = feedId
      ? [{ id: feedId }]
      : await db.select({ id: schema.calendarFeeds.id }).from(schema.calendarFeeds).where(eq(schema.calendarFeeds.active, true));
    for (const f of feeds) {
      try {
        await syncFeed(f.id);
      } catch (err) {
        await logError("ical.sync", err, { feedId: f.id });
      }
    }
  },

  "booking.reminders": async () => {
    await sendDueReminders();
  },

  "booking.expire": async () => {
    await db.transaction((tx) => expireStale(tx));
  },

  "system.daily": async () => {
    const checks: Record<string, unknown> = {};
    let ok = true;
    // Database reachable & migrations present
    const [mig] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`).catch(() => [{ n: -1 }]);
    checks.migrations = mig?.n;
    if ((mig?.n ?? -1) < 1) ok = false;
    // Failed jobs in the last 24 h
    const [failed] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM jobs WHERE status = 'failed' AND created_at > now() - interval '1 day'`);
    checks.failedJobs = failed.n;
    if (failed.n > 0) ok = false;
    // Stuck jobs
    const [stuck] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM jobs WHERE status = 'pending' AND run_at < now() - interval '30 minutes'`);
    checks.overdueJobs = stuck.n;
    if (stuck.n > 20) ok = false;
    // Unprocessed Stripe events
    const [se] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM stripe_events WHERE processed_at IS NULL AND received_at < now() - interval '1 hour'`);
    checks.unprocessedStripeEvents = se.n;
    if (se.n > 0) ok = false;
    // Errors in the last 24 h
    const [errs] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM error_log WHERE created_at > now() - interval '1 day'`);
    checks.errors24h = errs.n;
    // Backup check: the most recent external backup run must report within 26 h (see docs/BETRIEB.md)
    const [bk] = await db.execute<{ last: Date | null }>(sql`SELECT max(created_at) AS last FROM system_checks WHERE kind = 'backup' AND ok`);
    checks.lastBackup = bk?.last ?? null;
    // Only enforced once an external backup job has reported at least once (monitoring active).
    if (bk?.last && Date.now() - new Date(bk.last).getTime() > 26 * 3600_000) {
      checks.backupWarning = "Keine erfolgreiche Sicherung in den letzten 26 Stunden gemeldet.";
      ok = false;
    }
    await db.insert(schema.systemChecks).values({ kind: "daily", ok, details: checks });
    await cleanupRateLimits();
    await expireManualPlans();
    await db.execute(sql`DELETE FROM sessions WHERE expires_at < now()`);
    await db.execute(sql`DELETE FROM jobs WHERE status = 'done' AND completed_at < now() - interval '30 days'`);
    await db.execute(sql`DELETE FROM email_log WHERE created_at < now() - interval '180 days'`);
    await db.execute(sql`UPDATE email_log SET debug_body = NULL WHERE debug_body IS NOT NULL AND created_at < now() - interval '7 days'`);
    if (!ok && env.ADMIN_ALERT_EMAIL) {
      await enqueueEmail(
        db,
        { to: env.ADMIN_ALERT_EMAIL, ...adminAlertMail("Tägliche Systemprüfung: Handlungsbedarf", Object.entries(checks).map(([k, v]) => [k, String(v)])), template: "admin.alert" },
        `mail:daily-check:${DateTime.now().toISODate()}`,
      );
    }
  },

  "report.monthly": async () => {
    if (!env.ADMIN_ALERT_EMAIL) return;
    const now = DateTime.now().setZone("Europe/Zurich");
    const from = now.minus({ months: 1 }).startOf("month");
    const to = from.endOf("month");
    const [mrr] = await db.execute<{ n: number }>(sql`SELECT coalesce(sum(amount_monthly),0)::int AS n FROM subscriptions WHERE status IN ('active','past_due') AND source = 'stripe'`);
    const [active] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM subscriptions WHERE status IN ('active','trialing','past_due')`);
    const [newOrgs] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.organizations)
      .where(and(gte(schema.organizations.createdAt, from.toJSDate()), lt(schema.organizations.createdAt, to.toJSDate())));
    const [churn] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM subscriptions WHERE canceled_at >= ${from.toISO()}::timestamptz AND canceled_at <= ${to.toISO()}::timestamptz`);
    const [inv] = await db.execute<{ n: number }>(sql`SELECT coalesce(sum(amount_paid),0)::int AS n FROM invoices WHERE status = 'paid' AND created_at >= ${from.toISO()}::timestamptz AND created_at <= ${to.toISO()}::timestamptz`);
    const [bk] = await db.execute<{ n: number; v: number }>(sql`SELECT count(*)::int AS n, coalesce(sum(total_amount),0)::int AS v FROM bookings WHERE status = 'confirmed' AND created_at >= ${from.toISO()}::timestamptz AND created_at <= ${to.toISO()}::timestamptz`);
    await sendEmail(
      {
        to: env.ADMIN_ALERT_EMAIL,
        ...adminAlertMail(`Monatsbericht ${from.setLocale("de-CH").toFormat("LLLL yyyy")}`, [
          ["MRR (aktuell)", formatMoney(mrr.n)],
          ["Aktive Abos", String(active.n)],
          ["Neue Vermieter", String(newOrgs.n)],
          ["Kündigungen", String(churn.n)],
          ["Abo-Umsatz (bezahlt)", formatMoney(inv.n)],
          ["Bestätigte Buchungen", String(bk.n)],
          ["Buchungsvolumen der Vermieter", formatMoney(bk.v)],
        ]),
        template: "admin.monthly_report",
      },
      `monthly-report:${from.toISODate()}`,
    );
  },
};

/** Claim and run due jobs. Uses SKIP LOCKED so several workers can run in parallel safely. */
export async function runDueJobs(limit = 25, deadlineMs = 50_000): Promise<{ done: number; failed: number; retried: number }> {
  const started = Date.now();
  const stats = { done: 0, failed: 0, retried: 0 };
  while (Date.now() - started < deadlineMs) {
    const claimed = await db.execute<{ id: number }>(sql`
      UPDATE jobs SET status = 'running', locked_at = now(), attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM jobs
        WHERE (status = 'pending' AND run_at <= now()) OR (status = 'running' AND locked_at < now() - interval '10 minutes')
        ORDER BY run_at LIMIT ${limit} FOR UPDATE SKIP LOCKED)
      RETURNING id`);
    if (!claimed.length) break;
    for (const { id } of claimed) {
      const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, Number(id)));
      if (!job) continue;
      try {
        const handler = handlers[job.type as JobType];
        if (!handler) throw new Error(`Unbekannter Job-Typ ${job.type}`);
        await handler(job);
        await db.update(schema.jobs).set({ status: "done", completedAt: new Date(), lastError: null }).where(eq(schema.jobs.id, job.id));
        stats.done++;
      } catch (err) {
        const msg = String((err as Error)?.message ?? err).slice(0, 1000);
        if (job.attempts >= job.maxAttempts) {
          await db.update(schema.jobs).set({ status: "failed", lastError: msg }).where(eq(schema.jobs.id, job.id));
          await logError(`job:${job.type}`, err, { jobId: job.id });
          if (env.ADMIN_ALERT_EMAIL && job.type !== "email.send") {
            await enqueueEmail(db, { to: env.ADMIN_ALERT_EMAIL, ...adminAlertMail("Hintergrundjob endgültig fehlgeschlagen", [["Job", `${job.type} #${job.id}`], ["Fehler", msg]]), template: "admin.alert" }, `mail:job-failed:${job.id}`);
          }
          stats.failed++;
        } else {
          // Exponential backoff: 1, 2, 4, 8 … minutes (max 6 h)
          const delay = Math.min(2 ** (job.attempts - 1), 360) * 60_000;
          await db.update(schema.jobs).set({ status: "pending", lastError: msg, runAt: new Date(Date.now() + delay) }).where(eq(schema.jobs.id, job.id));
          stats.retried++;
        }
      }
    }
  }
  return stats;
}

/** Periodic scheduling – called by the cron endpoint. Dedupe keys make it safe to call often. */
export async function schedulePeriodic(now = new Date()) {
  const z = DateTime.fromJSDate(now).setZone("Europe/Zurich");
  const quarter = Math.floor(z.minute / 15);
  await enqueue(db, "booking.expire", {}, { dedupeKey: `expire:${z.toFormat("yyyy-LL-dd'T'HH:mm")}` });
  await enqueue(db, "booking.reminders", {}, { dedupeKey: `reminders:${z.toFormat("yyyy-LL-dd'T'HH")}:${quarter}` });
  await enqueue(db, "ical.sync", {}, { dedupeKey: `ical:${z.toFormat("yyyy-LL-dd'T'HH")}:${Math.floor(z.minute / 30)}` });
  if (z.hour >= 3) await enqueue(db, "system.daily", {}, { dedupeKey: `daily:${z.toISODate()}` });
  if (z.day === 1 && z.hour >= 7) await enqueue(db, "report.monthly", {}, { dedupeKey: `monthly:${z.toFormat("yyyy-LL")}` });
}
