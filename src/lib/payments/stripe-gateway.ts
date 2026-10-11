import type { PaymentGateway } from "./gateway";
import { stripe } from "./stripe";

export const stripeGateway: PaymentGateway = {
  async createBookingCheckout(p) {
    // Direct charge on the landlord's connected account: the landlord is merchant of record,
    // receives the money and bears Stripe fees. Payment methods (card, TWINT, …) follow the
    // landlord's Stripe payment method settings (dynamic payment methods).
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: p.bookingId,
        customer_email: p.customerEmail,
        locale: "de",
        expires_at: Math.floor(p.expiresAt.getTime() / 1000),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: p.currency.toLowerCase(),
              unit_amount: p.amount,
              product_data: { name: p.description.slice(0, 250), description: `Buchung ${p.reference}` },
            },
          },
        ],
        payment_intent_data: {
          description: `Buchung ${p.reference}`,
          metadata: { booking_id: p.bookingId, reference: p.reference },
          ...(p.applicationFee > 0 ? { application_fee_amount: p.applicationFee } : {}),
        },
        metadata: { booking_id: p.bookingId, reference: p.reference },
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
      },
      { stripeAccount: p.accountId, idempotencyKey: `checkout:${p.bookingId}:${p.expiresAt.getTime()}` },
    );
    if (!session.url) throw new Error("Stripe hat keine Checkout-URL geliefert.");
    return { id: session.id, url: session.url };
  },

  async expireBookingCheckout(accountId, sessionId) {
    try {
      await stripe().checkout.sessions.expire(sessionId, {}, { stripeAccount: accountId });
    } catch {
      // Already completed or expired – nothing to do.
    }
  },

  async refund(p) {
    const r = await stripe().refunds.create(
      { payment_intent: p.paymentIntentId, amount: p.amount, reason: "requested_by_customer" },
      { stripeAccount: p.accountId, idempotencyKey: p.idempotencyKey },
    );
    return { id: r.id };
  },

  async createCustomer(p) {
    const c = await stripe().customers.create(
      {
        email: p.email,
        name: p.name,
        address: p.address
          ? { line1: p.address.line1 ?? undefined, postal_code: p.address.postal_code ?? undefined, city: p.address.city ?? undefined, country: p.address.country ?? "CH" }
          : undefined,
        preferred_locales: ["de-CH", "de"],
        metadata: { org_id: p.orgId },
      },
      { idempotencyKey: `customer:${p.orgId}` },
    );
    return c.id;
  },

  async createSubscriptionCheckout(p) {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: p.customerId ?? undefined,
      customer_email: p.customerId ? undefined : p.email,
      client_reference_id: p.orgId,
      locale: "de",
      line_items: [{ price: p.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: p.customerId ? { address: "auto", name: "auto" } : undefined,
      subscription_data: {
        metadata: { org_id: p.orgId, plan_key: p.planKey },
        ...(p.trialDays > 0 ? { trial_period_days: p.trialDays } : {}),
      },
      metadata: { org_id: p.orgId, plan_key: p.planKey },
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
    });
    if (!session.url) throw new Error("Stripe hat keine Checkout-URL geliefert.");
    return { id: session.id, url: session.url };
  },

  async createBillingPortal(p) {
    const s = await stripe().billingPortal.sessions.create({ customer: p.customerId, return_url: p.returnUrl, locale: "de" });
    return s.url;
  },

  async createConnectAccount(p) {
    // Standard-like configuration: the landlord has full Stripe dashboard access, pays Stripe fees
    // and Stripe handles requirement collection (KYC). Raumvia is not merchant of record.
    const a = await stripe().accounts.create(
      {
        country: p.country || "CH",
        email: p.email,
        business_profile: { name: p.businessName },
        controller: {
          stripe_dashboard: { type: "full" },
          fees: { payer: "account" },
          losses: { payments: "stripe" },
          requirement_collection: "stripe",
        },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true }, twint_payments: { requested: true } },
        metadata: { org_id: p.orgId },
      },
      { idempotencyKey: `connect-account:${p.orgId}` },
    );
    return a.id;
  },

  async createConnectOnboardingLink(p) {
    const l = await stripe().accountLinks.create({
      account: p.accountId,
      refresh_url: p.refreshUrl,
      return_url: p.returnUrl,
      type: "account_onboarding",
    });
    return l.url;
  },

  async createConnectDashboardLink() {
    // Accounts with the full Stripe dashboard log in directly at dashboard.stripe.com.
    return "https://dashboard.stripe.com/";
  },

  async retrieveAccount(accountId) {
    const a = await stripe().accounts.retrieve(accountId);
    return { chargesEnabled: !!a.charges_enabled, payoutsEnabled: !!a.payouts_enabled, detailsSubmitted: !!a.details_submitted };
  },
};
