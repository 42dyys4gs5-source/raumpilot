import { NextResponse } from "next/server";
import { BookingError, quote } from "@/lib/booking/engine";
import { bookingRequestSchema } from "@/lib/booking/request-schema";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp, sameOrigin } from "@/lib/security/origin";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  if (!(await rateLimit(`quote:${clientIp(req)}`, 120, 60))) return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  const parsed = bookingRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
  const d = parsed.data;
  const start = new Date(d.start);
  try {
    const price = await quote({ roomId: d.roomId, start, end: new Date(start.getTime() + d.durationMinutes * 60_000), guests: d.guests, extras: d.extras, discountCode: d.discountCode });
    return NextResponse.json({ price });
  } catch (err) {
    if (err instanceof BookingError) return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    throw err;
  }
}
