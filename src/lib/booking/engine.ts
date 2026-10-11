import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema, type DbOrTx, type Tx } from "@/lib/db";
import { activePlan, hasAccess } from "@/lib/billing/entitlements";
import { env, paymentsEnabled } from "@/lib/env";
import { gateway } from "@/lib/payments/gateway";
import { logError } from "@/lib/security/errors";
import { randomBytes } from "node:crypto";
import {
  occupiedRange,
  validateBookingTime,
  VALIDATION_MESSAGES,
  type AvailabilityRoom,
  type Interval,
} from "./availability";
import { bookingUrl } from "./links";
import * as N from "./notify";
import { canCustomerReschedule, computeRefund } from "./policy";
import { computePrice, computeRent, hasAnyPrice, type PricingRule } from "./pricing";

type Room = typeof schema.rooms.$inferSelect;
type Org = typeof schema.organizations.$inferSelect;
type Booking = typeof schema.bookings.$inferSelect;

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const MIN = 60_000;
export const HOLD_MINUTES = 35; // Stripe Checkout sessions expire after 31 min, hold slightly longer.
const BLOCKING = ["requested", "awaiting_payment", "pending_payment", "confirmed"] as const;

function isExclusionViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23P01" || e?.cause?.code === "23P01";
}

function rangeLiteral(iv: Interval): string {
  return `[${iv.start.toISOString()},${iv.end.toISOString()})`;
}

export function newReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return "RV-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/* ------------------------------------------------------------------ */
/* Loading helpers                                                     */
/* ------------------------------------------------------------------ */

export async function loadAvailabilityRoom(tx: DbOrTx, room: Room): Promise<AvailabilityRoom> {
  const hours = await tx.select().from(schema.roomOpeningHours).where(eq(schema.roomOpeningHours.roomId, room.id));
  return {
    timezone: room.timezone,
    openingHours: hours.map((h) => ({ weekday: h.weekday, startMinute: h.startMinute, endMinute: h.endMinute })),
    minDurationMinutes: room.minDurationMinutes,
    maxDurationMinutes: room.maxDurationMinutes,
    slotIntervalMinutes: room.slotIntervalMinutes,
    leadTimeMinutes: room.leadTimeMinutes,
    maxAdvanceDays: room.maxAdvanceDays,
    bufferBeforeMinutes: room.bufferBeforeMinutes,
    bufferAfterMinutes: room.bufferAfterMinutes,
  };
}

/** Busy intervals of a room: active bookings (incl. buffers) plus manual/holiday/iCal blocks. */
export async function loadBusy(tx: DbOrTx, room: Pick<Room, "id" | "orgId">, from: Date, to: Date, excludeBookingId?: string): Promise<Interval[]> {
  const exclude = excludeBookingId ?? "00000000-0000-0000-0000-000000000000";
  const rows = await tx.execute<{ s: Date | string; e: Date | string }>(sql`
    SELECT lower(occupied) AS s, upper(occupied) AS e FROM bookings
      WHERE room_id = ${room.id}
        AND status IN ('requested','awaiting_payment','pending_payment','confirmed')
        AND occupied && tstzrange(${from.toISOString()}::timestamptz, ${to.toISOString()}::timestamptz)
        AND id <> ${exclude}::uuid
        AND NOT (status = 'pending_payment' AND hold_expires_at < now())
    UNION ALL
    SELECT starts_at AS s, ends_at AS e FROM room_blocks
      WHERE org_id = ${room.orgId} AND (room_id = ${room.id} OR room_id IS NULL)
        AND starts_at < ${to.toISOString()}::timestamptz AND ends_at > ${from.toISOString()}::timestamptz`);
  return rows.map((r) => ({ start: new Date(r.s), end: new Date(r.e) }));
}

async function loadRules(tx: DbOrTx, room: Room): Promise<PricingRule[]> {
  const rows = await tx
    .select()
    .from(schema.priceRules)
    .where(and(eq(schema.priceRules.orgId, room.orgId), eq(schema.priceRules.active, true)));
  return rows
    .filter((r) => !r.roomId || r.roomId === room.id)
    .map((r) => ({
      name: r.name,
      weekdays: r.weekdays,
      startDate: r.startDate,
      endDate: r.endDate,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      adjustmentPercent: r.adjustmentPercent,
    }));
}

export function canTakeOnlinePayments(org: Org): boolean {
  return paymentsEnabled && !!org.stripeAccountId && org.stripeChargesEnabled;
}

/* ------------------------------------------------------------------ */
/* Expiry of holds, requests and unpaid approvals                      */
/* ------------------------------------------------------------------ */

