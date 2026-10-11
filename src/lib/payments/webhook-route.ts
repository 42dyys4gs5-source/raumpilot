import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { processStripeEvent } from "./webhooks";

/** Shared handler: verifies the Stripe signature on the raw body, then processes idempotently. */
export async function handleStripeWebhook(req: Request, source: "platform" | "connect") {
  const secret = source === "platform" ? env.STRIPE_WEBHOOK_SECRET : env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook nicht konfiguriert" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signatur fehlt" }, { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    // Signature verification needs no API key; tolerance 5 min protects against replays.
    event = await Stripe.webhooks.constructEventAsync(body, signature, secret, 300);
  } catch {
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }
  try {
    const result = await processStripeEvent(event, source);
    if (result === "in_progress") return NextResponse.json({ status: result }, { status: 409 });
    return NextResponse.json({ received: true, status: result });
  } catch {
    // Non-2xx makes Stripe retry with backoff.
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}
