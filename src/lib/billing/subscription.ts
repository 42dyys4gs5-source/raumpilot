import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db, schema, type DbOrTx } from "@/lib/db";
import { appUrl, env } from "@/lib/env";
import * as T from "@/lib/email/templates";
import { enqueueEmail } from "@/lib/jobs/queue";
import { gateway } from "@/lib/payments/gateway";
import { listPlans } from "./entitlements";

type Org = typeof schema.organizations.$inferSelect;

/** Normalised subscription data (decoupled from the Stripe SDK object shape). */
export type SubscriptionData = {
  id: string;
  customerId: string;
  orgId: string | null;
  status: string;
  priceId: string | null;
  planKeyHint: string | null;
  unitAmount: number | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  canceledAt: Date | null;
};

export type InvoiceData = {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  number: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  billingReason: string | null;
};

export async function ensureStripeCustomer(org: Org): Promise<string> {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const id = await gateway().createCustomer({
    orgId: org.id,
    email: org.contactEmail,
    name: org.legalName || org.name,
    address: { line1: org.street, postal_code: org.postalCode, city: org.city, country: org.country },
  });
  await db.update(schema.organizations).set({ stripeCustomerId: id }).where(eq(schema.organizations.id, org.id));
  return id;
}

export async function startSubscriptionCheckout(org: Org, planKey: string): Promise<string> {
  const plan = (await listPlans()).find((p) => p.key === planKey && p.active);
  if (!plan) throw new Error("Unbekannter Tarif.");
  if (!plan.stripePriceId && env.PAYMENTS_MODE === "stripe") {
    throw new Error("Für diesen Tarif ist noch kein Stripe-Preis hinterlegt (Admin › Tarife).");
  }
  const customerId = await ensureStripeCustomer(org);
  // Trial only for organisations that never had a subscription.
  const had = await db.select({ id: schema.subscriptions.id }).from(schema.subscriptions).where(eq(schema.subscriptions.orgId, org.id)).limit(1);
  const session = await gateway().createSubscriptionCheckout({
    orgId: org.id,
    customerId,
    email: org.contactEmail,
    priceId: plan.stripePriceId ?? `price_fake_${plan.key}`,
    planKey: plan.key,
    trialDays: had.length ? 0 : env.TRIAL_DAYS,
    successUrl: appUrl("/app/abonnement?status=erfolgreich"),
    cancelUrl: appUrl("/app/abonnement?status=abgebrochen"),
  });
  return session.url;
}

export async function openBillingPortal(org: Org): Promise<string> {
  if (!org.stripeCustomerId) throw new Error("Es besteht noch kein Abo.");
  return gateway().createBillingPortal({ customerId: org.stripeCustomerId, returnUrl: appUrl("/app/abonnement") });
}

async function ownerContact(tx: DbOrTx, orgId: string) {
  const [r] = await tx
    .select({ email: schema.users.email, name: schema.users.name })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.orgId, orgId), eq(schema.memberships.role, "owner")))
    .limit(1);
  return r;
}

async function resolveOrg(tx: DbOrTx, orgId: string | null, customerId: string) {
  if (orgId) {
    const [o] = await tx.select().from(schema.organizations).where(eq(schema.organizations.id, orgId));
    if (o) return o;
  }
  const [o] = await tx.select().from(schema.organizations).where(eq(schema.organizations.stripeCustomerId, customerId));
  return o ?? null;
}

/** Applies a subscription state from Stripe. Idempotent; e-mails are deduplicated. */
export async function syncSubscription(s: SubscriptionData) {
  await db.transaction(async (tx) => {
    const org = await resolveOrg(tx, s.orgId, s.customerId);
    if (!org) throw new Error(`Keine Organisation zu Stripe-Kunde ${s.customerId}`);
    const plans = await listPlans(tx);
    const plan = plans.find((p) => p.stripePriceId && p.stripePriceId === s.priceId) ?? plans.find((p) => p.key === s.planKeyHint);
    if (!plan) throw new Error(`Unbekannter Preis ${s.priceId}`);

    const [existing] = await tx.select().from(schema.subscriptions).where(eq(schema.subscriptions.stripeSubscriptionId, s.id));
    const values = {
      orgId: org.id,
      source: "stripe" as const,
      stripeSubscriptionId: s.id,
      planKey: plan.key,
      status: s.status,
      amountMonthly: s.unitAmount ?? plan.priceMonthly,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      canceledAt: s.canceledAt,
      trialEnd: s.trialEnd,
      updatedAt: new Date(),
    };
    if (existing) await tx.update(schema.subscriptions).set(values).where(eq(schema.subscriptions.id, existing.id));
    else await tx.insert(schema.subscriptions).values(values);

    // The organisation reflects the most relevant subscription (a manual/comp plan is not overridden by an ended Stripe one).
    const ended = ["canceled", "incomplete_expired"].includes(s.status);
    const others = await tx
      .select()
      .from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.orgId, org.id), ne(schema.subscriptions.stripeSubscriptionId, s.id)));
    const otherActive = others.find((o) => ["active", "trialing", "past_due"].includes(o.status));
    if (!(ended && otherActive)) {
      await tx
        .update(schema.organizations)
        .set({ planKey: plan.key, subscriptionStatus: s.status, stripeCustomerId: org.stripeCustomerId ?? s.customerId, updatedAt: new Date() })
        .where(eq(schema.organizations.id, org.id));
    }

    // Enforce room limits after a downgrade: newest published rooms beyond the limit go back to draft.
    if (!ended) {
      const published = await tx
        .select({ id: schema.rooms.id })
        .from(schema.rooms)
        .where(and(eq(schema.rooms.orgId, org.id), eq(schema.rooms.status, "published")))
        .orderBy(asc(schema.rooms.publishedAt));
      const excess = published.slice(plan.maxRooms).map((r) => r.id);
      if (excess.length) await tx.update(schema.rooms).set({ status: "draft" }).where(inArray(schema.rooms.id, excess));
    }

    const owner = await ownerContact(tx, org.id);
    if (!owner) return;
    if (["active", "trialing"].includes(s.status) && (!existing || !["active", "trialing"].includes(existing.status))) {
      await enqueueEmail(tx, { to: owner.email, ...T.subscriptionStartedMail(owner.name, plan.name, s.status === "trialing" ? s.trialEnd : null), template: "subscription.started", orgId: org.id }, `mail:sub-started:${s.id}`);
    }
    if (s.cancelAtPeriodEnd && !existing?.cancelAtPeriodEnd) {
      await enqueueEmail(tx, { to: owner.email, ...T.subscriptionCancelScheduledMail(owner.name, s.currentPeriodEnd), template: "subscription.cancel_scheduled", orgId: org.id }, `mail:sub-cancel:${s.id}:${s.currentPeriodEnd?.getTime() ?? 0}`);
    }
    if (ended && existing && !["canceled", "incomplete_expired"].includes(existing.status)) {
      await enqueueEmail(tx, { to: owner.email, ...T.subscriptionEndedMail(owner.name), template: "subscription.ended", orgId: org.id }, `mail:sub-ended:${s.id}`);
    }
  });
}

