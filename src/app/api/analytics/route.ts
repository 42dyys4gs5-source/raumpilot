import { sql as drizzleSql } from "drizzle-orm";
import { z } from "zod";
import { clientIp, sameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { db, schema } from "@/lib/db";

const eventSchema = z.object({ event: z.literal("registration_started"), eventId: z.string().uuid() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Ungültige Herkunft." }, { status: 403 });
  if (!(await rateLimit(`analytics:${clientIp(req)}`, 30, 3600))) return Response.json({ error: "Zu viele Anfragen." }, { status: 429 });
  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültiges Ereignis." }, { status: 400 });

  await db.transaction(async (tx) => {
    const { eventId } = parsed.data;
    await tx.execute(drizzleSql`select pg_advisory_xact_lock(hashtext(${eventId}))`);
    const [seen] = await tx.execute(drizzleSql`select id from audit_log where action = 'funnel.registration_started' and data->>'eventId' = ${eventId} limit 1`);
    if (seen) return;
    await tx.insert(schema.auditLog).values({
      action: "funnel.registration_started",
      severity: "info",
      data: { eventId },
      ip: null,
      userAgent: null,
    });
  });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
