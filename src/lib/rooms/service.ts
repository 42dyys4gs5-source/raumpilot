import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hasAccess, maxRoomsFor, roomUsage } from "@/lib/billing/entitlements";
import { hasAnyPrice } from "@/lib/booking/pricing";
import { randomToken } from "@/lib/security/crypto";
import { RESERVED_SLUGS, slugify } from "@/lib/utils/slug";

type Org = typeof schema.organizations.$inferSelect;
export type Room = typeof schema.rooms.$inferSelect;

/** Tenant-scoped room lookup. Always use this instead of querying rooms by id alone. */
export async function getOrgRoom(orgId: string, roomId: string): Promise<Room | null> {
  if (!/^[0-9a-f-]{36}$/.test(roomId)) return null;
  const [r] = await db.select().from(schema.rooms).where(and(eq(schema.rooms.id, roomId), eq(schema.rooms.orgId, orgId)));
  return r ?? null;
}

export async function listOrgRooms(orgId: string, opts: { includeArchived?: boolean } = {}) {
  return db
    .select()
    .from(schema.rooms)
    .where(opts.includeArchived ? eq(schema.rooms.orgId, orgId) : and(eq(schema.rooms.orgId, orgId), ne(schema.rooms.status, "archived")))
    .orderBy(asc(schema.rooms.createdAt));
}

export async function uniqueRoomSlug(base: string, excludeId?: string): Promise<string> {
  const b = slugify(base) || "raum";
  for (let i = 0; i < 100; i++) {
    const c = i === 0 ? b : `${b}-${i + 1}`;
    if (RESERVED_SLUGS.has(c)) continue;
    const [r] = await db.select({ id: schema.rooms.id }).from(schema.rooms).where(eq(schema.rooms.slug, c));
    if (!r || r.id === excludeId) return c;
  }
  return `${b}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
}

export class RoomLimitError extends Error {}

export async function createRoom(org: Org, input: { name: string; category: Room["category"]; capacity: number; hourlyPrice: number | null; city?: string | null }) {
  const used = await roomUsage(org.id);
  const max = await maxRoomsFor(org);
  if (used >= max) throw new RoomLimitError(`Ihr Tarif erlaubt ${max} ${max === 1 ? "Raum" : "Räume"}. Für weitere Räume wechseln Sie bitte den Tarif.`);
  const slug = await uniqueRoomSlug(`${input.name} ${input.city ?? org.city ?? ""}`);
  return db.transaction(async (tx) => {
    const [room] = await tx
      .insert(schema.rooms)
      .values({
        orgId: org.id,
        name: input.name,
        slug,
        category: input.category,
        capacity: input.capacity,
        hourlyPrice: input.hourlyPrice,
        street: org.street,
        postalCode: org.postalCode,
        city: input.city ?? org.city,
        country: org.country,
        timezone: org.timezone,
        icalToken: randomToken(24),
      })
      .returning();
    // Sensible default: daily 08:00–22:00
    await tx.insert(schema.roomOpeningHours).values([1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ roomId: room.id, weekday, startMinute: 480, endMinute: 1320 })));
    return room;
  });
}

export type PublishCheck = { ok: boolean; items: { label: string; done: boolean; required: boolean }[] };

export async function publishChecklist(org: Org, room: Room): Promise<PublishCheck> {
  const [hours, photos] = await Promise.all([
    db.select({ id: schema.roomOpeningHours.id }).from(schema.roomOpeningHours).where(eq(schema.roomOpeningHours.roomId, room.id)),
    db.select({ id: schema.roomPhotos.id }).from(schema.roomPhotos).where(eq(schema.roomPhotos.roomId, room.id)),
  ]);
  const items = [
    { label: "Aktiver Tarif", done: hasAccess(org), required: true },
    { label: "Mindestens ein Preis (Stunde, Halbtag oder Tag)", done: hasAnyPrice(room), required: true },
    { label: "Buchbare Zeiten festgelegt", done: hours.length > 0, required: true },
    { label: "Adresse angegeben", done: !!room.city, required: true },
    { label: "Beschreibung (mind. 80 Zeichen)", done: (room.description ?? "").length >= 80, required: false },
    { label: "Mindestens 3 Fotos", done: photos.length >= 3, required: false },
    { label: "Hausregeln oder Mietbedingungen", done: !!(room.houseRules || room.rentalTerms), required: false },
  ];
  return { ok: items.every((i) => !i.required || i.done), items };
}