export async function expireStale(tx: DbOrTx, roomId?: string): Promise<number> {
  const rows = await tx.execute<{ id: string; prev: string; discount_code_id: string | null }>(sql`
    WITH c AS (
      SELECT id, status FROM bookings
      WHERE (${roomId ?? null}::uuid IS NULL OR room_id = ${roomId ?? null}::uuid)
        AND ((status = 'pending_payment' AND hold_expires_at < now())
          OR (status = 'requested' AND request_expires_at < now())
          OR (status = 'awaiting_payment' AND payment_due_at < now()))
      FOR UPDATE SKIP LOCKED
    )
    UPDATE bookings b SET status = 'expired', updated_at = now(),
      payment_status = CASE WHEN b.payment_status = 'pending' THEN 'none' ELSE b.payment_status END
    FROM c WHERE b.id = c.id
    RETURNING b.id, c.status AS prev, b.discount_code_id`);
  for (const r of rows) {
    if (r.discount_code_id) await releaseDiscount(tx, r.discount_code_id);
    await tx.insert(schema.bookingEvents).values({ bookingId: r.id, type: "expired", actor: "system", data: { previous: r.prev } });
    await N.notifyExpired(tx, r.id, r.prev);
  }
  return rows.length;
}

async function releaseDiscount(tx: DbOrTx, discountCodeId: string) {
  await tx
    .update(schema.discountCodes)
    .set({ redemptionCount: sql`greatest(${schema.discountCodes.redemptionCount} - 1, 0)` })
    .where(eq(schema.discountCodes.id, discountCodeId));
}

/* ------------------------------------------------------------------ */
/* Quote (price preview) and creation                                  */
/* ------------------------------------------------------------------ */

export type BookingRequestInput = {
  roomId: string;
  start: Date;
  end: Date;
  guests: number;
  extras: { extraId: string; quantity: number }[];
  discountCode?: string | null;
};

async function priceFor(tx: DbOrTx, room: Room, org: Org, input: BookingRequestInput, now: Date) {
  const plan = await activePlan(org, tx);
  const rules = plan?.features.priceRules ? await loadRules(tx, room) : [];
  let extrasSel: { extra: typeof schema.extras.$inferSelect; quantity: number }[] = [];
  if (plan?.features.extras && input.extras.length) {
    const ids = input.extras.map((e) => e.extraId);
    const rows = await tx
      .select()
      .from(schema.extras)
      .where(and(eq(schema.extras.orgId, room.orgId), eq(schema.extras.active, true), inArray(schema.extras.id, ids)));
    extrasSel = rows
      .filter((x) => !x.roomIds || x.roomIds.length === 0 || x.roomIds.includes(room.id))
      .map((x) => ({ extra: x, quantity: input.extras.find((e) => e.extraId === x.id)?.quantity ?? 0 }));
  }
  let discount: (typeof schema.discountCodes.$inferSelect) | null = null;
  const code = input.discountCode?.trim();
  if (code) {
    if (!plan?.features.discountCodes) throw new BookingError("discount", "Rabattcodes werden für diesen Raum nicht angeboten.");
    const [d] = await tx
      .select()
      .from(schema.discountCodes)
      .where(and(eq(schema.discountCodes.orgId, room.orgId), eq(schema.discountCodes.code, code), eq(schema.discountCodes.active, true)))
      .limit(1);
    const valid =
      d &&
      (!d.validFrom || d.validFrom <= now) &&
      (!d.validUntil || d.validUntil >= now) &&
      (d.maxRedemptions == null || d.redemptionCount < d.maxRedemptions) &&
      (!d.roomIds || d.roomIds.length === 0 || d.roomIds.includes(room.id));
    if (!valid) throw new BookingError("discount", "Dieser Rabattcode ist ungültig oder abgelaufen.");
    discount = d;
  }
  const price = computePrice({
    room,
    rules,
    start: input.start,
    end: input.end,
    guests: input.guests,
    extras: extrasSel.map((e) => ({ extra: e.extra, quantity: e.quantity })),
    discount: discount ? { code: discount.code, kind: discount.kind, value: discount.value, minAmount: discount.minAmount } : null,
    vat: { registered: org.vatRegistered, rateBp: org.vatRateBp },
  });
  if (price.discountError) throw new BookingError("discount", price.discountError);
  return { price, discount };
}

/** Price preview for the public booking form (no side effects). */
export async function quote(input: BookingRequestInput, now = new Date()) {
  const [row] = await db
    .select({ room: schema.rooms, org: schema.organizations })
    .from(schema.rooms)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.rooms.orgId))
    .where(eq(schema.rooms.id, input.roomId))
    .limit(1);
  if (!row) throw new BookingError("not_found", "Raum nicht gefunden.");
  const { price } = await priceFor(db, row.room, row.org, input, now);
  return price;
}

export type CreateBookingInput = BookingRequestInput & {
  customer: { name: string; email: string; phone?: string | null; company?: string | null; message?: string | null };
  source: "online" | "widget" | "manual";
  /** Set for bookings created by the landlord in the dashboard. */
  manual?: { orgId: string; userId: string; ignoreRules: boolean; markPaid: boolean; internalNote?: string | null; notifyCustomer?: boolean };
  now?: Date;
};

