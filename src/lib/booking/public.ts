import { and, asc, eq, ne } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { activePlan, hasAccess } from "@/lib/billing/entitlements";
import { hasAnyPrice } from "./pricing";

export const getPublicRoom = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const [row] = await db
    .select({ room: schema.rooms, org: schema.organizations })
    .from(schema.rooms)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.rooms.orgId))
    .where(and(eq(schema.rooms.slug, slug), ne(schema.rooms.status, "archived")))
    .limit(1);
  if (!row) return null;
  const { room, org } = row;
  const plan = await activePlan(org);
  const [photos, hours, extras] = await Promise.all([
    db.select().from(schema.roomPhotos).where(eq(schema.roomPhotos.roomId, room.id)).orderBy(asc(schema.roomPhotos.sort)),
    db.select().from(schema.roomOpeningHours).where(eq(schema.roomOpeningHours.roomId, room.id)).orderBy(asc(schema.roomOpeningHours.weekday), asc(schema.roomOpeningHours.startMinute)),
    plan?.features.extras
      ? db.select().from(schema.extras).where(and(eq(schema.extras.orgId, org.id), eq(schema.extras.active, true))).orderBy(asc(schema.extras.sort))
      : Promise.resolve([] as (typeof schema.extras.$inferSelect)[]),
  ]);
  const bookable = room.status === "published" && hasAccess(org) && hasAnyPrice(room) && hours.length > 0;
  return {
    room,
    org,
    plan,
    photos,
    hours,
    extras: extras.filter((x) => !x.roomIds || x.roomIds.length === 0 || x.roomIds.includes(room.id)),
    bookable,
    branding: !!plan?.features.branding,
    discountCodes: !!plan?.features.discountCodes,
  };
});

export type PublicRoom = NonNullable<Awaited<ReturnType<typeof getPublicRoom>>>;
