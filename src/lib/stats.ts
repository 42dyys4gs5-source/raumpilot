import { sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "@/lib/db";

export async function orgStats(orgId: string, zone: string) {
  const now = DateTime.now().setZone(zone);
  const m0 = now.startOf("month");
  const m1 = m0.minus({ months: 1 });
  const y0 = now.startOf("year");
  const q = async (from: DateTime, to: DateTime) => {
    const [r] = await db.execute<{ n: number; revenue: number; hours: number }>(sql`
      SELECT count(*)::int AS n, coalesce(sum(total_amount - deposit_amount),0)::int AS revenue,
             coalesce(sum(extract(epoch FROM ends_at - starts_at) / 3600),0)::float AS hours
      FROM bookings WHERE org_id = ${orgId} AND status = 'confirmed'
        AND starts_at >= ${from.toISO()}::timestamptz AND starts_at < ${to.toISO()}::timestamptz`);
    return r;
  };
  const [thisMonth, lastMonth, ytd] = await Promise.all([q(m0, m0.plus({ months: 1 })), q(m1, m0), q(y0, y0.plus({ years: 1 }))]);
  const [cx] = await db.execute<{ total: number; cancelled: number; lead: number | null }>(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status IN ('cancelled'))::int AS cancelled,
           avg(extract(epoch FROM starts_at - created_at) / 86400) FILTER (WHERE status = 'confirmed')::float AS lead
    FROM bookings WHERE org_id = ${orgId} AND created_at > now() - interval '365 days' AND status IN ('confirmed','cancelled')`);
  const monthly = await db.execute<{ month: string; revenue: number; n: number }>(sql`
    SELECT to_char(date_trunc('month', starts_at AT TIME ZONE ${zone}), 'YYYY-MM') AS month,
           coalesce(sum(total_amount - deposit_amount),0)::int AS revenue, count(*)::int AS n
    FROM bookings WHERE org_id = ${orgId} AND status = 'confirmed'
      AND starts_at >= ${now.minus({ months: 11 }).startOf("month").toISO()}::timestamptz
    GROUP BY 1 ORDER BY 1`);
  const perRoom = await db.execute<{ name: string; revenue: number; n: number; hours: number }>(sql`
    SELECT r.name, coalesce(sum(b.total_amount - b.deposit_amount),0)::int AS revenue, count(b.id)::int AS n,
           coalesce(sum(extract(epoch FROM b.ends_at - b.starts_at) / 3600),0)::float AS hours
    FROM rooms r LEFT JOIN bookings b ON b.room_id = r.id AND b.status = 'confirmed' AND b.starts_at >= ${y0.toISO()}::timestamptz
    WHERE r.org_id = ${orgId} AND r.status <> 'archived' GROUP BY r.id, r.name ORDER BY revenue DESC`);
  const [open] = await db.execute<{ due: number }>(sql`SELECT coalesce(sum(total_amount),0)::int AS due FROM bookings WHERE org_id = ${orgId} AND status = 'confirmed' AND payment_status = 'offline_due'`);
  return { thisMonth, lastMonth, ytd, cancellationRate: cx.total ? cx.cancelled / cx.total : 0, avgLeadDays: cx.lead, monthly, perRoom, openOffline: open.due };
}
