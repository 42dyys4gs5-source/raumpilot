import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as platformWebhook } from "@/app/api/webhooks/stripe/route";
import { ensureReferralCode, findReferrer, referralStats } from "@/lib/billing/referrals";
import { yearlyAvailable } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { runDueJobs } from "@/lib/jobs/worker";
import { fakeCredits } from "@/lib/payments/fake-gateway";
import { createOrg, emailsTo, resetDb } from "../helpers";

const stripe = new Stripe("sk_test_dummy");
const URL = "http://localhost/api/webhooks/stripe";
const SECRET = "whsec_test_platform_secret";

let n = 0;
const evt = (type: string, object: unknown) => ({ id: `evt_ry_${++n}_${Date.now()}`, object: "event", type, data: { object }, created: Math.floor(Date.now() / 1000), api_version: "2026-09-30" });
function send(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return platformWebhook(new Request(URL, { method: "POST", body: payload, headers: { "stripe-signature": header, "content-type": "application/json" } }));
}
const invoice = (customer: string, id: string, amountPaid: number, billingReason = "subscription_cycle") => ({
  id,
  object: "invoice",
  customer,
  number: id.toUpperCase(),
  status: "paid",
  amount_due: amountPaid,
  amount_paid: amountPaid,
  currency: "chf",
  hosted_invoice_url: null,
  invoice_pdf: null,
  period_start: 1,
  period_end: 2,
  billing_reason: billingReason,
  parent: { subscription_details: { subscription: `sub_${customer}` } },
});

beforeEach(async () => {
  await resetDb();
  fakeCredits.length = 0;
  await db.update(schema.plans).set({ stripePriceId: "price_pro_m", stripePriceIdYearly: "price_pro_y" }).where(eq(schema.plans.key, "professional"));
  await db.update(schema.plans).set({ stripePriceId: "price_start_m", stripePriceIdYearly: "price_start_y" }).where(eq(schema.plans.key, "starter"));
});

describe("Jahresabo", () => {
  it("erkennt den Jahrespreis und speichert MRR pro Monat", async () => {
    const { org } = await createOrg({ plan: null });
    const res = await send(
      evt("customer.subscription.created", {
        id: "sub_year",
        object: "subscription",
        customer: "cus_year",
        status: "active",
        metadata: { org_id: org.id },
        cancel_at_period_end: false,
        cancel_at: null,
        canceled_at: null,
        trial_end: null,
        items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 365 * 86400, price: { id: "price_pro_y", unit_amount: 69000, recurring: { interval: "year" } } }] },
      }),
    );
    expect(res.status).toBe(200);
    const [s] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.orgId, org.id));
    expect(s.planKey).toBe("professional");
    expect(s.billingInterval).toBe("year");
    expect(s.amountMonthly).toBe(5750); // CHF 690.– / 12
    const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org.id));
    expect(o.planKey).toBe("professional");
    expect(o.subscriptionStatus).toBe("active");
  });

  it("bietet das Jahresabo im Stripe-Modus nur an, wenn alle aktiven Tarife einen Jahrespreis haben", async () => {
    const plans = await db.select().from(schema.plans);
    expect(yearlyAvailable(plans, "stripe")).toBe(false); // business has none
    expect(yearlyAvailable(plans, "fake")).toBe(true);
    await db.update(schema.plans).set({ stripePriceIdYearly: "price_bus_y" }).where(eq(schema.plans.key, "business"));
    expect(yearlyAvailable(await db.select().from(schema.plans), "stripe")).toBe(true);
  });
});

describe("Empfehlungsprogramm", () => {
  it("erstellt einen stabilen Code und findet die empfehlende Organisation", async () => {
    const { org } = await createOrg({ name: "Saal Alpha" });
    const code = await ensureReferralCode(org.id);
    expect(code).toMatch(/^[a-z0-9]{8}$/);
    expect(await ensureReferralCode(org.id)).toBe(code);
    expect((await findReferrer(code))?.id).toBe(org.id);
    expect(await findReferrer("ungültig!")).toBeNull();
    await db.update(schema.organizations).set({ suspendedAt: new Date() }).where(eq(schema.organizations.id, org.id));
    expect(await findReferrer(code)).toBeNull();
  });

  it("schreibt beiden einen Monat gut – erst nach der ersten bezahlten Rechnung und nur einmal", async () => {
    const { org: referrer, user: referrerUser } = await createOrg({ name: "Saal Alpha", plan: "professional" });
    await db.update(schema.organizations).set({ stripeCustomerId: "cus_ref" }).where(eq(schema.organizations.id, referrer.id));
    const { org: referred, user: referredUser } = await createOrg({ name: "Proberaum Beta", plan: "starter" });
    await db.update(schema.organizations).set({ stripeCustomerId: "cus_new", referredByOrgId: referrer.id }).where(eq(schema.organizations.id, referred.id));

    // Trial invoice (CHF 0) → no reward yet
    await send(evt("invoice.paid", invoice("cus_new", "in_trial", 0, "subscription_create")));
    await runDueJobs();
    expect(fakeCredits).toHaveLength(0);

    // First paid invoice → reward for both
    await send(evt("invoice.paid", invoice("cus_new", "in_first", 3900)));
    await runDueJobs();
    expect(fakeCredits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ customerId: "cus_new", amount: 3900 }),
        expect.objectContaining({ customerId: "cus_ref", amount: 6900 }),
      ]),
    );
    expect(fakeCredits).toHaveLength(2);
    const [r] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, referred.id));
    expect(r.referralRewardedAt).not.toBeNull();
    expect((await emailsTo(referrerUser.email)).filter((m) => m.template === "referral.reward")).toHaveLength(1);
    expect((await emailsTo(referredUser.email)).filter((m) => m.template === "referral.reward")).toHaveLength(1);

    // Later invoices → no further reward
    await send(evt("invoice.paid", invoice("cus_new", "in_second", 3900)));
    await runDueJobs();
    expect(fakeCredits).toHaveLength(2);
    expect(await referralStats(referrer.id)).toEqual({ signedUp: 1, rewarded: 1 });
  });

  it("ohne Empfehlung gibt es keine Gutschrift", async () => {
    const { org } = await createOrg({ plan: "starter" });
    await db.update(schema.organizations).set({ stripeCustomerId: "cus_solo" }).where(eq(schema.organizations.id, org.id));
    await send(evt("invoice.paid", invoice("cus_solo", "in_solo", 3900)));
    await runDueJobs();
    expect(fakeCredits).toHaveLength(0);
  });
});
