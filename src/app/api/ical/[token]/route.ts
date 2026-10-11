import { and, eq, gte, inArray } from "drizzle-orm";
import { buildIcs } from "@/lib/calendar/ics";
import { db, schema } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/origin";

export const dynamic = "force-dynamic";

/** Secret iCal feed per room (token is unguessable; regenerate it to revoke access). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(clean)) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(`ical:${clientIp(req)}`, 120, 3600))) return new Response("Too many requests", { status: 429 });
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.icalToken, clean));
  if (!room) return new Response("Not found", { status: 404 });
  const since = new Date(Date.now() - 90 * 86400_000);
  const bookings = await db
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.roomId, room.id), gte(schema.bookings.endsAt, since), inArray(schema.bookings.status, ["confirmed", "requested", "awaiting_payment"])));
  const blocks = await db.select().from(schema.roomBlocks).where(and(eq(schema.roomBlocks.orgId, room.orgId), gte(schema.roomBlocks.endsAt, since)));
  const ics = buildIcs(
    [
      ...bookings.map((b) => ({
        uid: `${b.id}@raumvia`,
        start: b.startsAt,
        end: b.endsAt,
        summary: `${b.status === "confirmed" ? "" : "[Vorgemerkt] "}${b.customerName} (${b.guests} P.)`,
        description: `Buchung ${b.reference}${b.customerPhone ? `\nTel. ${b.customerPhone}` : ""}`,
        status: (b.status === "confirmed" ? "CONFIRMED" : "TENTATIVE") as "CONFIRMED" | "TENTATIVE",
        updated: b.updatedAt,
      })),
      ...blocks
        .filter((x) => (x.roomId === room.id || x.roomId === null) && x.source !== "ical")
        .map((x) => ({ uid: `block-${x.id}@raumvia`, start: x.startsAt, end: x.endsAt, summary: `Gesperrt${x.reason ? `: ${x.reason}` : ""}` })),
    ],
    `${room.name} – Buchungen`,
  );
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300", "Content-Disposition": `inline; filename="${room.slug}.ics"` } });
}
