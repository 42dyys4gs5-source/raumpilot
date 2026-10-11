import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/security/audit";

/** Data portability: full JSON export of the tenant's data (owner only). */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx || ctx.role !== "owner" || !ctx.user.emailVerifiedAt) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const orgId = ctx.org.id;
  const rooms = await db.select().from(schema.rooms).where(eq(schema.rooms.orgId, orgId));
  const roomIds = rooms.map((r) => r.id);
  const bookings = await db.select().from(schema.bookings).where(eq(schema.bookings.orgId, orgId));
  const data = {
    exportedAt: new Date().toISOString(),
    organization: { ...ctx.org, stripeCustomerId: undefined },
    rooms,
    openingHours: roomIds.length ? await db.select().from(schema.roomOpeningHours).where(inArray(schema.roomOpeningHours.roomId, roomIds)) : [],
    photos: await db.select().from(schema.roomPhotos).where(eq(schema.roomPhotos.orgId, orgId)),
    blocks: await db.select().from(schema.roomBlocks).where(eq(schema.roomBlocks.orgId, orgId)),
    priceRules: await db.select().from(schema.priceRules).where(eq(schema.priceRules.orgId, orgId)),
    extras: await db.select().from(schema.extras).where(eq(schema.extras.orgId, orgId)),
    discountCodes: await db.select().from(schema.discountCodes).where(eq(schema.discountCodes.orgId, orgId)),
    customers: await db.select().from(schema.customers).where(eq(schema.customers.orgId, orgId)),
    bookings,
    bookingExtras: bookings.length ? await db.select().from(schema.bookingExtras).where(inArray(schema.bookingExtras.bookingId, bookings.map((b) => b.id))) : [],
    payments: await db.select().from(schema.payments).where(eq(schema.payments.orgId, orgId)),
    subscriptions: await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.orgId, orgId)),
    invoices: await db.select().from(schema.invoices).where(eq(schema.invoices.orgId, orgId)),
    user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name, phone: ctx.user.phone, createdAt: ctx.user.createdAt },
  };
  await audit("org.exported", { userId: ctx.user.id, orgId, severity: "warning" });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="raumvia-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" },
  });
}
