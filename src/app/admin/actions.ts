"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireAdmin } from "@/lib/auth/guards";
import { seedPlans } from "@/lib/billing/seed";
import { grantManualPlan } from "@/lib/billing/subscription";
import { db, schema } from "@/lib/db";
import { renderEmail } from "@/lib/email/layout";
import { kickJobs } from "@/lib/jobs/kick";
import { enqueueEmail } from "@/lib/jobs/queue";
import { audit } from "@/lib/security/audit";
import { setSetting, DEFAULT_OPERATOR, type OperatorInfo } from "@/lib/settings";
import { parseMoney } from "@/lib/utils/money";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function orgAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAdmin();
  const orgId = str(fd, "orgId");
  const op = str(fd, "op");
  if (op === "suspend") {
    const reason = str(fd, "reason") || "Verstoss gegen die Nutzungsbedingungen";
    await db.update(schema.organizations).set({ suspendedAt: new Date(), suspendedReason: reason }).where(eq(schema.organizations.id, orgId));
  } else if (op === "unsuspend") {
    await db.update(schema.organizations).set({ suspendedAt: null, suspendedReason: null }).where(eq(schema.organizations.id, orgId));
  } else if (op === "grant") {
    const plan = str(fd, "plan");
    const until = str(fd, "until") ? new Date(`${str(fd, "until")}T23:59:59Z`) : null;
    await grantManualPlan(orgId, plan, str(fd, "note") || "Manuell freigeschaltet", until);
  } else if (op === "revoke-manual") {
    await db.update(schema.subscriptions).set({ status: "canceled", canceledAt: new Date() }).where(and(eq(schema.subscriptions.orgId, orgId), eq(schema.subscriptions.source, "manual"), eq(schema.subscriptions.status, "active")));
    const active = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.orgId, orgId), sql`${schema.subscriptions.status} IN ('active','trialing','past_due')`));
    if (!active.length) await db.update(schema.organizations).set({ subscriptionStatus: "canceled" }).where(eq(schema.organizations.id, orgId));
  } else return fail("Unbekannte Aktion.");
  await audit(`admin.org_${op}`, { userId: s.user.id, orgId, severity: "warning", data: { op } });
  revalidatePath(`/admin/vermieter/${orgId}`);
  return success("Gespeichert.");
}

export async function userAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAdmin();
  const userId = str(fd, "userId");
  if (userId === s.user.id) return fail("Sie können Ihr eigenes Konto hier nicht ändern.");
  const op = str(fd, "op");
  if (op === "disable") {
    await db.update(schema.users).set({ disabledAt: new Date() }).where(eq(schema.users.id, userId));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  } else if (op === "enable") {
    await db.update(schema.users).set({ disabledAt: null, lockedUntil: null, failedLoginCount: 0 }).where(eq(schema.users.id, userId));
  } else if (op === "logout") {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  } else return fail("Unbekannte Aktion.");
  await audit(`admin.user_${op}`, { userId: s.user.id, severity: "warning", data: { target: userId } });
  revalidatePath("/admin/vermieter");
  return success("Gespeichert.");
}

