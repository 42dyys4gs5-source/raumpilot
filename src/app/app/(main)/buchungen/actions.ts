"use server";

import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import {
  approveRequest,
  BookingError,
  cancelBooking,
  createBooking,
  declineRequest,
  markOfflinePaid,
  processPendingRefunds,
  refundAmount,
  rescheduleBooking,
} from "@/lib/booking/engine";
import { db, schema } from "@/lib/db";
import { kickJobs } from "@/lib/jobs/kick";
import { getOrgRoom } from "@/lib/rooms/service";
import { audit } from "@/lib/security/audit";
import { parseMoney } from "@/lib/utils/money";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function wrap(fn: () => Promise<string>) {
  return fn()
    .then((msg) => {
      kickJobs();
      return success(msg);
    })
    .catch((e) => {
      if (e instanceof BookingError) return fail(e.message);
      throw e;
    });
}

export async function bookingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("staff");
  const id = str(fd, "bookingId");
  const op = str(fd, "op");
  const actor = `user:${ctx.user.id}`;
  const res = await wrap(async () => {
    switch (op) {
      case "approve":
        await approveRequest(ctx.org.id, id, ctx.user.id);
        return "Anfrage angenommen. Der Kunde wurde benachrichtigt.";
      case "decline":
        await declineRequest(ctx.org.id, id, ctx.user.id, str(fd, "reason") || null);
        return "Anfrage abgelehnt. Der Kunde wurde benachrichtigt.";
      case "cancel": {
        const { refund } = await cancelBooking({ bookingId: id, by: "landlord", orgId: ctx.org.id, actor, reason: str(fd, "reason") || null });
        return refund > 0 ? "Buchung storniert. Die volle Rückerstattung wurde veranlasst." : "Buchung storniert.";
      }
      case "paid":
        await markOfflinePaid(ctx.org.id, id, ctx.user.id);
        return "Als bezahlt markiert.";
      case "refund": {
        const amount = parseMoney(str(fd, "amount"));
        if (!amount) throw new BookingError("amount", "Bitte geben Sie einen Betrag an.");
        const r = await refundAmount(ctx.org.id, id, amount, ctx.user.id);
        if (r.failed) throw new BookingError("refund", "Die Rückerstattung konnte nicht ausgeführt werden. Sie wird automatisch erneut versucht – oder klicken Sie auf «Erneut versuchen».");
        return "Rückerstattung ausgeführt.";
      }
      case "retry-refunds": {
        const [b] = await db.select({ id: schema.bookings.id }).from(schema.bookings).where(and(eq(schema.bookings.id, id), eq(schema.bookings.orgId, ctx.org.id)));
        if (!b) throw new BookingError("not_found", "Buchung nicht gefunden.");
        const r = await processPendingRefunds(id);
        return r.failed ? "Einige Rückerstattungen sind weiterhin fehlgeschlagen." : "Rückerstattungen ausgeführt.";
      }
      case "reschedule": {
        const [b] = await db.select().from(schema.bookings).where(and(eq(schema.bookings.id, id), eq(schema.bookings.orgId, ctx.org.id)));
        if (!b) throw new BookingError("not_found", "Buchung nicht gefunden.");
        const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, b.roomId));
        const start = DateTime.fromISO(`${str(fd, "date")}T${str(fd, "time")}`, { zone: room.timezone });
        if (!start.isValid) throw new BookingError("invalid", "Bitte Datum und Uhrzeit angeben.");
        await rescheduleBooking({ bookingId: id, newStart: start.toJSDate(), by: "landlord", orgId: ctx.org.id, actor });
        return "Buchung verschoben. Der Kunde wurde benachrichtigt.";
      }
      case "note": {
        await db.update(schema.bookings).set({ internalNote: str(fd, "internalNote").slice(0, 4000) || null, updatedAt: new Date() }).where(and(eq(schema.bookings.id, id), eq(schema.bookings.orgId, ctx.org.id)));
        return "Notiz gespeichert.";
      }
      default:
        throw new BookingError("op", "Unbekannte Aktion.");
    }
  });
  if (res.ok) await audit(`booking.${op}`, { userId: ctx.user.id, orgId: ctx.org.id, data: { bookingId: id } });
  revalidatePath(`/app/buchungen/${id}`);
  revalidatePath("/app/buchungen");
  // These operations replace the form that would show the message – show it on the page instead.
  if (res.ok && ["approve", "decline", "cancel", "paid"].includes(op)) redirect(`/app/buchungen/${id}?erledigt=${op}`);
  return res;
}

export async function manualBookingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("staff");
  const room = await getOrgRoom(ctx.org.id, str(fd, "roomId"));
  if (!room) return fail("Bitte wählen Sie einen Raum.");
  const start = DateTime.fromISO(`${str(fd, "date")}T${str(fd, "start")}`, { zone: room.timezone });
  let end = DateTime.fromISO(`${str(fd, "endDate") || str(fd, "date")}T${str(fd, "end")}`, { zone: room.timezone });
  if (!start.isValid || !end.isValid) return fail("Bitte geben Sie Datum, Beginn und Ende an.");
  if (end <= start && !str(fd, "endDate")) end = end.plus({ days: 1 }); // past midnight
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte Name und gültige E-Mail des Kunden angeben.");
  let bookingId: string;
  try {
    const { booking } = await createBooking({
      roomId: room.id,
      start: start.toJSDate(),
      end: end.toJSDate(),
      guests: Math.max(1, Number(str(fd, "guests")) || 1),
      extras: [],
      customer: { name, email, phone: str(fd, "phone") || null, company: str(fd, "company") || null },
      source: "manual",
      manual: { orgId: ctx.org.id, userId: ctx.user.id, ignoreRules: fd.get("ignoreRules") === "on", markPaid: fd.get("markPaid") === "on", internalNote: str(fd, "internalNote") || null, notifyCustomer: fd.get("notifyCustomer") === "on" },
    });
    bookingId = booking.id;
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message);
    throw e;
  }
  kickJobs();
  await audit("booking.manual_created", { userId: ctx.user.id, orgId: ctx.org.id, data: { bookingId } });
  redirect(`/app/buchungen/${bookingId}?neu=1`);
}
