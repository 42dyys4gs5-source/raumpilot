import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as platformWebhook } from "@/app/api/webhooks/stripe/route";
import { POST as connectWebhook } from "@/app/api/webhooks/stripe-connect/route";
import { hasAccess } from "@/lib/billing/entitlements";
import { createBooking } from "@/lib/booking/engine";
import { db, schema } from "@/lib/db";
import { runDueJobs } from "@/lib/jobs/worker";
import { createOrg, createRoom, customer, emailsTo, future, resetDb } from "../helpers";

const stripe = new Stripe("sk_test_dummy");

function signed(event: Record<string, unknown>, secret: string, url: string) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request(url, { method: "POST", body: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
}

const sub = (orgId: string, o: Record<string, unknown> = {}) => ({
  id: "sub_123",
  object: "subscription",
  customer: "cus_123",
  status: "active",
  metadata: { org_id: orgId, plan_key: "professional" },
  cancel_at_period_end: false,
  cancel_at: null,
  canceled_at: null,
  trial_end: null,
  items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: "price_pro", unit_amount: 6900 } }] },
  ...o,
});
let n = 0;
const evt = (type: string, object: unknown, account?: string) => ({ id: `evt_${++n}_${Date.now()}`, object: "event", type, account, data: { object }, created: Math.floor(Date.now() / 1000), api_version: "2026-09-30" });

beforeEach(async () => {
  await resetDb();
  await db.update(schema.plans).set({ stripePriceId: "price_pro" }).where(eq(schema.plans.key, "professional"));
  await db.update(schema.plans).set({ stripePriceId: "price_starter" }).where(eq(schema.plans.key, "starter"));
});