export async function createBooking(input: CreateBookingInput): Promise<{ booking: Booking; needsPayment: boolean }> {
  const now = input.now ?? new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.transaction((tx) => createBookingTx(tx, input, now));
    } catch (err) {
      if (isExclusionViolation(err)) throw new BookingError("unavailable", VALIDATION_MESSAGES.unavailable);
      const e = err as { code?: string; cause?: { code?: string; constraint_name?: string } };
      // Extremely unlikely reference collision: retry with a new reference.
      if ((e.code === "23505" || e.cause?.code === "23505") && String(e.cause?.constraint_name ?? "").includes("reference")) continue;
      throw err;
    }
  }
  throw new Error("Buchung konnte nicht erstellt werden.");
}

async function createBookingTx(tx: Tx, input: CreateBookingInput, now: Date) {
  // 1) Serialise all bookings of this room: row lock on the room.
  const [room] = await tx.select().from(schema.rooms).where(eq(schema.rooms.id, input.roomId)).for("update");
  if (!room) throw new BookingError("not_found", "Raum nicht gefunden.");
  const [org] = await tx.select().from(schema.organizations).where(eq(schema.organizations.id, room.orgId));
  const manual = input.manual;
  if (manual) {
    if (manual.orgId !== room.orgId) throw new BookingError("not_found", "Raum nicht gefunden.");
  } else if (room.status !== "published" || !hasAccess(org) || !hasAnyPrice(room)) {
    throw new BookingError("not_bookable", "Dieser Raum ist derzeit nicht online buchbar.");
  }

  // 2) Release expired holds so they do not block the slot.
  await expireStale(tx, room.id);

  // 3) Validate time against rules and current occupancy.
  const guests = Math.floor(input.guests);
  if (!(guests >= 1)) throw new BookingError("guests", "Bitte geben Sie die Anzahl Personen an.");
  if (guests > room.capacity && !manual?.ignoreRules)
    throw new BookingError("guests", `Dieser Raum ist für höchstens ${room.capacity} Personen geeignet.`);
  const avRoom = await loadAvailabilityRoom(tx, room);
  const busy = await loadBusy(tx, room, new Date(input.start.getTime() - 2 * 86400_000), new Date(input.end.getTime() + 2 * 86400_000));
  const v = validateBookingTime(avRoom, input.start, input.end, busy, now, { ignoreRules: manual?.ignoreRules });
  if (v) throw new BookingError(v, VALIDATION_MESSAGES[v]);

  // 4) Price.
  const { price, discount } = await priceFor(tx, room, org, input, now);
  if (discount && price.discountApplied) {
    const upd = await tx
      .update(schema.discountCodes)
      .set({ redemptionCount: sql`${schema.discountCodes.redemptionCount} + 1` })
      .where(
        and(
          eq(schema.discountCodes.id, discount.id),
          sql`(${schema.discountCodes.maxRedemptions} IS NULL OR ${schema.discountCodes.redemptionCount} < ${schema.discountCodes.maxRedemptions})`,
        ),
      )
      .returning({ id: schema.discountCodes.id });
    if (!upd.length) throw new BookingError("discount", "Dieser Rabattcode ist nicht mehr verfügbar.");
  }

  // 5) Customer record (per tenant).
  const c = input.customer;
  const [customer] = await tx
    .insert(schema.customers)
    .values({ orgId: room.orgId, name: c.name, email: c.email, phone: c.phone || null, company: c.company || null })
    .onConflictDoUpdate({
      target: [schema.customers.orgId, schema.customers.email],
      set: {
        name: c.name,
        phone: sql`coalesce(${c.phone || null}, ${schema.customers.phone})`,
        company: sql`coalesce(${c.company || null}, ${schema.customers.company})`,
        updatedAt: now,
      },
    })
    .returning({ id: schema.customers.id });

  // 6) Status and payment mode.
  const total = price.totalAmount;
  const online = !manual && room.paymentMode === "online" && canTakeOnlinePayments(org) && total > 0;
  let status: Booking["status"];
  let paymentMode: Booking["paymentMode"] = online ? "online" : total > 0 ? "offline" : "none";
  let paymentStatus: Booking["paymentStatus"] = "none";
  let holdExpiresAt: Date | null = null;
  let requestExpiresAt: Date | null = null;
  if (manual) {
    status = "confirmed";
    paymentMode = total > 0 ? "offline" : "none";
    paymentStatus = total === 0 ? "none" : manual.markPaid ? "offline_paid" : "offline_due";
  } else if (room.bookingMode === "request") {
    status = "requested";
    requestExpiresAt = new Date(Math.min(now.getTime() + room.requestExpiryHours * 3600_000, input.start.getTime()));
  } else if (online) {
    status = "pending_payment";
    paymentStatus = "pending";
    holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * MIN);
  } else {
    status = "confirmed";
    paymentStatus = total > 0 ? "offline_due" : "none";
  }

  const occ = occupiedRange(room, input.start, input.end);
  const [booking] = await tx
    .insert(schema.bookings)
    .values({
      orgId: room.orgId,
      roomId: room.id,
      customerId: customer.id,
      reference: newReference(),
      status,
      startsAt: input.start,
      endsAt: input.end,
      bufferBeforeMinutes: room.bufferBeforeMinutes,
      bufferAfterMinutes: room.bufferAfterMinutes,
      occupied: rangeLiteral(occ),
      guests,
      customerName: c.name,
      customerEmail: c.email,
      customerPhone: c.phone || null,
      customerCompany: c.company || null,
      customerMessage: c.message || null,
      internalNote: manual?.internalNote || null,
      source: input.source,
      paymentMode,
      paymentStatus,
      currency: room.currency,
      totalAmount: total,
      depositAmount: price.depositAmount,
      amountPaid: manual?.markPaid ? total : 0,
      priceBreakdown: {
        lines: price.lines,
        rentAmount: price.rentAmount,
        extrasAmount: price.extrasAmount,
        discountAmount: price.discountAmount,
        depositAmount: price.depositAmount,
        totalAmount: price.totalAmount,
        vatAmount: price.vatAmount,
        vatRateBp: price.vatRateBp,
        pricesIncludeVat: price.pricesIncludeVat,
        durationMinutes: price.durationMinutes,
      },
      discountCodeId: price.discountApplied ? discount!.id : null,
      holdExpiresAt,
      requestExpiresAt,
      confirmedAt: status === "confirmed" ? now : null,
      createdByUserId: manual?.userId ?? null,
    })
    .returning();

  if (price.extrasDetail.length) {
    await tx.insert(schema.bookingExtras).values(
      price.extrasDetail.map((e) => ({
        bookingId: booking.id,
        extraId: e.extraId,
        name: e.name,
        pricing: e.pricing,
        quantity: e.quantity,
        unitPrice: e.unitPrice,
        total: e.total,
      })),
    );
  }
  if (manual?.markPaid && total > 0) {
    await tx.insert(schema.payments).values({ orgId: room.orgId, bookingId: booking.id, kind: "offline", status: "succeeded", amount: total, method: "offline" });
  }
  await tx.insert(schema.bookingEvents).values({
    bookingId: booking.id,
    type: "created",
    actor: manual ? `user:${manual.userId}` : "customer",
    data: { status, source: input.source },
  });
  if (!manual || manual.notifyCustomer !== false) await N.notifyCreated(tx, booking.id);
  return { booking, needsPayment: status === "pending_payment" };
}

