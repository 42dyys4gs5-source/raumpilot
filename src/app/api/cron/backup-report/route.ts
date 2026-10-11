import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { isCronAuthorized } from "@/lib/security/cron";

/** External backup jobs (see .github/workflows/backup.yml) report their result here. */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { ok?: boolean; size?: number; file?: string };
  await db.insert(schema.systemChecks).values({ kind: "backup", ok: body.ok === true, details: { size: body.size ?? null, file: body.file ?? null } });
  return NextResponse.json({ ok: true });
}
