import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY ist nicht konfiguriert.");
  // A publishable key (pk_…) or a webhook secret pasted by mistake only fails at the first payment;
  // say clearly what is wrong instead of surfacing Stripe's generic error to the customer.
  if (!/^(sk|rk)_(live|test)_/.test(env.STRIPE_SECRET_KEY)) {
    throw new Error("STRIPE_SECRET_KEY ist kein Geheimschlüssel (muss mit sk_live_ beginnen). Bitte in Vercel korrigieren.");
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      appInfo: { name: "Raumvia", url: env.APP_URL },
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return client;
}

export function isLiveKey(): boolean {
  return !!env.STRIPE_SECRET_KEY?.startsWith("sk_live_");
}
