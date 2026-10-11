import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getOrgContext } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { appUrl } from "@/lib/env";

/** QR code (PNG or SVG) for the organisation page or one of its rooms. */
export async function GET(req: Request) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const roomId = url.searchParams.get("room");
  const format = url.searchParams.get("format") === "svg" ? "svg" : "png";
  let target = appUrl(`/v/${ctx.org.slug}`);
  let name = ctx.org.slug;
  if (roomId) {
    const [r] = await db.select().from(schema.rooms).where(and(eq(schema.rooms.id, roomId), eq(schema.rooms.orgId, ctx.org.id)));
    if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
    target = appUrl(`/r/${r.slug}`);
    name = r.slug;
  }
  const opts = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#0a3a31", light: "#ffffff" } };
  if (format === "svg") {
    const svg = await QRCode.toString(target, { ...opts, type: "svg" });
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="qr-${name}.svg"` } });
  }
  const png = await QRCode.toBuffer(target, { ...opts, width: 1024 });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `${url.searchParams.get("inline") ? "inline" : "attachment"}; filename="qr-${name}.png"` } });
}
