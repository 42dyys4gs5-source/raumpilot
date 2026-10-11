import { db, sql } from "@/lib/db";
import { seedPlans } from "@/lib/billing/seed";

await seedPlans(db);
console.log("✓ Tarife angelegt");
await sql.end();
