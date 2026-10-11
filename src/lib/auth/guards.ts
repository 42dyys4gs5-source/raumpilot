import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { activePlan, type Plan } from "@/lib/billing/entitlements";
import { getSession, type CurrentSession } from "./session";

export type Role = "owner" | "admin" | "staff";
const ROLE_RANK: Record<Role, number> = { staff: 1, admin: 2, owner: 3 };

export async function requireUser(opts: { allowUnverified?: boolean } = {}): Promise<CurrentSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.user.totpEnabledAt && !s.session.mfaVerifiedAt) redirect("/login/mfa");
  if (!opts.allowUnverified && !s.user.emailVerifiedAt) redirect("/email-bestaetigen");
  return s;
}

export type OrgContext = CurrentSession & {
  org: typeof schema.organizations.$inferSelect;
  role: Role;
  plan: Plan | null;
};

export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const s = await getSession();
  if (!s) return null;
  const rows = await db
    .select({ org: schema.organizations, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.orgId))
    .where(eq(schema.memberships.userId, s.user.id))
    .orderBy(asc(schema.memberships.createdAt));
  if (!rows.length) return null;
  const chosen = rows.find((r) => r.org.id === s.session.activeOrgId) ?? rows[0];
  return { ...s, org: chosen.org, role: chosen.role, plan: await activePlan(chosen.org) };
});

/** Use in every tenant page and server action. All tenant queries must filter by ctx.org.id. */
export async function requireOrg(minRole: Role = "staff"): Promise<OrgContext> {
  await requireUser();
  const ctx = await getOrgContext();
  if (!ctx) redirect("/app/onboarding");
  if (ROLE_RANK[ctx.role] < ROLE_RANK[minRole]) redirect("/app?fehler=berechtigung");
  return ctx;
}

export async function listUserOrgs(userId: string) {
  return db
    .select({ id: schema.organizations.id, name: schema.organizations.name, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.orgId))
    .where(eq(schema.memberships.userId, userId));
}

export async function isMember(userId: string, orgId: string) {
  const r = await db
    .select({ role: schema.memberships.role })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.orgId, orgId)))
    .limit(1);
  return r[0]?.role ?? null;
}

/** Platform administrators must have TOTP enabled and verified in the current session. */
export async function requireAdmin(): Promise<CurrentSession> {
  const s = await requireUser();
  if (!s.user.isPlatformAdmin) redirect("/app");
  if (!s.user.totpEnabledAt) redirect("/konto/mfa");
  if (!s.session.mfaVerifiedAt) redirect("/login/mfa?next=/admin");
  return s;
}
