import { appUrl } from "@/lib/env";
import { hmac, safeEqual } from "@/lib/security/crypto";

/** Unguessable, stateless customer link for a booking (manage, pay, cancel, receipt). */
export function bookingToken(bookingId: string): string {
  return `${bookingId}.${hmac(`booking:${bookingId}`).slice(0, 32)}`;
}

export function verifyBookingToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return safeEqual(sig, hmac(`booking:${id}`).slice(0, 32)) ? id : null;
}

export const bookingUrl = (bookingId: string, suffix = "") => appUrl(`/buchung/${bookingToken(bookingId)}${suffix}`);
