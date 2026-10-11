import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function platformMetrics() {
  const one = async <T,>(q: ReturnType<typeof sql>) => ((await db.execute(q)) as unknown as T[])[0];
  const [subs, orgs, bookings, rooms, errors, tickets, invoices, failed, churn] = await Promise.all([
    one<{ mrr: number; active: number; trialing: number; past_due: number; manual: number }>(sql`
      SELECT coalesce(sum(amount_monthly) FILTER (WHERE status IN ('active','past_due') AND source = 'stripe'),0)::int AS mrr,
             count(*) FILTER (WHERE status = 'active')::int AS active,
             count(*) FILTER (WHERE status = 'trialing')::int AS trialing,
             count(*) FILTER (WHERE status = 'past_due')::int AS past_due,
             count(*) FILTER (WHERE source = 'manual' AND status = 'active')::int AS manual
      FROM subscriptions`),
    one<{ total: number; new30: number; suspended: number }>(sql`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS new30,
             count(*) FILTER (WHERE suspended_at IS NOT NULL)::int AS suspended FROM organizations`),
    one<{ n30: number; volume30: number; total: number; volume: number }>(sql`
      SELECT count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS n30,
             coalesce(sum(total_amount) FILTER (WHERE created_at > now() - interval '30 days'),0)::int AS volume30,
             count(*)::int AS total, coalesce(sum(total_amount),0)::int AS volume
      FROM bookings WHERE status = 'confirmed'`),
    one<{ published: number; new30: number }>(sql`
      SELECT count(*) FILTER (WHERE status = 'published')::int AS published, count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS new30 FROM rooms`),
    one<{ open: number; d1: number }>(sql`SELECT count(*) FILTER (WHERE resolved_at IS NULL)::int AS open, count(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS d1 FROM error_log`),
    one<{ open: number }>(sql`SELECT count(*) FILTER (WHERE status = 'open')::int AS open FROM support_tickets`),
    one<{ revenue: number; revenue30: number }>(sql`SELECT coalesce(sum(amount_paid),0)::int AS revenue, coalesce(sum(amount_paid) FILTER (WHERE created_at > now() - interval '30 days'),0)::int AS revenue30 FROM invoices WHERE status = 'paid'`),
    one<{ n: number }>(sql`SELECT count(*)::int AS n FROM invoices WHERE status = 'open' AND amount_paid = 0 AND created_at > now() - interval '60 days'`),
    one<{ n30: number; scheduled: number }>(sql`SELECT count(*) FILTER (WHERE canceled_at > now() - interval '30 days')::int AS n30, count(*) FILTER (WHERE cancel_at_period_end AND status IN ('active','trialing'))::int AS scheduled FROM subscriptions`),
  ]);
  const signups = (await db.execute(sql`
    SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week, count(*)::int AS n FROM organizations
    WHERE created_at > now() - interval '12 weeks' GROUP BY 1 ORDER BY 1`)) as unknown as { week: string; n: number }[];
  return { subs, orgs, bookings, rooms, errors, tickets, invoices, failed, churn, signups };
}
