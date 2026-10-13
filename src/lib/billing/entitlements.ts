import { and, count, eq, ne } from "drizzle-orm";
import { cache } from "react";
import { DEFAULT_PLANS } from "@/config/plans";
import { db, schema, type DbOrTx } from "@/lib/db";
import type { PlanFeatures } from "@/lib/db/schema";

export type Plan = typeof schema.plans.$inferSelect;
type Org = typeof schema.organizations.$inferSelect;

/** Subscription states that grant access to paid features. past_due = grace period during Stripe retries. */
export const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

export type BillingInterval = "month" | "year";

/** Annual billing: 12 months for the price of 10. */
export const YEARLY_MONTHS_CHARGED = 10;
export const yearlyPrice = (p: Pick<Plan, "priceMonthly">) => p.priceMonthly * YEARLY_MONTHS_CHARGED;
/** Annual billing is only offered once every active plan has an annual Stripe price (or outside of Stripe mode, e.g. tests). */
export const yearlyAvailable = (plans: Plan[], paymentsMode: string) => paymentsMode !== "stripe" || plans.filter((p) => p.active).every((p) => !!p.stripePriceIdYearly);
export const parseInterval = (v: unknown): BillingInterval => (v === "year" || v === "jaehrlich" ? "year" : "month");

export async function listPlans(tx: DbOrTx = db): Promise<Plan[]> {
  const rows = await tx.select().from(schema.plans).orderBy(schema.plans.sort);
  if (rows.length) return rows;
  // Fallback before seeding: defaults (without Stripe price ids).
  return DEFAULT_PLANS.map((p) => ({
    ...p,
    currency: "CHF",
    stripePriceId: null,
    stripePriceIdYearly: null,
    active: true,
    updatedAt: new Date(0),
  }));
}

const getPlanCached = cache(async (key: string): Promise<Plan | null> => (await listPlans()).find((p) => p.key === key) ?? null);

/** Pass `tx` when called inside a transaction (avoids a second pool connection). */
export async function getPlan(key: string | null | undefined, tx?: DbOrTx): Promise<Plan | null> {
  if (!key) return null;
  if (tx) return (await listPlans(tx)).find((p) => p.key === key) ?? null;
  return getPlanCached(key);
}

export function hasAccess(org: Pick<Org, "subscriptionStatus" | "suspendedAt" | "planKey">): boolean {
  return !org.suspendedAt && !!org.planKey && ACCESS_STATUSES.has(org.subscriptionStatus);
}

export async function activePlan(org: Org, tx?: DbOrTx): Promise<Plan | null> {
  if (!hasAccess(org)) return null;
  return getPlan(org.planKey, tx);
}

export async function hasFeature(org: Org, feature: keyof PlanFeatures): Promise<boolean> {
  const plan = await activePlan(org);
  return !!plan?.features[feature];
}

export class PlanLimitError extends Error {}

export async function assertFeature(org: Org, feature: keyof PlanFeatures) {
  if (!(await hasFeature(org, feature))) {
    throw new PlanLimitError("Diese Funktion ist in Ihrem aktuellen Tarif nicht enthalten.");
  }
}

/** Rooms that count against the limit: everything not archived. Drafts count, so limits cannot be bypassed. */
export async function roomUsage(orgId: string, tx: DbOrTx = db) {
  const [r] = await tx
    .select({ n: count() })
    .from(schema.rooms)
    .where(and(eq(schema.rooms.orgId, orgId), ne(schema.rooms.status, "archived")));
  return r.n;
}

/**
 * Room limit before a plan is chosen: allow creating 1 draft room so onboarding works.
 */
export async function maxRoomsFor(org: Org): Promise<number> {
  const plan = await activePlan(org);
  return plan?.maxRooms ?? 1;
}