export async function planAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAdmin();
  if (str(fd, "op") === "seed") {
    await seedPlans(db);
    revalidatePath("/admin/tarife");
    return success("Standardtarife angelegt.");
  }
  const key = str(fd, "key");
  const price = parseMoney(str(fd, "priceMonthly"));
  if (price == null) return fail("Ungültiger Preis.");
  const priceId = str(fd, "stripePriceId");
  if (priceId && !/^price_[A-Za-z0-9]+$/.test(priceId)) return fail("Die Stripe-Preis-ID beginnt mit «price_».");
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.key, key));
  if (!plan) return fail("Tarif nicht gefunden.");
  const features = { ...plan.features };
  for (const k of Object.keys(features) as (keyof typeof features)[]) features[k] = fd.get(`f_${k}`) === "on";
  await db
    .update(schema.plans)
    .set({
      name: str(fd, "name") || plan.name,
      description: str(fd, "description") || plan.description,
      priceMonthly: price,
      stripePriceId: priceId || null,
      maxRooms: Math.max(1, Number(str(fd, "maxRooms")) || plan.maxRooms),
      maxLocations: Math.max(1, Number(str(fd, "maxLocations")) || plan.maxLocations),
      maxMembers: Math.max(1, Number(str(fd, "maxMembers")) || plan.maxMembers),
      highlights: str(fd, "highlights").split("\n").map((x) => x.trim()).filter(Boolean),
      active: fd.get("active") === "on",
      features,
      updatedAt: new Date(),
    })
    .where(eq(schema.plans.key, key));
  await audit("admin.plan_updated", { userId: s.user.id, severity: "warning", data: { key } });
  revalidatePath("/admin/tarife");
  return success("Tarif gespeichert. Hinweis: Der Preis in Stripe muss separat angepasst werden (neuer Preis = neue Preis-ID).");
}

export async function operatorAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAdmin();
  const op: OperatorInfo = { ...DEFAULT_OPERATOR };
  for (const k of Object.keys(DEFAULT_OPERATOR) as (keyof OperatorInfo)[]) {
    if (k === "vatRegistered") op.vatRegistered = fd.get("vatRegistered") === "on";
    else (op as Record<string, unknown>)[k] = str(fd, k).slice(0, 200);
  }
  await setSetting("operator", op);
  await audit("admin.operator_updated", { userId: s.user.id, severity: "warning" });
  revalidatePath("/admin/einstellungen");
  return success("Betreiberangaben gespeichert (Impressum, Datenschutz, AGB).");
}

export async function errorAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (str(fd, "op") === "resolve-all") await db.update(schema.errorLog).set({ resolvedAt: new Date() }).where(sql`${schema.errorLog.resolvedAt} IS NULL`);
  else await db.update(schema.errorLog).set({ resolvedAt: new Date() }).where(eq(schema.errorLog.id, str(fd, "id")));
  revalidatePath("/admin/fehler");
  return success("Erledigt.");
}

export async function jobAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAdmin();
  const id = Number(str(fd, "jobId"));
  await db.update(schema.jobs).set({ status: "pending", attempts: 0, runAt: new Date(), lastError: null }).where(and(eq(schema.jobs.id, id), eq(schema.jobs.status, "failed")));
  await audit("admin.job_retry", { userId: s.user.id, data: { jobId: id } });
  kickJobs();
  revalidatePath("/admin/system");
  return success("Job wird erneut ausgeführt.");
}

export async function ticketReplyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireAdmin();
  const id = str(fd, "ticketId");
  const body = str(fd, "body");
  const [t] = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, id));
  if (!t) return fail("Ticket nicht gefunden.");
  if (str(fd, "op") === "close") {
    await db.update(schema.supportTickets).set({ status: "closed", updatedAt: new Date() }).where(eq(schema.supportTickets.id, id));
    revalidatePath(`/admin/support/${id}`);
    return success("Ticket geschlossen.");
  }
  if (body.length < 2) return fail("Bitte eine Antwort schreiben.");
  await db.transaction(async (tx) => {
    await tx.insert(schema.supportMessages).values({ ticketId: id, author: "admin", body });
    await tx.update(schema.supportTickets).set({ status: "answered", updatedAt: new Date() }).where(eq(schema.supportTickets.id, id));
    await enqueueEmail(tx, { to: t.email, ...renderEmail({ subject: `Re: ${t.subject}`, title: "Antwort auf Ihre Anfrage", blocks: [{ p: `Hallo ${t.name}` }, { p: body }] }), template: "support.reply" });
  });
  await audit("admin.ticket_reply", { userId: s.user.id, data: { ticketId: id } });
  kickJobs();
  revalidatePath(`/admin/support/${id}`);
  return success("Antwort gesendet.");
}
