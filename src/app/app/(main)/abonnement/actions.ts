"use server";

import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { parseInterval } from "@/lib/billing/entitlements";
import { openBillingPortal, startSubscriptionCheckout } from "@/lib/billing/subscription";
import { paymentsEnabled } from "@/lib/env";
import { audit } from "@/lib/security/audit";
import { logError } from "@/lib/security/errors";

export async function subscribeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("owner");
  if (!paymentsEnabled) return fail("Die Online-Abrechnung ist noch nicht aktiviert. Bitte kontaktieren Sie uns – wir schalten Ihr Konto manuell frei.");
  if (ctx.plan && ctx.org.stripeCustomerId) {
    // Existing subscription: plan changes happen in the billing portal (prorated by Stripe).
    return portalAction(_, fd);
  }
  let url: string;
  try {
    url = await startSubscriptionCheckout(ctx.org, String(fd.get("plan") ?? ""), parseInterval(fd.get("interval")));
  } catch (e) {
    await logError("billing.checkout", e, { orgId: ctx.org.id });
    return fail((e as Error).message || "Der Bezahlvorgang konnte nicht gestartet werden.");
  }
  await audit("billing.checkout_started", { userId: ctx.user.id, orgId: ctx.org.id, data: { plan: String(fd.get("plan")), interval: parseInterval(fd.get("interval")) } });
  redirect(url);
}

export async function portalAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("owner");
  if (!paymentsEnabled) return fail("Die Online-Abrechnung ist noch nicht aktiviert.");
  let url: string;
  try {
    url = await openBillingPortal(ctx.org);
  } catch (e) {
    return fail((e as Error).message);
  }
  redirect(url);
}
