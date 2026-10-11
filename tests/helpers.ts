import { sql as dsql } from "drizzle-orm";
import { db, schema, sql } from "@/lib/db";
import { seedPlans } from "@/lib/billing/seed";
import { randomToken } from "@/lib/security/crypto";

export async function resetDb() {
  const tables = await sql<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  await sql.unsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await seedPlans(db);
}

export async function createOrg(o: { plan?: string | null; stripe?: boolean; name?: string; email?: string } = {}) {
  const email = o.email ?? `owner-${randomToken(4)}@example.ch`;
  const [user] = await db.insert(schema.users).values({ email, name: "Owner", emailVerifiedAt: new Date() }).returning();
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: o.name ?? "Studio Test",
      slug: `studio-${randomToken(5).toLowerCase().replace(/[^a-z0-9]/g, "x")}`,
      contactEmail: email,
      planKey: o.plan === null ? null : (o.plan ?? "professional"),
      subscriptionStatus: o.plan === null ? "none" : "active",
      stripeAccountId: o.stripe ? `acct_test_${randomToken(6)}` : null,
      stripeChargesEnabled: !!o.stripe,
    })
    .returning();
  await db.insert(schema.memberships).values({ orgId: org.id, userId: user.id, role: "owner" });
  return { org, user };
}

export async function createRoom(orgId: string, o: Partial<typeof schema.rooms.$inferInsert> = {}) {
  const [room] = await db
    .insert(schema.rooms)
    .values({
      orgId,
      slug: `raum-${randomToken(5).toLowerCase().replace(/[^a-z0-9]/g, "x")}`,
      name: "Testraum",
      capacity: 30,
      hourlyPrice: 5000,
      status: "published",
      icalToken: randomToken(16),
      minDurationMinutes: 60,
      maxDurationMinutes: 720,
      slotIntervalMinutes: 60,
      leadTimeMinutes: 0,
      ...o,
    })
    .returning();
  await db.insert(schema.roomOpeningHours).values(
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ roomId: room.id, weekday, startMinute: 0, endMinute: 1440 })),
  );
  return room;
}

export async function emailsTo(to: string) {
  return db.select().from(schema.emailLog).where(dsql`${schema.emailLog.to} = ${to}`).orderBy(schema.emailLog.createdAt);
}

export const customer = { name: "Mia Muster", email: "mia@example.ch", phone: "+41 79 000 00 00" };

/** A future date at a given UTC hour, N days from now. */
export function future(days: number, hourUtc = 10) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}
