import { randomToken } from "@/lib/security/crypto";
import { appUrl, env } from "@/lib/env";
import type { PaymentGateway } from "./gateway";

/**
 * TEST-ONLY gateway (PAYMENTS_MODE=fake). It simulates Stripe's hosted pages with a local
 * page (/dev/checkout) that feeds synthetic events through the real webhook handlers.
 * env.ts refuses PAYMENTS_MODE=fake in production.
 */
function guard() {
  if (env.NODE_ENV === "production" && !process.env.E2E_TEST_MODE) throw new Error("Fake-Zahlungen sind in Produktion nicht erlaubt.");
}

export const fakeGateway: PaymentGateway = {
  async createBookingCheckout(p) {
    guard();
    const id = `cs_fake_${randomToken(12)}`;
    const q = new URLSearchParams({ kind: "booking", session: id, booking: p.bookingId, account: p.accountId, amount: String(p.amount), success: p.successUrl, cancel: p.cancelUrl });
    return { id, url: appUrl(`/dev/checkout?${q}`) };
  },
  async expireBookingCheckout() {},
  async refund(p) {
    guard();
    return { id: `re_fake_${p.idempotencyKey.replace(/[^a-z0-9]/gi, "").slice(-24)}` };
  },
  async createCustomer(p) {
    guard();
    return `cus_fake_${p.orgId.slice(0, 8)}`;
  },
  async createSubscriptionCheckout(p) {
    guard();
    const id = `cs_fake_sub_${randomToken(12)}`;
    const q = new URLSearchParams({ kind: "subscription", session: id, org: p.orgId, plan: p.planKey, customer: p.customerId ?? "", success: p.successUrl, cancel: p.cancelUrl });
    return { id, url: appUrl(`/dev/checkout?${q}`) };
  },
  async createBillingPortal(p) {
    guard();
    return appUrl(`/dev/checkout?kind=portal&customer=${encodeURIComponent(p.customerId)}&return=${encodeURIComponent(p.returnUrl)}`);
  },
  async createConnectAccount(p) {
    guard();
    return `acct_fake_${p.orgId.replace(/-/g, "").slice(0, 16)}`;
  },
  async createConnectOnboardingLink(p) {
    guard();
    return appUrl(`/dev/checkout?kind=connect&account=${p.accountId}&return=${encodeURIComponent(p.returnUrl)}`);
  },
  async createConnectDashboardLink() {
    return null;
  },
  async retrieveAccount() {
    return { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
  },
};
