import { sql } from "drizzle-orm";
import { DEFAULT_PLANS } from "@/config/plans";
import { schema, type DbOrTx } from "@/lib/db";

/** Inserts default plans. Existing plans keep admin edits (prices/limits/Stripe ids) – only missing ones are added. */
export async function seedPlans(tx: DbOrTx) {
  for (const p of DEFAULT_PLANS) {
    await tx
      .insert(schema.plans)
      .values({ ...p, currency: "CHF" })
      .onConflictDoUpdate({ target: schema.plans.key, set: { highlights: sql`excluded.highlights` } });
  }
}
