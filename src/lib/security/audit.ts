import { db, schema } from "@/lib/db";
import { requestInfo } from "./request";

export async function audit(
  action: string,
  opts: { userId?: string | null; orgId?: string | null; severity?: "info" | "warning" | "critical"; data?: Record<string, unknown> } = {},
) {
  const { ip, userAgent } = await requestInfo();
  await db.insert(schema.auditLog).values({
    action,
    userId: opts.userId ?? null,
    orgId: opts.orgId ?? null,
    severity: opts.severity ?? "info",
    data: opts.data ?? null,
    ip,
    userAgent,
  });
}