/* ------------------------------------------------------------------ */
/* Online payment                                                      */
/* ------------------------------------------------------------------ */

/** Creates a hosted checkout for a booking that awaits payment. Returns the redirect URL. */
export async function startCheckout(bookingId: string, now = new Date()): Promise<string> {
  const c = await N.loadBookingCtx(db, bookingId);
  const b = c.booking;
  if (!["pending_payment", "awaiting_payment"].includes(b.status)) {
    throw new BookingError("not_payable", "Diese Buchung kann nicht (mehr) bezahlt werden.");
  }
  if (!canTakeOnlinePayments(c.org) || !c.org.stripeAccountId) {
    throw new BookingError("not_payable", "Onlinezahlung ist für diesen Anbieter derzeit nicht verfügbar.");
  }
  let expiresAt = new Date(now.getTime() + 31 * MIN);
  if (b.status === "pending_payment" && (!b.holdExpiresAt || b.holdExpiresAt < now)) {
    throw new BookingError("expired", "Die Reservation ist abgelaufen. Bitte wählen Sie den Termin erneut.");
  }
  if (b.status === "awaiting_payment") {
    if (b.paymentDueAt && b.paymentDueAt < now) throw new BookingError("expired", "Die Zahlungsfrist ist abgelaufen.");
    // Keep the slot reserved while the checkout page is open.
    const minDue = new Date(now.getTime() + HOLD_MINUTES * MIN);
    if (!b.paymentDueAt || b.paymentDueAt < minDue) {
      await db.update(schema.bookings).set({ paymentDueAt: minDue }).where(eq(schema.bookings.id, b.id));
    }
    expiresAt = new Date(now.getTime() + 31 * MIN);
  }
  const fee = Math.round((b.totalAmount * env.PLATFORM_FEE_BPS) / 10000);
  const session = await gateway().createBookingCheckout({
    accountId: c.org.stripeAccountId,
    bookingId: b.id,
    reference: b.reference,
    description: `${c.room.name} – ${c.org.name}`,
    amount: b.totalAmount,
    currency: b.currency,
    customerEmail: b.customerEmail,
    applicationFee: fee,
    expiresAt,
    successUrl: bookingUrl(b.id, "?zahlung=erfolgreich"),
    cancelUrl: bookingUrl(b.id, "?zahlung=abgebrochen"),
  });
  await db
    .update(schema.bookings)
    .set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() })
    .where(eq(schema.bookings.id, b.id));
  return session.url;
}

/**
 * Called from the Connect webhook when a checkout session is paid.
 * Idempotent: repeated events never double-confirm, double-record or double-mail.
 */
