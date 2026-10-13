import { randomBytes } from "node:crypto";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { db, schema, type DbOrTx } from "@/lib/db";
import { appUrl } from "@/lib/env";
import * as T from "@/lib/email/templates";
import { enqueue, enqueueEmail } from "@/lib/jobs/queue";
import { gateway } from "@/lib/payments/gateway";
import { getPlan } from "./entitlements";

/**
 * Empfehlungsprogramm: Wer Raumvia weiterempfiehlt und wer sich über den Link registriert, erhalten je
 * einen Monat ihres Tarifs gutgeschrieben – sobald die neue Organisation ihre erste Abo-Rechnung bezahlt hat
 * (also nach der Testphase). Die Gutschrift läuft als Stripe-Kundenguthaben und wird mit der nächsten
 * Rechnung verrechnet.
 */

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o/1/l/i
export const REFERRAL_CODE_RE = /^[a-z0-9]{6,16}$/;

function newCode(len = 8) {
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const referralUrl = (code: string) => appUrl(`/registrieren?ref=${code}`);

/** Returns the organisation's referral code, creating one on first use. */
export async function ensureReferralCode(orgId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [o] = await db.select({ code: schema.organizations.referralCode }).from(schema.organizations).where(eq(schema.organizations.id, orgId));
    if (!o) throw new Error("Organisation nicht gefunden.");
    if (o.code) return o.code;
    try {
      const [u] = await db
        .update(schema.organizations)
        .set({ referralCode: newCode() })
        .where(and(eq(schema.organizations.id, orgId), isNull(schema.organizations.referralCode)))
        .returning({ code: schema.organizations.referralCode });
      if (u?.code) return u.code;
    } catch {
      // unique collision – try again with a new code
    }
  }
  throw new Error("Empfehlungscode konnte nicht erstellt werden.");
}

/** Resolves a referral code from a sign-up link (invalid or suspended referrers are ignored). */
export async function findReferrer(code: string | null | undefined, tx: DbOrTx = db) {
  const c = (code ?? "").trim().toLowerCase();
  if (!REFERRAL_CODE_RE.test(c)) return null;
  const [o] = await tx
    .select({ id: schema.organizations.id, name: schema.organizations.name, suspendedAt: schema.organizations.suspendedAt })
    .from(schema.organizations)
    .where(eq(schema.organizations.referralCode, c));
  return o && !o.suspendedAt ? { id: o.id, name: o.name } : null;
}

export async function referralStats(orgId: string) {
  const [all] = await db.select({ n: count() }).from(schema.organizations).where(eq(schema.organizations.referredByOrgId, orgId));
  const [rewarded] = await db
    .select({ n: count() })
    .from(schema.organizations)
    .where(and(eq(schema.organizations.referredByOrgId, orgId), isNotNull(schema.organizations.referralRewardedAt)));
  return { signedUp: all.n, rewarded: rewarded.n };
}

/**
 * Called inside the transaction that records a paid subscription invoice. Queues the reward exactly once
 * (dedupe key); the job grants the credits with idempotency keys, so retries are safe.
 */
export async function queueReferralReward(tx: DbOrTx, org: typeof schema.organizations.$inferSelect, amountPaid: number) {
  if (amountPaid <= 0 || !org.referredByOrgId || org.referralRewardedAt) return;
  await enqueue(tx, "referral.reward", { orgId: org.id }, { dedupeKey: `referral:${org.id}` });
}

/** Job handler: one month of the respective plan for both sides. */
export async function grantReferralReward(referredOrgId: string) {
  const [referred] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, referredOrgId));
  if (!referred?.referredByOrgId || referred.referralRewardedAt) return;
  const [referrer] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, referred.referredByOrgId));

  const sides = [
    { org: referred, side: "referred" as const, other: referrer?.name ?? null },
    ...(referrer && !referrer.suspendedAt ? [{ org: referrer, side: "referrer" as const, other: referred.name }] : []),
  ];
  const granted: { org: typeof referred; amount: number; other: string | null; side: "referred" | "referrer" }[] = [];
  for (const s of sides) {
    const plan = await getPlan(s.org.planKey);
    if (!plan || !s.org.stripeCustomerId) continue; // e.g. manual pilot access – nothing to credit
    await gateway().creditCustomer({
      customerId: s.org.stripeCustomerId,
      amount: plan.priceMonthly,
      currency: plan.currency,
      description: s.side === "referrer" ? `Empfehlungsbonus: 1 Monat gratis (Empfehlung ${referred.name})` : "Empfehlungsbonus: 1 Monat gratis",
      idempotencyKey: `referral-credit:${referred.id}:${s.side}`,
    });
    granted.push({ ...s, amount: plan.priceMonthly });
  }

  await db.transaction(async (tx) => {
    const [marked] = await tx
      .update(schema.organizations)
      .set({ referralRewardedAt: new Date() })
      .where(and(eq(schema.organizations.id, referred.id), isNull(schema.organizations.referralRewardedAt)))
      .returning({ id: schema.organizations.id });
    if (!marked) return;
    for (const g of granted) {
      const [owner] = await tx
        .select({ email: schema.users.email, name: schema.users.name })
        .from(schema.memberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
        .where(and(eq(schema.memberships.orgId, g.org.id), eq(schema.memberships.role, "owner")))
        .limit(1);
      if (!owner) continue;
      await enqueueEmail(tx, { to: owner.email, ...T.referralRewardMail(owner.name, g.amount, g.side, g.other), template: "referral.reward", orgId: g.org.id }, `mail:referral:${referred.id}:${g.side}`);
    }
  });
}
