"use server";

import { and, eq, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { assertFeature, PlanLimitError } from "@/lib/billing/entitlements";
import { normaliseFeedUrl } from "@/lib/calendar/fetch-safe";
import { syncFeed } from "@/lib/calendar/sync";
import { db, schema } from "@/lib/db";
import { getOrgRoom } from "@/lib/rooms/service";
import { audit } from "@/lib/security/audit";
import { encrypt } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function addBlockAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const roomRaw = str(fd, "roomId");
  let roomId: string | null = null;
  if (roomRaw !== "all") {
    const room = await getOrgRoom(ctx.org.id, roomRaw);
    if (!room) return fail("Bitte wählen Sie einen Raum.");
    roomId = room.id;
  }
  const zone = ctx.org.timezone;
  const allDay = fd.get("allDay") === "on";
  const start = DateTime.fromISO(`${str(fd, "fromDate")}T${allDay ? "00:00" : str(fd, "fromTime") || "00:00"}`, { zone });
  let end = DateTime.fromISO(`${str(fd, "toDate") || str(fd, "fromDate")}T${allDay ? "00:00" : str(fd, "toTime") || "00:00"}`, { zone });
  if (allDay) end = end.plus({ days: 1 });
  if (!start.isValid || !end.isValid || end <= start) return fail("Bitte prüfen Sie Beginn und Ende.");
  if (end.diff(start, "days").days > 400) return fail("Sperrzeiten sind auf 400 Tage begrenzt.");
  // Blocks are serialised with bookings through the room lock.
  await db.transaction(async (tx) => {
    if (roomId) await tx.select({ id: schema.rooms.id }).from(schema.rooms).where(eq(schema.rooms.id, roomId)).for("update");
    await tx.insert(schema.roomBlocks).values({
      orgId: ctx.org.id,
      roomId,
      startsAt: start.toJSDate(),
      endsAt: end.toJSDate(),
      reason: str(fd, "reason").slice(0, 200) || null,
      source: str(fd, "type") === "holiday" ? "holiday" : "manual",
    });
  });
  const conflicts = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM bookings WHERE org_id = ${ctx.org.id} AND status IN ('confirmed','requested','awaiting_payment') AND starts_at < ${end.toISO()}::timestamptz AND ends_at > ${start.toISO()}::timestamptz ${roomId ? sql`AND room_id = ${roomId}` : sql``}`,
  );
  revalidatePath("/app/verfuegbarkeit");
  revalidatePath("/app/kalender");
  const n = conflicts[0]?.n ?? 0;
  return success(n > 0 ? `Sperrzeit gespeichert. Achtung: ${n} bestehende Buchung(en) liegen in diesem Zeitraum und bleiben bestehen.` : "Sperrzeit gespeichert.");
}

export async function deleteBlockAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  await db.delete(schema.roomBlocks).where(and(eq(schema.roomBlocks.id, str(fd, "blockId")), eq(schema.roomBlocks.orgId, ctx.org.id)));
  revalidatePath("/app/verfuegbarkeit");
  return success("Sperrzeit entfernt.");
}

export async function addFeedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  try {
    await assertFeature(ctx.org, "calendarImport");
  } catch (e) {
    if (e instanceof PlanLimitError) return fail(e.message);
    throw e;
  }
  if (!(await rateLimit(`feed-add:${ctx.org.id}`, 20, 3600))) return fail("Zu viele Versuche. Bitte später erneut.");
  const room = await getOrgRoom(ctx.org.id, str(fd, "roomId"));
  if (!room) return fail("Bitte wählen Sie einen Raum.");
  let url: URL;
  try {
    url = normaliseFeedUrl(str(fd, "url"));
  } catch (e) {
    return fail((e as Error).message || "Ungültige Adresse.");
  }
  const [feed] = await db
    .insert(schema.calendarFeeds)
    .values({ orgId: ctx.org.id, roomId: room.id, name: str(fd, "name").slice(0, 80) || url.hostname, urlEnc: encrypt(url.toString()) })
    .returning();
  const r = await syncFeed(feed.id);
  await audit("calendar.feed_added", { userId: ctx.user.id, orgId: ctx.org.id, data: { feedId: feed.id, host: url.hostname } });
  revalidatePath("/app/verfuegbarkeit");
  if ("error" in r && r.error) return fail(`Kalender gespeichert, aber der Abruf ist fehlgeschlagen: ${r.error}`);
  return success(`Kalender verbunden: ${r.events} Termine importiert${r.conflicts ? `, ${r.conflicts} Konflikt(e) mit Buchungen gefunden` : ""}.`);
}

export async function feedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const [feed] = await db.select().from(schema.calendarFeeds).where(and(eq(schema.calendarFeeds.id, str(fd, "feedId")), eq(schema.calendarFeeds.orgId, ctx.org.id)));
  if (!feed) return fail("Kalender nicht gefunden.");
  if (str(fd, "op") === "delete") {
    await db.delete(schema.calendarFeeds).where(eq(schema.calendarFeeds.id, feed.id));
    revalidatePath("/app/verfuegbarkeit");
    return success("Kalender entfernt. Importierte Termine wurden gelöscht.");
  }
  if (!(await rateLimit(`feed-sync:${feed.id}`, 10, 600))) return fail("Bitte warten Sie einige Minuten.");
  const r = await syncFeed(feed.id);
  revalidatePath("/app/verfuegbarkeit");
  if ("error" in r && r.error) return fail(`Abruf fehlgeschlagen: ${r.error}`);
  return success(`${r.events} Termine synchronisiert.`);
}
