import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyBookingToken } from "./links";
import { loadBookingCtx } from "./notify";

export async function loadBookingByToken(token: string) {
  const id = verifyBookingToken(decodeURIComponent(token));
  if (!id) return null;
  try {
    const ctx = await loadBookingCtx(db, id);
    const extras = await db.select().from(schema.bookingExtras).where(eq(schema.bookingExtras.bookingId, id));
    return { ...ctx, extras };
  } catch {
    return null;
  }
}
