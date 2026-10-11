import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";

function csv(v: unknown) {
  const s = String(v ?? "");
  // Prevent spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.user.emailVerifiedAt || ctx.role === "staff") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db
    .select({ p: schema.payments, ref: schema.bookings.reference, customer: schema.bookings.customerName })
    .from(schema.payments)
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .where(and(eq(schema.payments.orgId, ctx.org.id)))
    .orderBy(desc(schema.payments.createdAt))
    .limit(10000);
  const lines = [["Datum", "Buchung", "Kunde", "Art", "Status", "Betrag CHF", "Zahlungsart", "Referenz"].map(csv).join(";")];
  for (const { p, ref, customer } of rows) {
    lines.push([formatDateTime(p.createdAt), ref, customer, p.kind === "refund" ? "Rückerstattung" : p.kind === "offline" ? "Manuell" : "Online", p.status, ((p.kind === "refund" ? -1 : 1) * p.amount / 100).toFixed(2), p.method, p.externalId].map(csv).join(";"));
  }
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="zahlungen-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
