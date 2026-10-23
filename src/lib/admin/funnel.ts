import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Records one pseudonymous milestone per organisation without IP or user-agent data. */
export async function recordFunnelEvent(action: string, orgId: string, data: Record<string, unknown> = {}) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${action}:${orgId}`}))`);
    const [seen] = await tx.select({ id: schema.auditLog.id }).from(schema.auditLog).where(and(eq(schema.auditLog.action, action), eq(schema.auditLog.orgId, orgId))).limit(1);
    if (seen) return;
    await tx.insert(schema.auditLog).values({ action, orgId, severity: "info", data, ip: null, userAgent: null });
  });
}
