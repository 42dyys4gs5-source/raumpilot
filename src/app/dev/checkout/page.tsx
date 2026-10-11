import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type Stripe from "stripe";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { processStripeEvent } from "@/lib/payments/webhooks";
import { randomToken } from "@/lib/security/crypto";
import { listPlans } from "@/lib/billing/entitlements";
import { formatMoney } from "@/lib/utils/money";

/**
 * TEST-ONLY simulation of Stripe's hosted pages (PAYMENTS_MODE=fake).
 * Feeds synthetic events through the real webhook processing code.
 * Unavailable unless PAYMENTS_MODE=fake (which env.ts refuses in production).
 */
export const metadata: Metadata = { title: "Testzahlung", robots: { index: false } };
export const dynamic = "force-dynamic";

function guard() {
  if (env.PAYMENTS_MODE !== "fake") notFound();
}

const evt = (type: string, object: unknown, account?: string) =>
  ({ id: `evt_fake_${randomToken(10)}`, type, account, data: { object }, object: "event", created: Math.floor(Date.now() / 1000) }) as unknown as Stripe.Event;

async function fakeSubscription(orgId: string, planKey: string, status: string, extra: Record<string, unknown> = {}) {
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId));
  const plan = (await listPlans()).find((p) => p.key === planKey)!;
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
  return {
    id: `sub_fake_${orgId.replace(/-/g, "").slice(0, 12)}`,
    object: "subscription",
    customer: org.stripeCustomerId ?? `cus_fake_${orgId.slice(0, 8)}`,
    status,
    metadata: { org_id: orgId, plan_key: planKey },
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    trial_end: status === "trialing" ? periodEnd : null,
    items: { data: [{ current_period_end: periodEnd, price: { id: plan.stripePriceId ?? `price_fake_${planKey}`, unit_amount: plan.priceMonthly } }] },
    ...extra,
  };
}

async function act(fd: FormData) {
  "use server";
  guard();
  const op = String(fd.get("op"));
  const rawBack = String(fd.get("back") ?? "/");
  const back = rawBack.startsWith(env.APP_URL) || (rawBack.startsWith("/") && !rawBack.startsWith("//")) ? rawBack : "/";
  const booking = String(fd.get("booking") ?? "");
  const account = String(fd.get("account") ?? "");
  const org = String(fd.get("org") ?? "");
  const plan = String(fd.get("plan") ?? "starter");
  const amount = Number(fd.get("amount") ?? 0);
  const session = String(fd.get("session") ?? "");

  if (op === "pay") {
    await processStripeEvent(evt("checkout.session.completed", { id: session, object: "checkout.session", mode: "payment", payment_status: "paid", client_reference_id: booking, amount_total: amount, payment_intent: `pi_fake_${randomToken(8)}`, payment_method_types: ["card"], metadata: { booking_id: booking } }, account), "connect");
  } else if (op === "fail") {
    await processStripeEvent(evt("checkout.session.async_payment_failed", { id: session, object: "checkout.session", mode: "payment", client_reference_id: booking }, account), "connect");
  } else if (op === "expire") {
    await processStripeEvent(evt("checkout.session.expired", { id: session, object: "checkout.session", mode: "payment", client_reference_id: booking }, account), "connect");
  } else if (op === "subscribe") {
    const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, org));
    await processStripeEvent(evt("checkout.session.completed", { id: session, object: "checkout.session", mode: "subscription", client_reference_id: org, customer: o.stripeCustomerId ?? `cus_fake_${org.slice(0, 8)}`, metadata: { org_id: org } }), "platform");
    const had = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.orgId, org));
    await processStripeEvent(evt("customer.subscription.created", await fakeSubscription(org, plan, had.length || env.TRIAL_DAYS === 0 ? "active" : "trialing")), "platform");
  } else if (op === "portal-cancel" || op === "portal-resume" || op === "portal-change" || op === "portal-fail" || op === "portal-renew" || op === "portal-end") {
    const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.stripeCustomerId, String(fd.get("customer"))));
    if (!o) notFound();
    const [s] = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.orgId, o.id), eq(schema.subscriptions.source, "stripe")));
    const current = s?.planKey ?? o.planKey ?? "starter";
    if (op === "portal-cancel") await processStripeEvent(evt("customer.subscription.updated", await fakeSubscription(o.id, current, "active", { cancel_at_period_end: true })), "platform");
    if (op === "portal-resume") await processStripeEvent(evt("customer.subscription.updated", await fakeSubscription(o.id, current, "active")), "platform");
    if (op === "portal-change") await processStripeEvent(evt("customer.subscription.updated", await fakeSubscription(o.id, plan, "active")), "platform");
    if (op === "portal-end") await processStripeEvent(evt("customer.subscription.deleted", await fakeSubscription(o.id, current, "canceled", { canceled_at: Math.floor(Date.now() / 1000) })), "platform");
    if (op === "portal-fail" || op === "portal-renew") {
      const failed = op === "portal-fail";
      const p = (await listPlans()).find((x) => x.key === current)!;
      const inv = { id: `in_fake_${randomToken(8)}`, object: "invoice", customer: o.stripeCustomerId, number: `TEST-${Date.now()}`, status: failed ? "open" : "paid", amount_due: p.priceMonthly, amount_paid: failed ? 0 : p.priceMonthly, currency: "chf", hosted_invoice_url: null, invoice_pdf: null, period_start: Math.floor(Date.now() / 1000), period_end: Math.floor(Date.now() / 1000) + 30 * 86400, billing_reason: "subscription_cycle", parent: { subscription_details: { subscription: s?.stripeSubscriptionId } } };
      await processStripeEvent(evt(failed ? "invoice.payment_failed" : "invoice.paid", inv), "platform");
      await processStripeEvent(evt("customer.subscription.updated", await fakeSubscription(o.id, current, failed ? "past_due" : "active")), "platform");
    }
  } else if (op === "connect") {
    await processStripeEvent(evt("account.updated", { id: account, object: "account", charges_enabled: true, payouts_enabled: true, details_submitted: true }), "connect");
  }
  redirect(back);
}