describe("Stripe webhook endpoint", () => {
  it("rejects requests with an invalid signature", async () => {
    const { org } = await createOrg({ plan: null });
    const req = signed(evt("customer.subscription.created", sub(org.id)), "whsec_wrong", "http://localhost/api/webhooks/stripe");
    const res = await platformWebhook(req);
    expect(res.status).toBe(400);
    const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org.id));
    expect(o.subscriptionStatus).toBe("none");
  });

  it("activates the plan from a signed subscription event and processes duplicates only once", async () => {
    const { org, user } = await createOrg({ plan: null });
    const e = evt("customer.subscription.created", sub(org.id));
    const r1 = await platformWebhook(signed(e, "whsec_test_platform_secret", "http://localhost/api/webhooks/stripe"));
    expect(r1.status).toBe(200);
    const r2 = await platformWebhook(signed(e, "whsec_test_platform_secret", "http://localhost/api/webhooks/stripe"));
    expect((await r2.json()).status).toBe("duplicate");
    const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org.id));
    expect(o.planKey).toBe("professional");
    expect(o.subscriptionStatus).toBe("active");
    expect(hasAccess(o)).toBe(true);
    await runDueJobs();
    expect((await emailsTo(user.email)).filter((m) => m.template === "subscription.started")).toHaveLength(1);
  });

  it("handles cancellation at period end, failed payments and the end of the subscription", async () => {
    const { org, user } = await createOrg({ plan: null });
    const url = "http://localhost/api/webhooks/stripe";
    const sec = "whsec_test_platform_secret";
    await platformWebhook(signed(evt("customer.subscription.created", sub(org.id)), sec, url));
    await platformWebhook(signed(evt("customer.subscription.updated", sub(org.id, { cancel_at_period_end: true })), sec, url));
    await platformWebhook(signed(evt("customer.subscription.updated", sub(org.id, { cancel_at_period_end: true })), sec, url));
    const inv = { id: "in_1", object: "invoice", customer: "cus_123", number: "A-1", status: "open", amount_due: 6900, amount_paid: 0, currency: "chf", hosted_invoice_url: "https://invoice.stripe.com/x", invoice_pdf: null, period_start: 1, period_end: 2, billing_reason: "subscription_cycle", parent: { subscription_details: { subscription: "sub_123" } } };
    await platformWebhook(signed(evt("invoice.payment_failed", inv), sec, url));
    await platformWebhook(signed(evt("customer.subscription.updated", sub(org.id, { status: "past_due", cancel_at_period_end: true })), sec, url));
    let [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org.id));
    expect(o.subscriptionStatus).toBe("past_due");
    expect(hasAccess(o)).toBe(true); // grace period
    await platformWebhook(signed(evt("customer.subscription.deleted", sub(org.id, { status: "canceled", canceled_at: Math.floor(Date.now() / 1000) })), sec, url));
    [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org.id));
    expect(o.subscriptionStatus).toBe("canceled");
    expect(hasAccess(o)).toBe(false);
    await runDueJobs();
    const mails = (await emailsTo(user.email)).map((m) => m.template);
    expect(mails.filter((t) => t === "subscription.cancel_scheduled")).toHaveLength(1);
    expect(mails).toContain("subscription.payment_failed");
    expect(mails).toContain("subscription.ended");
    const [invoice] = await db.select().from(schema.invoices);
    expect(invoice.status).toBe("open");
  });

  it("enforces room limits after a downgrade", async () => {
    const { org } = await createOrg({ plan: null });
    const url = "http://localhost/api/webhooks/stripe";
    const sec = "whsec_test_platform_secret";
    await platformWebhook(signed(evt("customer.subscription.created", sub(org.id)), sec, url));
    for (let i = 0; i < 3; i++) await createRoom(org.id, { publishedAt: new Date(Date.now() + i * 1000) });
    await platformWebhook(signed(evt("customer.subscription.updated", sub(org.id, { items: { data: [{ current_period_end: 2e9, price: { id: "price_starter", unit_amount: 3900 } }] } })), sec, url));
    const rooms = await db.select().from(schema.rooms).where(eq(schema.rooms.orgId, org.id));
    expect(rooms.filter((r) => r.status === "published")).toHaveLength(1);
    const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org.id));
    expect(o.planKey).toBe("starter");
  });

  it("confirms a booking from a signed Connect event and ignores events from foreign accounts", async () => {
    const { org } = await createOrg({ stripe: true });
    const room = await createRoom(org.id, { paymentMode: "online" });
    const start = future(4);
    const { booking } = await createBooking({ roomId: room.id, start, end: new Date(start.getTime() + 2 * 3600_000), guests: 2, extras: [], customer, source: "online" });
    const session = { id: "cs_1", object: "checkout.session", mode: "payment", payment_status: "paid", client_reference_id: booking.id, amount_total: booking.totalAmount, payment_intent: "pi_1", payment_method_types: ["card", "twint"], metadata: {} };
    const url = "http://localhost/api/webhooks/stripe-connect";
    const foreign = await connectWebhook(signed(evt("checkout.session.completed", session, "acct_other"), "whsec_test_connect_secret", url));
    expect(foreign.status).toBe(200); // acknowledged but ignored (logged as security event)
    let [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.status).toBe("pending_payment");
    const ok = await connectWebhook(signed(evt("checkout.session.completed", session, org.stripeAccountId!), "whsec_test_connect_secret", url));
    expect(ok.status).toBe(200);
    [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.status).toBe("confirmed");
    expect(b.paymentStatus).toBe("paid");
  });

  it("syncs Connect account verification status", async () => {
    const { org } = await createOrg();
    await db.update(schema.organizations).set({ stripeAccountId: "acct_new" }).where(eq(schema.organizations.id, org.id));
    await connectWebhook(signed(evt("account.updated", { id: "acct_new", object: "account", charges_enabled: true, payouts_enabled: true, details_submitted: true }, "acct_new"), "whsec_test_connect_secret", "http://localhost/api/webhooks/stripe-connect"));
    const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org.id));
    expect(o.stripeChargesEnabled).toBe(true);
  });
});
