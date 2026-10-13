import { env } from "@/lib/env";
import { fakeGateway } from "./fake-gateway";
import { stripeGateway } from "./stripe-gateway";

export type CheckoutResult = { id: string; url: string };

export type BookingCheckoutParams = {
  accountId: string;
  bookingId: string;
  reference: string;
  description: string;
  amount: number;
  currency: string;
  customerEmail: string;
  applicationFee: number;
  expiresAt: Date;
  successUrl: string;
  cancelUrl: string;
};

export type SubscriptionCheckoutParams = {
  orgId: string;
  customerId: string | null;
  email: string;
  priceId: string;
  planKey: string;
  trialDays: number;
  successUrl: string;
  cancelUrl: string;
};

export type AccountStatus = { chargesEnabled: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean };

/**
 * Abstraction over the payment provider. Production uses Stripe exclusively.
 * The fake gateway exists only for automated tests and is refused in production (see env.ts).
 */
export interface PaymentGateway {
  createBookingCheckout(p: BookingCheckoutParams): Promise<CheckoutResult>;
  expireBookingCheckout(accountId: string, sessionId: string): Promise<void>;
  refund(p: { accountId: string; paymentIntentId: string; amount: number; idempotencyKey: string }): Promise<{ id: string }>;
  createCustomer(p: { orgId: string; email: string; name: string; address?: { line1?: string | null; postal_code?: string | null; city?: string | null; country?: string | null } }): Promise<string>;
  createSubscriptionCheckout(p: SubscriptionCheckoutParams): Promise<CheckoutResult>;
  createBillingPortal(p: { customerId: string; returnUrl: string }): Promise<string>;
  createConnectAccount(p: { orgId: string; email: string; businessName: string; country: string }): Promise<string>;
  createConnectOnboardingLink(p: { accountId: string; refreshUrl: string; returnUrl: string }): Promise<string>;
  createConnectDashboardLink(accountId: string): Promise<string | null>;
  retrieveAccount(accountId: string): Promise<AccountStatus>;
  cancelSubscriptionNow(subscriptionId: string): Promise<void>;
  /** Credit (negative balance) on a platform customer, offset against the next subscription invoice. */
  creditCustomer(p: { customerId: string; amount: number; currency: string; description: string; idempotencyKey: string }): Promise<void>;
}

export function gateway(): PaymentGateway {
  if (env.PAYMENTS_MODE === "stripe") return stripeGateway;
  if (env.PAYMENTS_MODE === "fake") return fakeGateway;
  throw new PaymentsDisabledError();
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Onlinezahlungen sind auf dieser Installation noch nicht aktiviert.");
  }
}
