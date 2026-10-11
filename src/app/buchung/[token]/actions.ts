"use server";

import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { BookingError, cancelBooking, rescheduleBooking } from "@/lib/booking/engine";
import { verifyBookingToken } from "@/lib/booking/links";
import { kickJobs } from "@/lib/jobs/kick";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestInfo } from "@/lib/security/request";

export async function customerCancelAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const id = verifyBookingToken(token);
  if (!id) return fail("Ungültiger Link.");
  const { ip } = await requestInfo();
  if (!(await rateLimit(`cust-cancel:${ip}`, 10, 3600))) return fail("Zu viele Versuche.");
  try {
    const { refund } = await cancelBooking({ bookingId: id, by: "customer", actor: "customer", reason: String(fd.get("reason") ?? "").slice(0, 500) || null });
    kickJobs();
    revalidatePath(`/buchung/${token}`);
    return success(refund > 0 ? "Ihre Buchung wurde storniert. Die Rückerstattung ist veranlasst." : "Ihre Buchung wurde storniert.");
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message);
    throw e;
  }
}

export async function customerRescheduleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const id = verifyBookingToken(token);
  if (!id) return fail("Ungültiger Link.");
  const { ip } = await requestInfo();
  if (!(await rateLimit(`cust-resched:${ip}`, 20, 3600))) return fail("Zu viele Versuche.");
  const start = new Date(String(fd.get("start") ?? ""));
  if (isNaN(start.getTime())) return fail("Bitte wählen Sie eine neue Startzeit.");
  try {
    await rescheduleBooking({ bookingId: id, newStart: start, by: "customer", actor: "customer" });
    kickJobs();
    revalidatePath(`/buchung/${token}`);
    return success("Ihre Buchung wurde verschoben. Sie erhalten eine Bestätigung per E-Mail.");
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message);
    throw e;
  }
}
