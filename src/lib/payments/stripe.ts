import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY ist nicht konfiguriert.");
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
