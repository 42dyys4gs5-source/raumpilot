"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { appUrl, paymentsEnabled } from "@/lib/env";
import { gateway } from "@/lib/payments/gateway";
import { audit } from "@/lib/security/audit";
import { logError } from "@/lib/security/errors";

export async function connectStripeAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("owner");
  if (!paymentsEnabled) return fail("Onlinezahlungen sind auf dieser Installation noch nicht aktiviert.");
  let url: string;
  try {
    let accountId = ctx.org.stripeAccountId;
    if (!accountId) {
      accountId = await gateway().createConnectAccount({ orgId: ctx.org.id, email: ctx.org.contactEmail, businessName: ctx.org.legalName || ctx.org.name, country: ctx.org.country });
      await db.update(schema.organizations).set({ stripeAccountId: accountId }).where(eq(schema.organizations.id, ctx.org.id));
      await audit("payments.connect_account_created", { userId: ctx.user.id, orgId: ctx.org.id });
    }
    url = await gateway().createConnectOnboardingLink({
      accountId,
      refreshUrl: appUrl("/app/einnahmen?stripe=erneut"),
      returnUrl: appUrl("/app/einnahmen?stripe=zurueck"),
    });
  } catch (e) {
    await logError("connect.onboarding", e, { orgId: ctx.org.id });
    return fail("Die Verbindung zu Stripe konnte nicht hergestellt werden. Bitte versuchen Sie es später erneut.");
  }
  redirect(url);
}

export async function refreshStripeAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  if (!ctx.org.stripeAccountId) return fail("Noch kein Stripe-Konto verbunden.");
  const s = await gateway().retrieveAccount(ctx.org.stripeAccountId);
  await db
    .update(schema.organizations)
    .set({ stripeChargesEnabled: s.chargesEnabled, stripePayoutsEnabled: s.payoutsEnabled, stripeDetailsSubmitted: s.detailsSubmitted })
    .where(eq(schema.organizations.id, ctx.org.id));
  revalidatePath("/app/einnahmen");
  return success(s.chargesEnabled ? "Ihr Stripe-Konto ist aktiv. Sie können Onlinezahlung bei Ihren Räumen aktivieren." : "Stripe prüft Ihre Angaben noch.");
}
