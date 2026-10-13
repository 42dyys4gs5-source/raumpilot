/**
 * Richtet Stripe für Raumvia vollautomatisch ein (mehrfach ausführbar):
 *  - Produkte + monatliche und jährliche CHF-Preise (12 Monate zum Preis von 10) für Starter / Professional / Business
 *  - Kundenportal (Kündigung zum Laufzeitende, Tarifwechsel, Zahlungsmittel, Rechnungen)
 *  - Webhook-Endpunkte für Plattform und Connect (gibt die Signing Secrets aus)
 *  - trägt die Preis-IDs in die Datenbank ein (falls DATABASE_URL gesetzt)
 *
 * Aufruf:
 *   STRIPE_SECRET_KEY=sk_test_… APP_URL=https://raumvia.ch DATABASE_URL=postgres://… npx tsx scripts/stripe-setup.ts
 */
import postgres from "postgres";
import Stripe from "stripe";
import { DEFAULT_PLANS } from "../src/config/plans";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
if (!key || !/^(sk|rk)_(test|live)_/.test(key)) throw new Error("STRIPE_SECRET_KEY fehlt oder ist ungültig.");
if (!appUrl.startsWith("https://")) throw new Error("APP_URL muss mit https:// beginnen (z. B. https://raumvia.ch).");
const live = key.includes("_live_");
const stripe = new Stripe(key);

console.log(`\nStripe-Einrichtung (${live ? "LIVE" : "Testmodus"}) für ${appUrl}\n`);

// 1) Produkte und Preise (monatlich und jährlich: 12 Monate zum Preis von 10)
const YEARLY_MONTHS_CHARGED = 10;
const priceIds: Record<string, string> = {};
const yearlyPriceIds: Record<string, string> = {};
for (const plan of DEFAULT_PLANS) {
  const products = await stripe.products.search({ query: `metadata['raumvia_plan']:'${plan.key}'` });
  let product = products.data[0];
  for (const [interval, amount, target] of [
    ["month", plan.priceMonthly, priceIds],
    ["year", plan.priceMonthly * YEARLY_MONTHS_CHARGED, yearlyPriceIds],
  ] as const) {
    const lookup = `raumvia_${plan.key}_${interval === "month" ? "monthly" : "yearly"}_${amount}`;
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
    if (existing.data[0]) {
      target[plan.key] = existing.data[0].id;
      console.log(`✓ Preis vorhanden: ${plan.name} (${interval === "month" ? "monatlich" : "jährlich"}) → ${existing.data[0].id}`);
      continue;
    }
    product ??= await stripe.products.create({ name: `Raumvia ${plan.name}`, description: plan.description, metadata: { raumvia_plan: plan.key } });
    const price = await stripe.prices.create({
      product: product.id,
      currency: "chf",
      unit_amount: amount,
      recurring: { interval },
      lookup_key: lookup,
      metadata: { raumvia_plan: plan.key, interval },
    });
    target[plan.key] = price.id;
    console.log(`✓ Preis angelegt: ${plan.name} CHF ${(amount / 100).toFixed(2)}/${interval === "month" ? "Monat" : "Jahr"} → ${price.id}`);
  }
}

// 2) Kundenportal (Standardkonfiguration aktualisieren oder anlegen)
const prices = await Promise.all([...Object.values(priceIds), ...Object.values(yearlyPriceIds)].map((id) => stripe.prices.retrieve(id)));
const byProduct = new Map<string, string[]>();
for (const p of prices) {
  const pid = typeof p.product === "string" ? p.product : p.product.id;
  byProduct.set(pid, [...(byProduct.get(pid) ?? []), p.id]);
}
const portalFeatures = {
  customer_update: { enabled: true, allowed_updates: ["email", "address", "name", "tax_id"] as ("email" | "address" | "name" | "tax_id")[] },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_cancel: { enabled: true, mode: "at_period_end" as const, cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] as ("too_expensive" | "missing_features" | "switched_service" | "unused" | "other")[] } },
  subscription_update: {
    enabled: true,
    default_allowed_updates: ["price"] as "price"[],
    proration_behavior: "create_prorations" as const,
    products: [...byProduct].map(([product, ids]) => ({ product, prices: ids })),
  },
};
const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
if (configs.data[0]) {
  await stripe.billingPortal.configurations.update(configs.data[0].id, {
    features: portalFeatures,
    business_profile: { headline: "Raumvia – Abo verwalten" },
    default_return_url: `${appUrl}/app/abonnement`,
  });
  console.log("✓ Kundenportal aktualisiert");
} else {
  await stripe.billingPortal.configurations.create({ features: portalFeatures, business_profile: { headline: "Raumvia – Abo verwalten" }, default_return_url: `${appUrl}/app/abonnement` });
  console.log("✓ Kundenportal angelegt");
}

// 3) Webhooks
type Ev = Stripe.WebhookEndpointCreateParams.EnabledEvent;
const PLATFORM_EVENTS: Ev[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.finalized",
  "invoice.updated",
  "invoice.voided",
  "account.updated",
];
const CONNECT_EVENTS: Ev[] = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
  "account.updated",
];
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const secrets: Record<string, string> = {};
for (const [name, path, events, connect] of [
  ["STRIPE_WEBHOOK_SECRET", "/api/webhooks/stripe", PLATFORM_EVENTS, false],
  ["STRIPE_CONNECT_WEBHOOK_SECRET", "/api/webhooks/stripe-connect", CONNECT_EVENTS, true],
] as const) {
  const url = `${appUrl}${path}`;
  const found = endpoints.data.find((e) => e.url === url);
  if (found) {
    await stripe.webhookEndpoints.update(found.id, { enabled_events: [...events] });
    console.log(`✓ Webhook vorhanden (Ereignisse aktualisiert): ${url}\n  Signing Secret im Stripe-Dashboard unter Entwickler › Webhooks einsehen.`);
    continue;
  }
  const ep = await stripe.webhookEndpoints.create({ url, enabled_events: [...events], connect, description: `Raumvia ${connect ? "Connect" : "Plattform"}` });
  secrets[name] = ep.secret ?? "";
  console.log(`✓ Webhook angelegt: ${url}`);
}

// 4) Preis-IDs in die Datenbank schreiben
if (process.env.DATABASE_URL) {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
  for (const [k, id] of Object.entries(priceIds)) await sql`UPDATE plans SET stripe_price_id = ${id}, stripe_price_id_yearly = ${yearlyPriceIds[k] ?? null}, updated_at = now() WHERE key = ${k}`;
  await sql.end();
  console.log("✓ Preis-IDs in der Datenbank hinterlegt");
}

console.log("\n──────── In Vercel eintragen ────────");
console.log(`PAYMENTS_MODE=stripe`);
console.log(`STRIPE_SECRET_KEY=${key.slice(0, 12)}…  (Ihr Schlüssel)`);
for (const [k, v] of Object.entries(secrets)) console.log(`${k}=${v}`);
console.log("Preis-IDs monatlich:", priceIds);
console.log("Preis-IDs jährlich:", yearlyPriceIds);
console.log("\nNoch manuell im Stripe-Dashboard: Connect aktivieren/Plattformprofil ausfüllen, Smart Retries und Kunden-E-Mails (Belege, Rechnungen) einschalten.\n");