export async function handleBookingPaid(p: { bookingId: string; accountId: string; paymentIntentId: string; amount: number; method?: string | null }) {
  const needsRefund = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, p.bookingId)).for("update");
    if (!b) throw new Error(`Buchung ${p.bookingId} nicht gefunden`);
    const [org] = await tx.select().from(schema.organizations).where(eq(schema.organizations.id, b.orgId));
    if (org.stripeAccountId !== p.accountId) {
      // Never confirm, but do not make Stripe retry forever either: record as security event.
      await tx.insert(schema.auditLog).values({ action: "payment.account_mismatch", orgId: b.orgId, severity: "critical", data: { bookingId: b.id, account: p.accountId } });
      return false;
    }

    const inserted = await tx
      .insert(schema.payments)
      .values({ orgId: b.orgId, bookingId: b.id, kind: "charge", status: "succeeded", amount: p.amount, currency: b.currency, method: p.method ?? null, externalId: p.paymentIntentId })
      .onConflictDoNothing()
      .returning({ id: schema.payments.id });
    if (!inserted.length) return false; // already processed

    const base = { paymentStatus: "paid" as const, amountPaid: b.amountPaid + p.amount, stripePaymentIntentId: p.paymentIntentId, updatedAt: new Date() };
    if (b.status === "pending_payment" || b.status === "awaiting_payment" || b.status === "confirmed") {
      await tx
        .update(schema.bookings)
        .set({ ...base, status: "confirmed", confirmedAt: b.confirmedAt ?? new Date(), holdExpiresAt: null })
        .where(eq(schema.bookings.id, b.id));
      await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "paid", actor: "stripe", data: { amount: p.amount, paymentIntent: p.paymentIntentId } });
      await N.notifyPaid(tx, b.id);
      return false;
    }

    // Late payment for an expired/cancelled reservation: re-activate if the slot is still free.
    try {
      await tx.transaction(async (sp) => {
        await sp
          .update(schema.bookings)
          .set({ ...base, status: "confirmed", confirmedAt: new Date(), holdExpiresAt: null, cancelledAt: null, cancelledBy: null })
          .where(eq(schema.bookings.id, b.id));
      });
      await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "paid_late_reactivated", actor: "stripe", data: { amount: p.amount } });
      await N.notifyPaid(tx, b.id);
      return false;
    } catch (err) {
      if (!isExclusionViolation(err)) throw err;
      await tx
        .update(schema.bookings)
        .set({ ...base, cancelledBy: "system", cancellationReason: "Der Termin wurde in der Zwischenzeit anderweitig vergeben.", cancelledAt: new Date(), status: "cancelled" })
        .where(eq(schema.bookings.id, b.id));
      await tx.insert(schema.payments).values({ orgId: b.orgId, bookingId: b.id, kind: "refund", status: "pending", amount: p.amount, currency: b.currency });
      await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "paid_late_refunded", actor: "system", data: { amount: p.amount } });
      await N.notifyCancelled(tx, b.id, p.amount);
      return true;
    }
  });
  if (needsRefund) await processPendingRefunds(p.bookingId);
}

export async function handleBookingPaymentFailed(bookingId: string) {
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).for("update");
    if (!b || b.status !== "pending_payment") return;
    await tx.update(schema.bookings).set({ status: "expired", paymentStatus: "failed", updatedAt: new Date() }).where(eq(schema.bookings.id, b.id));
    if (b.discountCodeId) await releaseDiscount(tx, b.discountCodeId);
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "payment_failed", actor: "stripe" });
    await N.notifyPaymentFailed(tx, b.id);
  });
}

/** Checkout abandoned/expired: release the hold immediately instead of waiting for the timer. */
export async function handleCheckoutExpired(bookingId: string, sessionId: string) {
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).for("update");
    if (!b || b.status !== "pending_payment" || b.stripeCheckoutSessionId !== sessionId) return;
    await tx.update(schema.bookings).set({ status: "expired", paymentStatus: "none", updatedAt: new Date() }).where(eq(schema.bookings.id, b.id));
    if (b.discountCodeId) await releaseDiscount(tx, b.discountCodeId);
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "checkout_expired", actor: "stripe" });
  });
}

/** Sync refunds made directly in the Stripe dashboard. */
export async function syncChargeRefunded(p: { paymentIntentId: string; amountRefunded: number; chargeId: string; accountId: string }) {
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.stripePaymentIntentId, p.paymentIntentId)).for("update");
    if (!b) return;
    const [org] = await tx.select().from(schema.organizations).where(eq(schema.organizations.id, b.orgId));
    if (org.stripeAccountId !== p.accountId) return;
    if (p.amountRefunded <= b.amountRefunded) return;
    const diff = p.amountRefunded - b.amountRefunded;
    await tx
      .insert(schema.payments)
      .values({ orgId: b.orgId, bookingId: b.id, kind: "refund", status: "succeeded", amount: diff, currency: b.currency, externalId: `${p.chargeId}:${p.amountRefunded}` })
      .onConflictDoNothing();
    const amountRefunded = Math.min(b.amountPaid, p.amountRefunded);
    await tx
      .update(schema.bookings)
      .set({ amountRefunded, paymentStatus: amountRefunded >= b.amountPaid ? "refunded" : "partially_refunded", updatedAt: new Date() })
      .where(eq(schema.bookings.id, b.id));
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "refund_synced", actor: "stripe", data: { amount: diff } });
  });
}

