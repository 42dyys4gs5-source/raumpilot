import { eq } from "drizzle-orm";
import { schema, type DbOrTx } from "@/lib/db";
import { buildIcs } from "@/lib/calendar/ics";
import type { EmailContent } from "@/lib/email/layout";
import * as T from "@/lib/email/templates";
import { enqueueEmail } from "@/lib/jobs/queue";
import { bookingUrl } from "./links";

/**
 * Booking notifications. Always called inside the transaction that changes the booking,
 * with a deterministic dedupe key, so that retried webhooks or double clicks never
 * produce duplicate critical e-mails.
 */

export async function loadBookingCtx(tx: DbOrTx, bookingId: string): Promise<T.BookingCtx> {
  const [row] = await tx
    .select({ booking: schema.bookings, room: schema.rooms, org: schema.organizations })
    .from(schema.bookings)
    .innerJoin(schema.rooms, eq(schema.rooms.id, schema.bookings.roomId))
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.bookings.orgId))
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  if (!row) throw new Error(`Buchung ${bookingId} nicht gefunden`);
  return row;
}

function landlordEmail(c: T.BookingCtx) {
  return c.org.notificationSettings?.notificationEmail || c.org.contactEmail;
}

async function toCustomer(tx: DbOrTx, c: T.BookingCtx, mail: EmailContent, template: string, key: string, withIcs = false) {
  const attachments = withIcs
    ? [
        {
          filename: `buchung-${c.booking.reference}.ics`,
          contentType: "text/calendar",
          content: Buffer.from(
            buildIcs(
              [
                {
                  uid: `${c.booking.id}@raumvia`,
                  start: c.booking.startsAt,
                  end: c.booking.endsAt,
                  summary: `${c.room.name} (${c.org.name})`,
                  description: `Buchung ${c.booking.reference}\n${bookingUrl(c.booking.id)}`,
                  location: [c.room.street, [c.room.postalCode, c.room.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
                },
              ],
              c.room.name,
            ),
          ).toString("base64"),
        },
      ]
    : undefined;
  await enqueueEmail(
    tx,
    {
      to: c.booking.customerEmail,
      ...mail,
      template,
      replyTo: c.org.contactEmail,
      fromName: c.org.name,
      orgId: c.org.id,
      bookingId: c.booking.id,
      attachments,
    },
    key,
  );
}

async function toLandlord(tx: DbOrTx, c: T.BookingCtx, mail: EmailContent, template: string, key: string) {
  await enqueueEmail(
    tx,
    { to: landlordEmail(c), ...mail, template, replyTo: c.booking.customerEmail, orgId: c.org.id, bookingId: c.booking.id },
    key,
  );
}

export async function notifyCreated(tx: DbOrTx, bookingId: string) {
  const c = await loadBookingCtx(tx, bookingId);
  const id = c.booking.id;
  if (c.booking.status === "requested") {
    await toCustomer(tx, c, T.bookingRequestReceivedMail(c), "booking.request_received", `mail:request-received:${id}`);
    await toLandlord(tx, c, T.landlordNewBookingMail(c), "landlord.new_request", `mail:landlord-new:${id}`);
  } else if (c.booking.status === "confirmed") {
    await toCustomer(tx, c, T.bookingConfirmedMail(c), "booking.confirmed", `mail:confirmed:${id}`, true);
    if (c.booking.source !== "manual" && c.org.notificationSettings.notifyNewBooking) {
      await toLandlord(tx, c, T.landlordNewBookingMail(c), "landlord.new_booking", `mail:landlord-new:${id}`);
    }
  }
}

export async function notifyPaid(tx: DbOrTx, bookingId: string) {
  const c = await loadBookingCtx(tx, bookingId);
  const id = c.booking.id;
  await toCustomer(tx, c, T.bookingConfirmedMail(c), "booking.confirmed", `mail:confirmed:${id}`, true);
  await toCustomer(tx, c, T.paymentReceiptMail(c), "booking.receipt", `mail:receipt:${id}`);
  if (c.org.notificationSettings.notifyNewBooking) {
    await toLandlord(tx, c, T.landlordPaidMail(c), "landlord.paid", `mail:landlord-paid:${id}`);
  }
}

export async function notifyAwaitingPayment(tx: DbOrTx, bookingId: string) {
  const c = await loadBookingCtx(tx, bookingId);
  await toCustomer(tx, c, T.bookingAwaitingPaymentMail(c), "booking.awaiting_payment", `mail:awaiting-payment:${bookingId}`);
}

export async function notifyDeclined(tx: DbOrTx, bookingId: string) {
  const c = await loadBookingCtx(tx, bookingId);
  await toCustomer(tx, c, T.bookingDeclinedMail(c), "booking.declined", `mail:declined:${bookingId}`);
}

export async function notifyCancelled(tx: DbOrTx, bookingId: string, refund: number) {
  const c = await loadBookingCtx(tx, bookingId);
  await toCustomer(tx, c, T.bookingCancelledMail(c, refund), "booking.cancelled", `mail:cancelled:${bookingId}`);
  if (c.booking.cancelledBy === "customer" && c.org.notificationSettings.notifyCancellation) {
    await toLandlord(tx, c, T.landlordCancelledMail(c, refund), "landlord.cancelled", `mail:landlord-cancelled:${bookingId}`);
  }
}

export async function notifyExpired(tx: DbOrTx, bookingId: string, previousStatus: string) {
  const c = await loadBookingCtx(tx, bookingId);
  // An abandoned instant checkout needs no e-mail; approved requests that were not paid do.
  if (previousStatus === "awaiting_payment") {
    await toCustomer(tx, c, T.bookingExpiredMail(c), "booking.expired", `mail:expired:${bookingId}`);
  } else if (previousStatus === "requested") {
    await toCustomer(tx, c, { ...T.bookingDeclinedMail(c) }, "booking.request_expired", `mail:request-expired:${bookingId}`);
  }
}

export async function notifyPaymentFailed(tx: DbOrTx, bookingId: string) {
  const c = await loadBookingCtx(tx, bookingId);
  await toCustomer(tx, c, T.paymentFailedMail(c), "booking.payment_failed", `mail:payment-failed:${bookingId}`);
}

export async function notifyRescheduled(tx: DbOrTx, bookingId: string, previous: { startsAt: Date; endsAt: Date }) {
  const c = await loadBookingCtx(tx, bookingId);
  const key = `mail:rescheduled:${bookingId}:${c.booking.startsAt.getTime()}`;
  await toCustomer(tx, c, T.bookingRescheduledMail(c, previous), "booking.rescheduled", key, true);
}

export async function notifyReminder(tx: DbOrTx, bookingId: string) {
  const c = await loadBookingCtx(tx, bookingId);
  await toCustomer(tx, c, T.bookingReminderMail(c), "booking.reminder", `mail:reminder:${bookingId}:${c.booking.startsAt.getTime()}`);
}