export async function recordInvoice(i: InvoiceData, event: "paid" | "failed" | "updated") {
  await db.transaction(async (tx) => {
    const org = await resolveOrg(tx, null, i.customerId);
    if (!org) return;
    await tx
      .insert(schema.invoices)
      .values({
        orgId: org.id,
        stripeInvoiceId: i.id,
        number: i.number,
        status: i.status,
        amountDue: i.amountDue,
        amountPaid: i.amountPaid,
        currency: i.currency.toUpperCase(),
        hostedInvoiceUrl: i.hostedInvoiceUrl,
        invoicePdf: i.invoicePdf,
        periodStart: i.periodStart,
        periodEnd: i.periodEnd,
      })
      .onConflictDoUpdate({
        target: schema.invoices.stripeInvoiceId,
        set: { status: i.status, amountPaid: i.amountPaid, amountDue: i.amountDue, number: i.number, hostedInvoiceUrl: i.hostedInvoiceUrl, invoicePdf: i.invoicePdf, updatedAt: new Date() },
      });
    const owner = await ownerContact(tx, org.id);
    if (!owner) return;
    if (event === "paid" && i.amountPaid > 0 && i.billingReason === "subscription_cycle") {
      await enqueueEmail(tx, { to: owner.email, ...T.subscriptionRenewedMail(owner.name, i.amountPaid, i.hostedInvoiceUrl), template: "subscription.renewed", orgId: org.id }, `mail:invoice-paid:${i.id}`);
    }
    if (event === "failed") {
      await enqueueEmail(tx, { to: owner.email, ...T.subscriptionPaymentFailedMail(owner.name, i.hostedInvoiceUrl), template: "subscription.payment_failed", orgId: org.id }, `mail:invoice-failed:${i.id}:${i.amountDue}:${Date.now() - (Date.now() % 86400_000)}`);
      if (env.ADMIN_ALERT_EMAIL) {
        await enqueueEmail(tx, { to: env.ADMIN_ALERT_EMAIL, ...T.adminAlertMail("Fehlgeschlagene Abo-Zahlung", [["Vermieter", org.name], ["Rechnung", i.number ?? i.id]]), template: "admin.alert" }, `mail:admin-invoice-failed:${i.id}`);
      }
    }
  });
}

/** Complimentary / manual plan granted by an administrator (e.g. pilot customers). */
export async function grantManualPlan(orgId: string, planKey: string, note: string, until: Date | null) {
  await db.transaction(async (tx) => {
    await tx.insert(schema.subscriptions).values({ orgId, source: "manual", planKey, status: "active", amountMonthly: 0, currentPeriodEnd: until, note });
    await tx.update(schema.organizations).set({ planKey, subscriptionStatus: "active", updatedAt: new Date() }).where(eq(schema.organizations.id, orgId));
  });
}

export async function expireManualPlans(now = new Date()) {
  const rows = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.source, "manual"), eq(schema.subscriptions.status, "active")));
  for (const s of rows) {
    if (s.currentPeriodEnd && s.currentPeriodEnd < now) {
      await db.transaction(async (tx) => {
        await tx.update(schema.subscriptions).set({ status: "canceled", canceledAt: now, updatedAt: now }).where(eq(schema.subscriptions.id, s.id));
        const others = await tx.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.orgId, s.orgId), ne(schema.subscriptions.id, s.id)));
        if (!others.some((o) => ["active", "trialing", "past_due"].includes(o.status))) {
          await tx.update(schema.organizations).set({ subscriptionStatus: "canceled" }).where(eq(schema.organizations.id, s.orgId));
        }
      });
    }
  }
}
