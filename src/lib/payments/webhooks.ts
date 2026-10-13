import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db, schema } from "@/lib/db";
import { recordInvoice, syncSubscription, type InvoiceData, type SubscriptionData } from "@/lib/billing/subscription";
import {
  handleBookingPaid,
  handleBookingPaymentFailed,
  handleCheckoutExpired,
  syncChargeRefunded,
} from "@/lib/booking/engine";
import { logError } from "@/lib/security/errors";

const ts = (n: number | null | undefined) => (n ? new Date(n * 1000) : null);
const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : (x?.id ?? null));

export function normaliseSubscription(sub: Stripe.Subscription): SubscriptionData {
  const item = sub.items?.data?.[0];
  return {
    id: sub.id,
    customerId: idOf(sub.customer)!,
    orgId: (sub.metadata?.org_id as string) || null,
    status: sub.status,
    priceId: item?.price?.id ?? null,
    planKeyHint: (sub.metadata?.plan_key as string) || null,
    unitAmount: item?.price?.unit_amount ?? null,
    interval: item?.price?.recurring?.interval === "year" ? "year" : "month",
    cancelAtPeriodEnd: !!sub.cancel_at_period_end || !!sub.cancel_at,
    currentPeriodEnd: ts(item?.current_period_end ?? null),
    trialEnd: ts(sub.trial_end),
    canceledAt: ts(sub.canceled_at),
  };
}

export function normaliseInvoice(inv: Stripe.Invoice): InvoiceData {
  const subId = inv.parent?.subscription_details?.subscription;
  return {
    id: inv.id!,
    customerId: idOf(inv.customer)!,
    subscriptionId: idOf(subId as string | { id: string } | null | undefined),
    number: inv.number ?? null,
    status: inv.status ?? "unknown",
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdf: inv.invoice_pdf ?? null,
    periodStart: ts(inv.period_start),
    periodEnd: ts(inv.period_end),
    billingReason: inv.billing_reason ?? null,
  };
}

async function syncAccount(account: Stripe.Account) {
  await db
    .update(schema.organizations)
    .set({
      stripeChargesEnabled: !!account.charges_enabled,
      stripePayoutsEnabled: !!account.payouts_enabled,
      stripeDetailsSubmitted: !!account.details_submitted,
      updatedAt: new Date(),
    })
    .where(eq(schema.organizations.stripeAccountId, account.id));
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, account: string | undefined) {
  if (session.mode === "subscription") {
    const orgId = session.client_reference_id || (session.metadata?.org_id as string | undefined);
    const customer = idOf(session.customer);
    if (orgId && customer) {
      await db
        .update(schema.organizations)
        .set({ stripeCustomerId: customer })
        .where(sql`${schema.organizations.id} = ${orgId} AND ${schema.organizations.stripeCustomerId} IS NULL`);
    }
    return;
  }
  if (session.mode !== "payment" || !account) return;
  const bookingId = session.client_reference_id || (session.metadata?.booking_id as string | undefined);
  if (!bookingId) return;
  if (session.payment_status === "paid") {
    await handleBookingPaid({
      bookingId,
      accountId: account,
      paymentIntentId: idOf(session.payment_intent as string | { id: string } | null) ?? session.id,
      amount: session.amount_total ?? 0,
      method: session.payment_method_types?.join(",") ?? null,
    });
  }
  // payment_status "unpaid" = delayed payment method; wait for async_payment_succeeded.
}

/** Dispatches a verified Stripe event. Throws to signal Stripe to retry. */
export async function dispatchStripeEvent(event: Stripe.Event, source: "platform" | "connect") {
  const account = event.account;
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object, account);
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutCompleted({ ...event.data.object, payment_status: "paid" }, account);
    case "checkout.session.async_payment_failed": {
      const id = event.data.object.client_reference_id;
      if (id && event.data.object.mode === "payment") await handleBookingPaymentFailed(id);
      return;
    }
    case "checkout.session.expired": {
      const s = event.data.object;
      if (s.mode === "payment" && s.client_reference_id) await handleCheckoutExpired(s.client_reference_id, s.id);
      return;
    }
    case "charge.refunded": {
      const ch = event.data.object;
      const pi = idOf(ch.payment_intent as string | { id: string } | null);
      if (pi && account) await syncChargeRefunded({ paymentIntentId: pi, amountRefunded: ch.amount_refunded, chargeId: ch.id, accountId: account });
      return;
    }
    case "account.updated":
      return syncAccount(event.data.object);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      if (source === "platform") await syncSubscription(normaliseSubscription(event.data.object));
      return;
    case "invoice.paid":
      if (source === "platform") await recordInvoice(normaliseInvoice(event.data.object), "paid");
      return;
    case "invoice.payment_failed":
      if (source === "platform") await recordInvoice(normaliseInvoice(event.data.object), "failed");
      return;
    case "invoice.finalized":
    case "invoice.updated":
    case "invoice.voided":
      if (source === "platform") await recordInvoice(normaliseInvoice(event.data.object), "updated");
      return;
    default:
      return;
  }
}

/**
 * Idempotent event processing: every Stripe event id is processed successfully at most once.
 * A short-lived claim (locked_at) prevents parallel processing of the same event without
 * holding a database transaction open during the handlers (which are idempotent themselves).
 */
export async function processStripeEvent(event: Stripe.Event, source: "platform" | "connect"): Promise<"processed" | "duplicate" | "in_progress"> {
  await db.insert(schema.stripeEvents).values({ id: event.id, type: event.type, account: event.account ?? null }).onConflictDoNothing();
  const claimed = await db
    .update(schema.stripeEvents)
    .set({ lockedAt: new Date() })
    .where(
      sql`${schema.stripeEvents.id} = ${event.id} AND ${schema.stripeEvents.processedAt} IS NULL AND (${schema.stripeEvents.lockedAt} IS NULL OR ${schema.stripeEvents.lockedAt} < now() - interval '5 minutes')`,
    )
    .returning({ id: schema.stripeEvents.id });
  if (!claimed.length) {
    const [row] = await db.select().from(schema.stripeEvents).where(eq(schema.stripeEvents.id, event.id));
    return row?.processedAt ? "duplicate" : "in_progress";
  }
  try {
    await dispatchStripeEvent(event, source);
    await db.update(schema.stripeEvents).set({ processedAt: new Date(), error: null, lockedAt: null }).where(eq(schema.stripeEvents.id, event.id));
    return "processed";
  } catch (err) {
    await db
      .update(schema.stripeEvents)
      .set({ error: String((err as Error).message).slice(0, 1000), lockedAt: null })
      .where(eq(schema.stripeEvents.id, event.id));
    await logError("stripe-webhook", err, { eventId: event.id, type: event.type, source });
    throw err;
  }
}