export default async function FakeCheckout({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  guard();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
        <strong>Testmodus.</strong> Diese Seite simuliert den Zahlungsanbieter (Stripe) für automatisierte Tests. Es fliesst kein Geld.
      </div>
      {sp.kind === "booking" && (
        <div className="mt-6 space-y-4">
          <h1 className="text-2xl font-semibold">Testzahlung {formatMoney(Number(sp.amount))}</h1>
          <FormBack back={sp.success} op="pay" label="Zahlung erfolgreich" primary hiddenFields={{ booking: sp.booking, account: sp.account, amount: sp.amount, session: sp.session }} />
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <FormBack back={sp.cancel} op="fail" label="Zahlung fehlgeschlagen" hiddenFields={{ booking: sp.booking, account: sp.account, session: sp.session }} />
            <FormBack back={sp.cancel} op="expire" label="Abbrechen (Sitzung abgelaufen)" hiddenFields={{ booking: sp.booking, account: sp.account, session: sp.session }} />
            <a href={sp.cancel} className="inline-flex h-11 items-center rounded-lg px-4 text-sm ring-1 ring-ink-200">Zurück (Abbruch)</a>
          </div>
        </div>
      )}
      {sp.kind === "subscription" && (
        <div className="mt-6 space-y-4">
          <h1 className="text-2xl font-semibold">Test-Abo: {sp.plan}</h1>
          <FormBack back={sp.success} op="subscribe" label="Abo abschliessen" primary hiddenFields={{ org: sp.org, plan: sp.plan, session: sp.session }} />
          <a href={sp.cancel} className="text-sm underline">Abbrechen</a>
        </div>
      )}
      {sp.kind === "portal" && (
        <div className="mt-6 space-y-3">
          <h1 className="text-2xl font-semibold">Test-Kundenportal</h1>
          {(["portal-cancel", "portal-resume", "portal-renew", "portal-fail", "portal-end"] as const).map((op) => (
            <FormBack key={op} back={sp.return} op={op} label={{ "portal-cancel": "Zum Laufzeitende kündigen", "portal-resume": "Kündigung zurücknehmen", "portal-renew": "Verlängerung simulieren (Zahlung OK)", "portal-fail": "Fehlgeschlagene Zahlung simulieren", "portal-end": "Abo sofort beenden" }[op]} hiddenFields={{ customer: sp.customer }} />
          ))}
          {["starter", "professional", "business"].map((p) => (
            <FormBack key={p} back={sp.return} op="portal-change" label={`Wechsel zu ${p}`} hiddenFields={{ customer: sp.customer, plan: p }} />
          ))}
          <a href={sp.return} className="block text-sm underline">Zurück</a>
        </div>
      )}
      {sp.kind === "connect" && (
        <div className="mt-6 space-y-3">
          <h1 className="text-2xl font-semibold">Test-Kontoverifizierung</h1>
          <FormBack back={sp.return} op="connect" label="Konto verifizieren" hiddenFields={{ account: sp.account }} />
        </div>
      )}
    </div>
  );
}

function FormBack({ back, op, label, hiddenFields, primary }: { back: string; op: string; label: string; hiddenFields: Record<string, string | undefined>; primary?: boolean }) {
  return (
    <form action={act}>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="back" value={back} />
      {Object.entries(hiddenFields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ?? ""} />)}
      <button type="submit" className={primary ? "h-11 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white" : "h-11 rounded-lg px-4 text-sm font-medium ring-1 ring-ink-300 hover:bg-ink-50"}>{label}</button>
    </form>
  );
}
