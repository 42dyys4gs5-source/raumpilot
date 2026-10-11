import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatRange } from "@/lib/utils/dates";
import { landlordConflictMail } from "@/lib/email/templates";
import { enqueueEmail } from "@/lib/jobs/queue";
import { decrypt } from "@/lib/security/crypto";
import { fetchFeed } from "./fetch-safe";
import { parseIcs, type ImportedEvent } from "./ical-import";

/**
 * Imports an external calendar as blocked times for a room.
 * External events never cancel existing bookings – overlaps are flagged and reported to the landlord.
 */
export async function syncFeed(feedId: string, fetcher: (url: string) => Promise<string> = fetchFeed) {
  const [row] = await db
    .select({ feed: schema.calendarFeeds, room: schema.rooms, org: schema.organizations })
    .from(schema.calendarFeeds)
    .innerJoin(schema.rooms, eq(schema.rooms.id, schema.calendarFeeds.roomId))
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.calendarFeeds.orgId))
    .where(eq(schema.calendarFeeds.id, feedId));
  if (!row || !row.feed.active) return { events: 0, conflicts: 0 };
  const { feed, room, org } = row;

  let events: ImportedEvent[];
  try {
    const text = await fetcher(decrypt(feed.urlEnc));
    const from = new Date(Date.now() - 86400_000);
    const to = new Date(Date.now() + Math.min(room.maxAdvanceDays + 1, 731) * 86400_000);
    events = parseIcs(text, { from, to, zone: room.timezone });
  } catch (err) {
    await db
      .update(schema.calendarFeeds)
      .set({ lastError: String((err as Error).message).slice(0, 500), lastSyncedAt: new Date() })
      .where(eq(schema.calendarFeeds.id, feed.id));
    return { events: 0, conflicts: 0, error: (err as Error).message };
  }

  const conflicts: { bookingId: string; text: string }[] = [];
  await db.transaction(async (tx) => {
    // Same lock as booking creation, so imports and bookings are serialised per room.
    await tx.select({ id: schema.rooms.id }).from(schema.rooms).where(eq(schema.rooms.id, room.id)).for("update");
    await tx.delete(schema.roomBlocks).where(eq(schema.roomBlocks.calendarFeedId, feed.id));
    if (events.length) {
      for (let i = 0; i < events.length; i += 500) {
        await tx.insert(schema.roomBlocks).values(
          events.slice(i, i + 500).map((e) => ({
            orgId: org.id,
            roomId: room.id,
            startsAt: e.start,
            endsAt: e.end,
            reason: `${feed.name}: ${e.summary}`.slice(0, 250),
            source: "ical" as const,
            calendarFeedId: feed.id,
            externalUid: e.uid.slice(0, 500),
          })),
        );
      }
    }
    const overlapping = await tx.execute<{ id: string; starts_at: Date; ends_at: Date; reference: string; calendar_conflict: boolean }>(sql`
      SELECT DISTINCT b.id, b.starts_at, b.ends_at, b.reference, b.calendar_conflict FROM bookings b
      JOIN room_blocks rb ON rb.room_id = ${room.id} AND rb.source = 'ical' AND rb.starts_at < b.ends_at AND rb.ends_at > b.starts_at
      WHERE b.room_id = ${room.id} AND b.status IN ('requested','awaiting_payment','pending_payment','confirmed') AND b.ends_at > now()`);
    const ids = overlapping.map((o) => o.id);
    await tx
      .update(schema.bookings)
      .set({ calendarConflict: false })
      .where(and(eq(schema.bookings.roomId, room.id), eq(schema.bookings.calendarConflict, true)));
    if (ids.length) {
      await tx.update(schema.bookings).set({ calendarConflict: true }).where(inArray(schema.bookings.id, ids));
      for (const o of overlapping) {
        if (!o.calendar_conflict) conflicts.push({ bookingId: o.id, text: `${o.reference}: ${formatRange(new Date(o.starts_at), new Date(o.ends_at), room.timezone)}` });
      }
      if (conflicts.length) {
        await enqueueEmail(
          tx,
          { to: org.notificationSettings.notificationEmail || org.contactEmail, ...landlordConflictMail(org.name, room.name, conflicts.map((c) => c.text)), template: "landlord.calendar_conflict", orgId: org.id },
          `mail:conflict:${feed.id}:${conflicts.map((c) => c.bookingId).sort().join(",")}`,
        );
      }
    }
    await tx
      .update(schema.calendarFeeds)
      .set({ lastSyncedAt: new Date(), lastError: null, lastEventCount: events.length })
      .where(eq(schema.calendarFeeds.id, feed.id));
  });
  return { events: events.length, conflicts: conflicts.length };
}
