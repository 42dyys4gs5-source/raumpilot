import { NextResponse } from "next/server";
import { BookingError, startCheckout } from "@/lib/booking/engine";
import { verifyBookingToken } from "@/lib/booking/links";
import { appUrl } from "@/lib/env";
import { logError } from "@/lib/security/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/origin";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = verifyBookingToken(token);
  if (!id) return NextResponse.redirect(appUrl("/"));
  if (!(await rateLimit(`pay:${clientIp(req)}`, 20, 600))) return new NextResponse("Zu viele Anfragen", { status: 429 });
  try {
    const url = await startCheckout(id);
    return NextResponse.redirect(url, 303);
  } catch (err) {
    if (!(err instanceof BookingError)) await logError("checkout.pay-link", err, { bookingId: id });
    return NextResponse.redirect(appUrl(`/buchung/${token}?zahlung=nicht-moeglich`), 303);
  }
}