/** Executes pending refunds against Stripe. Safe to call repeatedly (idempotency keys). */
export async function processPendingRefunds(bookingId: string): Promise<{ ok: number; failed: number }> {
  const pending = await db
    .select()
    .from(schema.payments)
    .where(and(eq(schema.payments.bookingId, bookingId), eq(schema.payments.kind, "refund"), eq(schema.payments.status, "pending")));
  let ok = 0;
  let failed = 0;
  for (const r of pending) {
    const c = await N.loadBookingCtx(db, bookingId);
    try {
      if (!c.booking.stripePaymentIntentId || !c.org.stripeAccountId) throw new Error("Keine Stripe-Zahlung zur Buchung vorhanden");
      const refund = await gateway().refund({
        accountId: c.org.stripeAccountId,
        paymentIntentId: c.booking.stripePaymentIntentId,
        amount: r.amount,
        idempotencyKey: `refund:${r.id}`,
      });
      await db.transaction(async (tx) => {
        const done = await tx
          .update(schema.payments)
          .set({ status: "succeeded", externalId: refund.id })
          .where(and(eq(schema.payments.id, r.id), eq(schema.payments.status, "pending")))
          .returning({ id: schema.payments.id });
        if (!done.length) return;
        const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).for("update");
        const amountRefunded = Math.min(b.amountPaid, b.amountRefunded + r.amount);
        await tx
          .update(schema.bookings)
          .set({ amountRefunded, paymentStatus: amountRefunded >= b.amountPaid ? "refunded" : "partially_refunded", updatedAt: new Date() })
          .where(eq(schema.bookings.id, bookingId));
        await tx.insert(schema.bookingEvents).values({ bookingId, type: "refunded", actor: "system", data: { amount: r.amount, refund: refund.id } });
      });
      ok++;
    } catch (err) {
      failed++;
      await logError("refund", err, { bookingId, paymentRowId: r.id });
    }
  }
  return { ok, failed };
}

export async function pendingRefundAmount(tx: DbOrTx, bookingId: string): Promise<number> {
  const [r] = await tx.execute<{ n: number }>(
    sql`SELECT coalesce(sum(amount),0)::int AS n FROM payments WHERE booking_id = ${bookingId} AND kind = 'refund' AND status = 'pending'`,
  );
  return r?.n ?? 0;
}

/* ------------------------------------------------------------------ */
/* Requests: approve / decline                                         */
/* ------------------------------------------------------------------ */

async function lockOrgBooking(tx: Tx, orgId: string, bookingId: string) {
  const [b] = await tx
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.orgId, orgId)))
    .for("update");
  if (!b) throw new BookingError("not_found", "Buchung nicht gefunden.");
  return b;
}

export async function approveRequest(orgId: string, bookingId: string, userId: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const b = await lockOrgBooking(tx, orgId, bookingId);
    if (b.status !== "requested") throw new BookingError("state", "Diese Anfrage wurde bereits bearbeitet.");
    const [org] = await tx.select().from(schema.organizations).where(eq(schema.organizations.id, orgId));
    const [room] = await tx.select().from(schema.rooms).where(eq(schema.rooms.id, b.roomId));
    const online = room.paymentMode === "online" && canTakeOnlinePayments(org) && b.totalAmount > 0;
    if (online) {
      const due = new Date(Math.max(now.getTime() + HOLD_MINUTES * MIN, Math.min(now.getTime() + 48 * 3600_000, b.startsAt.getTime())));
      await tx
        .update(schema.bookings)
        .set({ status: "awaiting_payment", paymentMode: "online", paymentStatus: "pending", paymentDueAt: due, requestExpiresAt: null, updatedAt: now })
        .where(eq(schema.bookings.id, b.id));
      await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "approved", actor: `user:${userId}`, data: { awaitingPayment: true } });
      await N.notifyAwaitingPayment(tx, b.id);
    } else {
      await tx
        .update(schema.bookings)
        .set({
          status: "confirmed",
          paymentMode: b.totalAmount > 0 ? "offline" : "none",
          paymentStatus: b.totalAmount > 0 ? "offline_due" : "none",
          confirmedAt: now,
          requestExpiresAt: null,
          updatedAt: now,
        })
        .where(eq(schema.bookings.id, b.id));
      await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "approved", actor: `user:${userId}` });
      await N.notifyCreated(tx, b.id);
    }
  });
}

export async function declineRequest(orgId: string, bookingId: string, userId: string, reason: string | null) {
  await db.transaction(async (tx) => {
    const b = await lockOrgBooking(tx, orgId, bookingId);
    if (b.status !== "requested" && b.status !== "awaiting_payment") throw new BookingError("state", "Diese Anfrage wurde bereits bearbeitet.");
    await tx
      .update(schema.bookings)
      .set({ status: "declined", cancellationReason: reason, cancelledAt: new Date(), cancelledBy: "landlord", paymentStatus: "none", updatedAt: new Date() })
      .where(eq(schema.bookings.id, b.id));
    if (b.discountCodeId) await releaseDiscount(tx, b.discountCodeId);
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "declined", actor: `user:${userId}`, data: { reason } });
    await N.notifyDeclined(tx, b.id);
  });
}

