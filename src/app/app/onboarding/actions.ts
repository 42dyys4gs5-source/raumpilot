"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/actions/types";
import { getOrgContext, requireUser } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { randomToken } from "@/lib/security/crypto";
import { slugify } from "@/lib/utils/slug";

export async function onboardingProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const ctx = await getOrgContext();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return fail("Bitte geben Sie einen Namen an.");
  const values = {
    name,
    phone: String(fd.get("phone") ?? "").trim() || null,
    website: String(fd.get("website") ?? "").trim().slice(0, 200) || null,
    about: String(fd.get("about") ?? "").trim().slice(0, 2000) || null,
    updatedAt: new Date(),
  };
  if (ctx) {
    if (ctx.role !== "owner" && ctx.role !== "admin") return fail("Keine Berechtigung.");
    await db.update(schema.organizations).set(values).where(eq(schema.organizations.id, ctx.org.id));
  } else {
    // Users without organisation (e.g. after leaving a team) can create one here.
    const s = await requireUser();
    const [org] = await db
      .insert(schema.organizations)
      .values({ ...values, slug: `${slugify(name) || "anbieter"}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "x")}`, contactEmail: s.user.email })
      .returning();
    await db.insert(schema.memberships).values({ orgId: org.id, userId: s.user.id, role: "owner" });
  }
  redirect("/app/onboarding?schritt=2");
}

export async function finishOnboardingAction() {
  const ctx = await getOrgContext();
  if (ctx) await db.update(schema.organizations).set({ onboardingCompletedAt: new Date() }).where(eq(schema.organizations.id, ctx.org.id));
  redirect("/app");
}
