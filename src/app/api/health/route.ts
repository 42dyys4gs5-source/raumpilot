import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    // Only the error code/class is exposed (e.g. "XX000", "CONNECT_TIMEOUT") – never messages or connection details.
    const err = e as { code?: string; cause?: { code?: string; name?: string } };
    const code = String(err.cause?.code ?? err.code ?? err.cause?.name ?? "unknown").slice(0, 40);
    return NextResponse.json({ ok: false, code }, { status: 503 });
  }
}
