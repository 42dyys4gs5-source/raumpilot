import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "@/lib/db";
import {
  approveRequest,
  BookingError,
  cancelBooking,
  createBooking,
  declineRequest,
  expireStale,
  handleBookingPaid,
  rescheduleBooking,
  sendDueReminders,
} from "@/lib/booking/engine";
import { runDueJobs } from "@/lib/jobs/worker";
import { createOrg, createRoom, customer, emailsTo, future, resetDb } from "../helpers";

const H = 3600_000;

beforeEach(resetDb);

async function book(roomId: string, start: Date, hours = 2, extra: Partial<Parameters<typeof createBooking>[0]> = {}) {
  return createBooking({
    roomId,
    start,
    end: new Date(start.getTime() + hours * H),
    guests: 5,
    extras: [],
    customer,
    source: "online",
    ...extra,
  });
}

describe("booking creation", () => {
  it("creates a confirmed offline booking and sends confirmation e-mails exactly once", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const { booking, needsPayment } = await book(room.id, future(5));
    expect(needsPayment).toBe(false);
    expect(booking.status).toBe("confirmed");
    expect(booking.paymentStatus).toBe("offline_due");
    expect(booking.totalAmount).toBe(10000);
    await runDueJobs();
    await runDueJobs();
    const mails = await emailsTo(customer.email);
    expect(mails.filter((m) => m.template === "booking.confirmed")).toHaveLength(1);
    expect((await emailsTo(org.contactEmail)).filter((m) => m.template === "landlord.new_booking")).toHaveLength(1);
  });

  it("prevents double bookings under concurrency (20 parallel attempts, 1 winner)", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const start = future(7);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => book(room.id, start)));
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed.every((f) => f.reason instanceof BookingError && f.reason.code === "unavailable")).toBe(true);
    const rows = await db.select().from(schema.bookings).where(eq(schema.bookings.roomId, room.id));
    expect(rows).toHaveLength(1);
  });

  it("prevents overlapping bookings under concurrency with different but overlapping times", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const base = future(8);
    const attempts = [0, 1, 2, 3].map((h) => book(room.id, new Date(base.getTime() + h * H), 3));
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    // 0-3 and 3-6 could both succeed, but 1-4 and 2-5 overlap with any of them.
    expect(ok).toBeLessThanOrEqual(2);
    const rows = await db.select().from(schema.bookings).where(eq(schema.bookings.roomId, room.id));
    for (const a of rows) for (const b of rows) if (a.id !== b.id) expect(a.startsAt < b.endsAt && b.startsAt < a.endsAt).toBe(false);
  });

  it("enforces the database exclusion constraint even when application checks are bypassed", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const { booking } = await book(room.id, future(9));
    await expect(
      db.insert(schema.bookings).values({ ...booking, id: undefined, reference: "RV-MANUAL01" } as never),
    ).rejects.toThrow();
  });

  it("respects cleaning buffers between bookings", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id, { bufferAfterMinutes: 60 });
    const start = future(10);
    await book(room.id, start, 2);
    await expect(book(room.id, new Date(start.getTime() + 2 * H), 1)).rejects.toMatchObject({ code: "unavailable" });
    await expect(book(room.id, new Date(start.getTime() + 3 * H), 1)).resolves.toBeTruthy();
  });

  it("respects manual blocks and holiday closures", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const start = future(11);
    await db.insert(schema.roomBlocks).values({ orgId: org.id, roomId: null, startsAt: start, endsAt: new Date(start.getTime() + 24 * H), source: "holiday", reason: "Betriebsferien" });
    await expect(book(room.id, new Date(start.getTime() + 2 * H))).rejects.toMatchObject({ code: "unavailable" });
  });

  it("rejects bookings for unpublished rooms or organisations without an active plan", async () => {
    const { org } = await createOrg({ plan: null });
    const room = await createRoom(org.id);
    await expect(book(room.id, future(5))).rejects.toMatchObject({ code: "not_bookable" });
    const { org: org2 } = await createOrg();
    const draft = await createRoom(org2.id, { status: "draft" });
    await expect(book(draft.id, future(5))).rejects.toMatchObject({ code: "not_bookable" });
  });

  it("rejects too many guests and invalid durations", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id, { capacity: 4 });
    await expect(book(room.id, future(5))).rejects.toMatchObject({ code: "guests" });
    const room2 = await createRoom(org.id, { minDurationMinutes: 180 });
    await expect(book(room2.id, future(5), 2)).rejects.toMatchObject({ code: "too_short" });
  });

  it("does not allow landlords to create bookings in rooms of other tenants", async () => {
    const { org: a, user } = await createOrg();
    const { org: b } = await createOrg();
    const roomB = await createRoom(b.id);
    await expect(
      book(roomB.id, future(5), 2, { source: "manual", manual: { orgId: a.id, userId: user.id, ignoreRules: true, markPaid: false } }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("online payment flow", () => {
  it("holds the slot, confirms idempotently on payment and sends one receipt", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online" });
    const { booking, needsPayment } = await book(room.id, future(6));
    expect(needsPayment).toBe(true);
    expect(booking.status).toBe("pending_payment");
    // Slot is held while paying:
    await expect(book(room.id, future(6))).rejects.toMatchObject({ code: "unavailable" });

    const evt = { bookingId: booking.id, accountId: org.stripeAccountId!, paymentIntentId: "pi_123", amount: booking.totalAmount };
    await handleBookingPaid(evt);
    await handleBookingPaid(evt); // duplicate webhook
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.status).toBe("confirmed");
    expect(b.paymentStatus).toBe("paid");
    expect(b.amountPaid).toBe(booking.totalAmount);
    const pays = await db.select().from(schema.payments).where(eq(schema.payments.bookingId, booking.id));
    expect(pays).toHaveLength(1);
    await runDueJobs();
    const mails = await emailsTo(customer.email);
    expect(mails.filter((m) => m.template === "booking.receipt")).toHaveLength(1);
    expect(mails.filter((m) => m.template === "booking.confirmed")).toHaveLength(1);
  });

  it("rejects payment events from a different Stripe account", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online" });
    const { booking } = await book(room.id, future(6));
    await handleBookingPaid({ bookingId: booking.id, accountId: "acct_evil", paymentIntentId: "pi_x", amount: 1 });
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.status).toBe("pending_payment");
    const logs = await db.select().from(schema.auditLog).where(eq(schema.auditLog.action, "payment.account_mismatch"));
    expect(logs).toHaveLength(1);
  });

  it("releases expired holds so the slot becomes bookable again", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online" });
    const start = future(6);
    const { booking } = await book(room.id, start);
    await db.update(schema.bookings).set({ holdExpiresAt: new Date(Date.now() - 1000) }).where(eq(schema.bookings.id, booking.id));
    const second = await book(room.id, start);
    expect(second.booking.status).toBe("pending_payment");
    const [old] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(old.status).toBe("expired");
  });

  it("refunds a late payment automatically when the slot was taken meanwhile", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online" });
    const start = future(6);
    const { booking } = await book(room.id, start);
    await db.update(schema.bookings).set({ holdExpiresAt: new Date(Date.now() - 1000) }).where(eq(schema.bookings.id, booking.id));
    const other = await book(room.id, start);
    await handleBookingPaid({ bookingId: other.booking.id, accountId: org.stripeAccountId!, paymentIntentId: "pi_other", amount: other.booking.totalAmount });
    await handleBookingPaid({ bookingId: booking.id, accountId: org.stripeAccountId!, paymentIntentId: "pi_late", amount: booking.totalAmount });
    const [late] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(late.status).toBe("cancelled");
    expect(late.amountRefunded).toBe(booking.totalAmount);
    expect(late.paymentStatus).toBe("refunded");
  });

  it("re-activates a late payment if the slot is still free", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online" });
    const { booking } = await book(room.id, future(6));
    await db.update(schema.bookings).set({ holdExpiresAt: new Date(Date.now() - 1000) }).where(eq(schema.bookings.id, booking.id));
    await db.transaction((tx) => expireStale(tx, room.id));
    await handleBookingPaid({ bookingId: booking.id, accountId: org.stripeAccountId!, paymentIntentId: "pi_late2", amount: booking.totalAmount });
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.status).toBe("confirmed");
  });
});