/* ------------------------------------------------------------------ */
/* Cancellation                                                        */
/* ------------------------------------------------------------------ */

export async function cancelBooking(p: {
  bookingId: string;
  by: "customer" | "landlord" | "system";
  orgId?: string;
  actor: string;
  reason?: string | null;
  now?: Date;
}): Promise<{ refund: number }> {
  const now = p.now ?? new Date();
  const result = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, p.bookingId)).for("update");
    if (!b || (p.orgId && b.orgId !== p.orgId)) throw new BookingError("not_found", "Buchung nicht gefunden.");
    if (!(BLOCKING as readonly string[]).includes(b.status)) throw new BookingError("state", "Diese Buchung ist bereits storniert oder abgeschlossen.");
    if (p.by === "customer" && b.endsAt < now) throw new BookingError("state", "Vergangene Buchungen können nicht storniert werden.");
    const [room] = await tx.select().from(schema.rooms).where(eq(schema.rooms.id, b.roomId));
    const alreadyPending = await pendingRefundAmount(tx, b.id);
    const { refund } = computeRefund({
      policy: room.cancellationPolicy,
      startsAt: b.startsAt,
      now,
      amountPaid: b.paymentMode === "online" ? b.amountPaid : 0,
      amountRefunded: b.amountRefunded + alreadyPending,
      depositAmount: b.depositAmount,
      cancelledBy: p.by,
    });
    await tx
      .update(schema.bookings)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancelledBy: p.by,
        cancellationReason: p.reason ?? null,
        paymentStatus: b.paymentStatus === "pending" ? "none" : b.paymentStatus,
        updatedAt: now,
      })
      .where(eq(schema.bookings.id, b.id));
    if (refund > 0) {
      await tx.insert(schema.payments).values({ orgId: b.orgId, bookingId: b.id, kind: "refund", status: "pending", amount: refund, currency: b.currency });
    }
    if (b.discountCodeId && b.status !== "confirmed") await releaseDiscount(tx, b.discountCodeId);
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "cancelled", actor: p.actor, data: { by: p.by, refund, reason: p.reason ?? null } });
    await N.notifyCancelled(tx, b.id, refund);
    return { refund, booking: b, accountId: (await tx.select({ a: schema.organizations.stripeAccountId }).from(schema.organizations).where(eq(schema.organizations.id, b.orgId)))[0]?.a };
  });
  if (result.booking.status === "pending_payment" && result.booking.stripeCheckoutSessionId && result.accountId) {
    try {
      await gateway().expireBookingCheckout(result.accountId, result.booking.stripeCheckoutSessionId);
    } catch {
      /* best effort */
    }
  }
  if (result.refund > 0) await processPendingRefunds(p.bookingId);
  return { refund: result.refund };
}

/** Landlord-initiated partial refund (e.g. returning a deposit). */
export async function refundAmount(orgId: string, bookingId: string, amount: number, userId: string) {
  await db.transaction(async (tx) => {
    const b = await lockOrgBooking(tx, orgId, bookingId);
    if (b.paymentMode !== "online" || b.amountPaid === 0) throw new BookingError("state", "Für diese Buchung gibt es keine Onlinezahlung.");
    const pending = await pendingRefundAmount(tx, b.id);
    const max = b.amountPaid - b.amountRefunded - pending;
    if (!(amount > 0) || amount > max) throw new BookingError("amount", "Der Betrag übersteigt den rückerstattbaren Betrag.");
    await tx.insert(schema.payments).values({ orgId, bookingId: b.id, kind: "refund", status: "pending", amount, currency: b.currency });
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "refund_requested", actor: `user:${userId}`, data: { amount } });
  });
  return processPendingRefunds(bookingId);
}

export async function markOfflinePaid(orgId: string, bookingId: string, userId: string) {
  await db.transaction(async (tx) => {
    const b = await lockOrgBooking(tx, orgId, bookingId);
    if (b.paymentStatus !== "offline_due") throw new BookingError("state", "Diese Buchung ist nicht als offen markiert.");
    await tx
      .update(schema.bookings)
      .set({ paymentStatus: "offline_paid", amountPaid: b.totalAmount, updatedAt: new Date() })
      .where(eq(schema.bookings.id, b.id));
    await tx.insert(schema.payments).values({ orgId, bookingId: b.id, kind: "offline", status: "succeeded", amount: b.totalAmount, currency: b.currency, method: "offline" });
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "marked_paid", actor: `user:${userId}` });
  });
}

/* ------------------------------------------------------------------ */
/* Rescheduling                                                        */
/* ------------------------------------------------------------------ */

