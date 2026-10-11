import { NextResponse } from "next/server";
import { abandonPendingBooking, BookingError, createBooking, startCheckout } from "@/lib/booking/engine";
import { bookingUrl } from "@/lib/booking/links";
import { bookingCreateSchema } from "@/lib/booking/request-schema";
import { kickJobs } from "@/lib/jobs/kick";
import { logError } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp, sameOrigin } from "@/lib/security/origin";
import { verifyTurnstile } from "@/lib/security/turnstile";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  const ip = clientIp(req);
  if (!(await rateLimit(`booking:${ip}`, 12, 600))) {
    return NextResponse.json({ error: "Zu viele Buchungsversuche. Bitte warten Sie einige Minuten." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = bookingCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Ungültige Angaben", field: first?.path.join(".") }, { status: 400 });
  }
  const d = parsed.data;
  if (!(await verifyTurnstile(d.turnstileToken, ip))) return NextResponse.json({ error: "Die Sicherheitsprüfung ist fehlgeschlagen." }, { status: 400 });

  const start = new Date(d.start);
  try {
    const { booking, needsPayment } = await createBooking({
      roomId: d.roomId,
      start,
      end: new Date(start.getTime() + d.durationMinutes * 60_000),
      guests: d.guests,
      extras: d.extras,
      discountCode: d.discountCode,
      customer: d.customer,
      source: d.source,
    });
    kickJobs();
    if (!needsPayment) return NextResponse.json({ url: bookingUrl(booking.id), status: booking.status });
    try {
      const url = await startCheckout(booking.id);
      return NextResponse.json({ url, status: booking.status, payment: true });
    } catch (err) {
      // Release the slot again if the payment page could not be created.
      await logError("checkout", err, { bookingId: booking.id });
      await abandonPendingBooking(booking.id).catch(() => {});
      return NextResponse.json({ error: "Die Zahlungsseite konnte nicht geöffnet werden. Bitte versuchen Sie es erneut." }, { status: 502 });
    }
  } catch (err) {
    if (err instanceof BookingError) return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    await logError("booking.create", err);
    return NextResponse.json({ error: "Die Buchung konnte nicht erstellt werden. Bitte versuchen Sie es erneut." }, { status: 500 });
  }
}