describe("cancellation & refunds", () => {
  it("refunds according to the cancellation policy", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online", cancellationPolicy: { freeUntilHours: 72, partialRefundPercent: 50, partialUntilHours: 24 } });
    const { booking } = await book(room.id, future(2)); // ~48h ahead -> 50%
    await handleBookingPaid({ bookingId: booking.id, accountId: org.stripeAccountId!, paymentIntentId: "pi_c", amount: booking.totalAmount });
    const { refund } = await cancelBooking({ bookingId: booking.id, by: "customer", actor: "customer" });
    expect(refund).toBe(5000);
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.status).toBe("cancelled");
    expect(b.amountRefunded).toBe(5000);
    expect(b.paymentStatus).toBe("partially_refunded");
    // Slot is free again
    await expect(book(room.id, future(2))).resolves.toBeTruthy();
    // Second cancel is rejected
    await expect(cancelBooking({ bookingId: booking.id, by: "customer", actor: "customer" })).rejects.toMatchObject({ code: "state" });
  });

  it("landlord cancellation refunds everything", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online" });
    const { booking } = await book(room.id, future(1));
    await handleBookingPaid({ bookingId: booking.id, accountId: org.stripeAccountId!, paymentIntentId: "pi_l", amount: booking.totalAmount });
    const { refund } = await cancelBooking({ bookingId: booking.id, by: "landlord", orgId: org.id, actor: "user:x", reason: "Wasserschaden" });
    expect(refund).toBe(booking.totalAmount);
  });

  it("landlord of another tenant cannot cancel", async () => {
    const { org } = await createOrg();
    const { org: other } = await createOrg();
    const room = await createRoom(org.id);
    const { booking } = await book(room.id, future(5));
    await expect(cancelBooking({ bookingId: booking.id, by: "landlord", orgId: other.id, actor: "x" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("requests", () => {
  it("request -> approve -> awaiting payment -> paid", async () => {
    const { org, user } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { bookingMode: "request", paymentMode: "online" });
    const { booking } = await book(room.id, future(10));
    expect(booking.status).toBe("requested");
    await expect(book(room.id, future(10))).rejects.toMatchObject({ code: "unavailable" });
    await approveRequest(org.id, booking.id, user.id);
    const [a] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(a.status).toBe("awaiting_payment");
    await handleBookingPaid({ bookingId: booking.id, accountId: org.stripeAccountId!, paymentIntentId: "pi_r", amount: a.totalAmount });
    const [p] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(p.status).toBe("confirmed");
  });

  it("request -> decline frees the slot", async () => {
    const { org, user } = await createOrg();
    const room = await createRoom(org.id, { bookingMode: "request" });
    const { booking } = await book(room.id, future(10));
    await declineRequest(org.id, booking.id, user.id, "Bereits vergeben");
    await expect(book(room.id, future(10))).resolves.toBeTruthy();
    await runDueJobs();
    expect((await emailsTo(customer.email)).map((m) => m.template)).toContain("booking.declined");
  });
});

describe("rescheduling", () => {
  it("customer can reschedule within the free window, not into a taken slot", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const { booking } = await book(room.id, future(10));
    await book(room.id, future(12));
    await expect(rescheduleBooking({ bookingId: booking.id, newStart: future(12), by: "customer", actor: "customer" })).rejects.toMatchObject({ code: "unavailable" });
    await rescheduleBooking({ bookingId: booking.id, newStart: future(11), by: "customer", actor: "customer" });
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.startsAt.toISOString()).toBe(future(11).toISOString());
  });

  it("customer cannot reschedule after the free cancellation window", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id, { cancellationPolicy: { freeUntilHours: 72, partialRefundPercent: 0, partialUntilHours: 0 } });
    const { booking } = await book(room.id, future(1));
    await expect(rescheduleBooking({ bookingId: booking.id, newStart: future(4), by: "customer", actor: "customer" })).rejects.toMatchObject({ code: "policy" });
  });
});

describe("discount codes", () => {
  it("cannot be redeemed more often than allowed, even concurrently", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    await db.insert(schema.discountCodes).values({ orgId: org.id, code: "SOMMER", kind: "percent", value: 10, maxRedemptions: 2 });
    const results = await Promise.allSettled([1, 2, 3, 4, 5].map((d) => book(room.id, future(20 + d), 2, { discountCode: "sommer" })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const [code] = await db.select().from(schema.discountCodes);
    expect(code.redemptionCount).toBe(2);
  });
});

describe("reminders", () => {
  it("sends a reminder once within the reminder window", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const { booking } = await book(room.id, future(5));
    // pretend the booking was made long ago and starts in 20 hours
    const start = new Date(Date.now() + 20 * H);
    await db
      .update(schema.bookings)
      .set({ startsAt: start, endsAt: new Date(start.getTime() + 2 * H), createdAt: new Date(Date.now() - 10 * 86400_000) })
      .where(eq(schema.bookings.id, booking.id));
    expect(await sendDueReminders()).toBe(1);
    expect(await sendDueReminders()).toBe(0);
    await runDueJobs();
    expect((await emailsTo(customer.email)).filter((m) => m.template === "booking.reminder")).toHaveLength(1);
  });
});