export async function rescheduleBooking(p: { bookingId: string; newStart: Date; by: "customer" | "landlord"; orgId?: string; actor: string; now?: Date }) {
  const now = p.now ?? new Date();
  try {
    await db.transaction(async (tx) => {
      const [peek] = await tx.select({ roomId: schema.bookings.roomId, orgId: schema.bookings.orgId }).from(schema.bookings).where(eq(schema.bookings.id, p.bookingId));
      if (!peek || (p.orgId && peek.orgId !== p.orgId)) throw new BookingError("not_found", "Buchung nicht gefunden.");
      // Lock order room -> booking (same as createBooking) prevents deadlocks.
      const [room] = await tx.select().from(schema.rooms).where(eq(schema.rooms.id, peek.roomId)).for("update");
      const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, p.bookingId)).for("update");
      if (b.status !== "confirmed" && !(p.by === "landlord" && b.status === "requested")) {
        throw new BookingError("state", "Nur bestätigte Buchungen können verschoben werden.");
      }
      const duration = b.endsAt.getTime() - b.startsAt.getTime();
      const newEnd = new Date(p.newStart.getTime() + duration);
      if (p.by === "customer") {
        if (!canCustomerReschedule(room.cancellationPolicy, b.startsAt, now)) {
          throw new BookingError("policy", "Eine Umbuchung ist nur bis zum Ende der kostenlosen Stornierungsfrist möglich. Bitte kontaktieren Sie den Vermieter.");
        }
        const [org] = await tx.select().from(schema.organizations).where(eq(schema.organizations.id, b.orgId));
        const plan = await activePlan(org, tx);
        const rules = plan?.features.priceRules ? await loadRules(tx, room) : [];
        const rent = computeRent(room, rules, p.newStart, newEnd);
        if (rent.adjusted > b.priceBreakdown.rentAmount) {
          throw new BookingError("price", "Der neue Termin ist teurer. Bitte wenden Sie sich für diese Umbuchung an den Vermieter.");
        }
      }
      const avRoom = await loadAvailabilityRoom(tx, room);
      avRoom.bufferBeforeMinutes = b.bufferBeforeMinutes;
      avRoom.bufferAfterMinutes = b.bufferAfterMinutes;
      const busy = await loadBusy(tx, room, new Date(p.newStart.getTime() - 2 * 86400_000), new Date(newEnd.getTime() + 2 * 86400_000), b.id);
      const v = validateBookingTime(avRoom, p.newStart, newEnd, busy, now, { ignoreRules: p.by === "landlord" });
      if (v) throw new BookingError(v, VALIDATION_MESSAGES[v]);
      const occ = occupiedRange(avRoom, p.newStart, newEnd);
      await tx
        .update(schema.bookings)
        .set({ startsAt: p.newStart, endsAt: newEnd, occupied: rangeLiteral(occ), reminderSentAt: null, calendarConflict: false, updatedAt: now })
        .where(eq(schema.bookings.id, b.id));
      await tx.insert(schema.bookingEvents).values({
        bookingId: b.id,
        type: "rescheduled",
        actor: p.actor,
        data: { from: b.startsAt.toISOString(), to: p.newStart.toISOString(), by: p.by },
      });
      await N.notifyRescheduled(tx, b.id, { startsAt: b.startsAt, endsAt: b.endsAt });
    });
  } catch (err) {
    if (isExclusionViolation(err)) throw new BookingError("unavailable", VALIDATION_MESSAGES.unavailable);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Reminders                                                           */
/* ------------------------------------------------------------------ */

export async function sendDueReminders(now = new Date()): Promise<number> {
  const rows = await db
    .select({ booking: schema.bookings, org: schema.organizations })
    .from(schema.bookings)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.bookings.orgId))
    .where(
      and(
        eq(schema.bookings.status, "confirmed"),
        sql`${schema.bookings.reminderSentAt} IS NULL`,
        sql`${schema.bookings.startsAt} > ${now.toISOString()}::timestamptz`,
        sql`${schema.bookings.startsAt} < ${new Date(now.getTime() + 7 * 86400_000).toISOString()}::timestamptz`,
      ),
    );
  let sent = 0;
  for (const { booking, org } of rows) {
    const s = org.notificationSettings;
    if (!s.customerReminders) continue;
    if (booking.startsAt.getTime() - now.getTime() > s.reminderHoursBefore * 3600_000) continue;
    // Do not remind for bookings created within the reminder window (they just got a confirmation).
    if (booking.startsAt.getTime() - booking.createdAt.getTime() < s.reminderHoursBefore * 3600_000) continue;
    const plan = await activePlan(org);
    if (!plan?.features.reminders) continue;
    await db.transaction(async (tx) => {
      const upd = await tx
        .update(schema.bookings)
        .set({ reminderSentAt: now })
        .where(and(eq(schema.bookings.id, booking.id), sql`${schema.bookings.reminderSentAt} IS NULL`))
        .returning({ id: schema.bookings.id });
      if (upd.length) {
        await N.notifyReminder(tx, booking.id);
        sent++;
      }
    });
  }
  return sent;
}

/** Silently releases a pending online booking (e.g. payment page could not be created). */
export async function abandonPendingBooking(bookingId: string) {
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).for("update");
    if (!b || b.status !== "pending_payment") return;
    await tx.update(schema.bookings).set({ status: "expired", paymentStatus: "none", updatedAt: new Date() }).where(eq(schema.bookings.id, b.id));
    if (b.discountCodeId) await releaseDiscount(tx, b.discountCodeId);
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, type: "abandoned", actor: "system" });
  });
}
