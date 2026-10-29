import { and, eq, inArray, isNull } from "drizzle-orm";
import { ACCESS_STATUSES } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";

/** Gibt es mindestens einen Raum, der im öffentlichen Raumverzeichnis erscheint? */
export async function directoryHasListings(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.rooms.orgId))
      .where(
        and(
          eq(schema.rooms.status, "published"),
          eq(schema.organizations.directoryOptIn, true),
          inArray(schema.organizations.subscriptionStatus, [...ACCESS_STATUSES]),
          isNull(schema.organizations.suspendedAt),
        ),
      )
      .limit(1);
    return Boolean(row);
  } catch {
    return false;
  }
}
