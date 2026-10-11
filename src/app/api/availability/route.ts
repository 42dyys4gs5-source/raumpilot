import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { availableStartTimes, dayStatus } from "@/lib/booking/availability";
import { loadAvailabilityRoom, loadBusy } from "@/lib/booking/engine";
import { db, schema } from "@/lib/db";
import { hasAccess } from "@/lib/billing/entitlements";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/origin";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?room=<id>&month=YYYY-MM          -> { days: { "YYYY-MM-DD": "available"|"full"|"closed" } }
 * GET /api/availability?room=<id>&date=YYYY-MM-DD&duration=<min> -> { slots: ISO[] }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("room") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(roomId)) return NextResponse.json({ error: "room" }, { status: 400 });
  if (!(await rateLimit(`avail:${clientIp(req)}`, 240, 60))) return NextResponse.json({ error: "rate" }, { status: 429 });

  const [row] = await db
    .select({ room: schema.rooms, org: schema.organizations })
    .from(schema.rooms)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.rooms.orgId))
    .where(eq(schema.rooms.id, roomId));
  if (!row || row.room.status !== "published" || !hasAccess(row.org)) return NextResponse.json({ error: "not_bookable" }, { status: 404 });
  const av = await loadAvailabilityRoom(db, row.room);
  const now = new Date();
  const zone = row.room.timezone;

  const month = url.searchParams.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = DateTime.fromISO(`${month}-01`, { zone });
    if (!start.isValid) return NextResponse.json({ error: "month" }, { status: 400 });
    const end = start.plus({ months: 1 });
    const busy = await loadBusy(db, row.room, start.minus({ days: 2 }).toJSDate(), end.plus({ days: 2 }).toJSDate());
    const days: Record<string, string> = {};
    for (let d = start; d < end; d = d.plus({ days: 1 })) days[d.toISODate()!] = dayStatus(av, d.toISODate()!, busy, now);
    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  }

  const date = url.searchParams.get("date") ?? "";
  const duration = Number(url.searchParams.get("duration"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(duration)) return NextResponse.json({ error: "params" }, { status: 400 });
  const day = DateTime.fromISO(date, { zone });
  const busy = await loadBusy(db, row.room, day.minus({ days: 2 }).toJSDate(), day.plus({ days: Math.ceil(duration / 1440) + 3 }).toJSDate());
  const slots = availableStartTimes(av, date, duration, busy, now).map((d) => d.toISOString());
  return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}
