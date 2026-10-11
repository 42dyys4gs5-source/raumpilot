"use server";

import { and, count, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg, requireUser } from "@/lib/auth/guards";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroySession } from "@/lib/auth/session";
import { generateTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { db, schema } from "@/lib/db";
import { appUrl, paymentsEnabled } from "@/lib/env";
import { inviteMail, passwordChangedMail } from "@/lib/email/templates";
import { kickJobs } from "@/lib/jobs/kick";
import { enqueueEmail } from "@/lib/jobs/queue";
import { gateway } from "@/lib/payments/gateway";
import { audit } from "@/lib/security/audit";
import { decrypt, encrypt, randomToken, sha256 } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { deleteObject } from "@/lib/storage";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function profileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const name = str(fd, "name");
  const email = str(fd, "contactEmail").toLowerCase();
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte Name und gültige Kontakt-E-Mail angeben.");
  const vatRate = Math.round(Number(str(fd, "vatRate").replace(",", ".")) * 100);
  if (fd.get("vatRegistered") === "on" && (!(vatRate > 0) || vatRate > 3000)) return fail("Bitte einen gültigen MWST-Satz angeben (z. B. 8.1).");
  await db
    .update(schema.organizations)
    .set({
      name,
      legalName: str(fd, "legalName") || null,
      contactEmail: email,
      phone: str(fd, "phone") || null,
      website: str(fd, "website") || null,
      street: str(fd, "street") || null,
      postalCode: str(fd, "postalCode") || null,
      city: str(fd, "city") || null,
      country: str(fd, "country") || "CH",
      vatNumber: str(fd, "vatNumber") || null,
      vatRegistered: fd.get("vatRegistered") === "on",
      vatRateBp: vatRate > 0 ? vatRate : 810,
      updatedAt: new Date(),
    })
    .where(eq(schema.organizations.id, ctx.org.id));
  revalidatePath("/app/einstellungen");
  return success("Gespeichert.");
}

export async function notificationsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const email = str(fd, "notificationEmail").toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Ungültige E-Mail-Adresse.");
  await db
    .update(schema.organizations)
    .set({
      notificationSettings: {
        notifyNewBooking: fd.get("notifyNewBooking") === "on",
        notifyCancellation: fd.get("notifyCancellation") === "on",
        customerReminders: fd.get("customerReminders") === "on",
        reminderHoursBefore: Math.min(168, Math.max(2, Number(str(fd, "reminderHoursBefore")) || 24)),
        notificationEmail: email || null,
      },
    })
    .where(eq(schema.organizations.id, ctx.org.id));
  revalidatePath("/app/benachrichtigungen");
  return success("Gespeichert.");
}

/* -------------------------------- Team -------------------------------- */

export async function inviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  if (!ctx.plan?.features.team) return fail("Teamzugänge sind im Tarif Business enthalten.");
  const email = str(fd, "email").toLowerCase();
  const role = str(fd, "role") === "admin" ? "admin" : "staff";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Ungültige E-Mail-Adresse.");
  if (!(await rateLimit(`invite:${ctx.org.id}`, 20, 86400))) return fail("Zu viele Einladungen heute.");
  const [{ n: members }] = await db.select({ n: count() }).from(schema.memberships).where(eq(schema.memberships.orgId, ctx.org.id));
  const [{ n: pending }] = await db.select({ n: count() }).from(schema.invitations).where(and(eq(schema.invitations.orgId, ctx.org.id), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())));
  if (members + pending >= ctx.plan.maxMembers) return fail(`Ihr Tarif erlaubt ${ctx.plan.maxMembers} Teammitglieder.`);
  const token = randomToken(32);
  await db.insert(schema.invitations).values({ orgId: ctx.org.id, email, role, tokenHash: sha256(token), invitedBy: ctx.user.id, expiresAt: new Date(Date.now() + 7 * 86400_000) });
  await enqueueEmail(db, { to: email, ...inviteMail(ctx.org.name, ctx.user.name, appUrl(`/einladung/${token}`)), template: "team.invite", orgId: ctx.org.id });
  await audit("team.invited", { userId: ctx.user.id, orgId: ctx.org.id, data: { email, role } });
  kickJobs();
  revalidatePath("/app/einstellungen");
  return success(`Einladung an ${email} gesendet.`);
}

export async function memberAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const userId = str(fd, "userId");
  const op = str(fd, "op");
  if (op === "revoke-invite") {
    await db.delete(schema.invitations).where(and(eq(schema.invitations.id, str(fd, "inviteId")), eq(schema.invitations.orgId, ctx.org.id)));
    revalidatePath("/app/einstellungen");
    return success("Einladung zurückgezogen.");
  }
  if (userId === ctx.user.id) return fail("Sie können Ihre eigene Rolle nicht ändern.");
  const [m] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.orgId, ctx.org.id), eq(schema.memberships.userId, userId)));
  if (!m) return fail("Mitglied nicht gefunden.");
  if (m.role === "owner") return fail("Die Kontoinhaberin bzw. der Kontoinhaber kann nicht geändert werden.");
  if (op === "remove") {
    await db.delete(schema.memberships).where(and(eq(schema.memberships.orgId, ctx.org.id), eq(schema.memberships.userId, userId)));
    await db.update(schema.sessions).set({ activeOrgId: null }).where(eq(schema.sessions.userId, userId));
  } else {
    await db.update(schema.memberships).set({ role: op === "make-admin" ? "admin" : "staff" }).where(and(eq(schema.memberships.orgId, ctx.org.id), eq(schema.memberships.userId, userId)));
  }
  await audit(`team.${op}`, { userId: ctx.user.id, orgId: ctx.org.id, severity: "warning", data: { target: userId } });
  revalidatePath("/app/einstellungen");
  return success("Gespeichert.");
}

export async function acceptInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const [inv] = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.tokenHash, sha256(token)), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())));
  if (!inv) return fail("Die Einladung ist ungültig oder abgelaufen.");
  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, inv.email));
  if (!user) {
    const name = str(fd, "name");
    const password = String(fd.get("password") ?? "");
    if (name.length < 2) return fail("Bitte geben Sie Ihren Namen an.");
    const err = validatePasswordStrength(password, inv.email);
    if (err) return fail(err);
    // The invitation link proves access to the mailbox, so the address counts as verified.
    [user] = await db.insert(schema.users).values({ email: inv.email, name, passwordHash: await hashPassword(password), emailVerifiedAt: new Date() }).returning();
    await createSession(user.id, { activeOrgId: inv.orgId });
  } else {
    const s = await requireUser();
    if (s.user.id !== user.id) return fail(`Bitte melden Sie sich mit ${inv.email} an, um die Einladung anzunehmen.`);
  }
  await db.insert(schema.memberships).values({ orgId: inv.orgId, userId: user.id, role: inv.role }).onConflictDoNothing();
  await db.update(schema.invitations).set({ acceptedAt: new Date() }).where(eq(schema.invitations.id, inv.id));
  await db.update(schema.sessions).set({ activeOrgId: inv.orgId }).where(eq(schema.sessions.userId, user.id));
  await audit("team.joined", { userId: user.id, orgId: inv.orgId });
  redirect("/app");
}

export async function switchOrgAction(fd: FormData) {
  const s = await requireUser();
  const orgId = str(fd, "orgId");
  const [m] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.userId, s.user.id), eq(schema.memberships.orgId, orgId)));
  if (m) await db.update(schema.sessions).set({ activeOrgId: orgId }).where(eq(schema.sessions.id, s.session.id));
  redirect("/app");
}

/* ------------------------------ Locations ----------------------------- */

export async function locationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  if (str(fd, "op") === "delete") {
    await db.delete(schema.locations).where(and(eq(schema.locations.id, str(fd, "locationId")), eq(schema.locations.orgId, ctx.org.id)));
    revalidatePath("/app/einstellungen");
    return success("Standort entfernt.");
  }
  const max = ctx.plan?.maxLocations ?? 1;
  const [{ n }] = await db.select({ n: count() }).from(schema.locations).where(eq(schema.locations.orgId, ctx.org.id));
  if (max <= 1) return fail("Mehrere Standorte sind im Tarif Business enthalten.");
  if (n >= max) return fail(`Ihr Tarif erlaubt ${max} Standorte.`);
  const name = str(fd, "name");
  if (name.length < 2) return fail("Bitte einen Namen angeben.");
  await db.insert(schema.locations).values({ orgId: ctx.org.id, name, street: str(fd, "street") || null, postalCode: str(fd, "postalCode") || null, city: str(fd, "city") || null });
  revalidatePath("/app/einstellungen");
  return success("Standort hinzugefügt.");
}

/* ------------------------------ Security ------------------------------ */

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireUser();
  if (!(await rateLimit(`pw-change:${s.user.id}`, 10, 3600))) return fail("Zu viele Versuche.");
  if (!(await verifyPassword(String(fd.get("current") ?? ""), s.user.passwordHash))) return fail("Das aktuelle Passwort ist falsch.");
  const pw = String(fd.get("password") ?? "");
  const err = validatePasswordStrength(pw, s.user.email);
  if (err) return fail(err);
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw), updatedAt: new Date() }).where(eq(schema.users.id, s.user.id));
  await destroyAllSessions(s.user.id);
  await createSession(s.user.id, { mfaVerified: !!s.user.totpEnabledAt, activeOrgId: s.session.activeOrgId });
  await enqueueEmail(db, { to: s.user.email, ...passwordChangedMail(s.user.name), template: "auth.password_changed" });
  await audit("auth.password_changed", { userId: s.user.id, severity: "warning" });
  kickJobs();
  return success("Passwort geändert. Andere Geräte wurden abgemeldet.");
}

export async function startTotpAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  const s = await requireUser();
  if (s.user.totpEnabledAt) return fail("Die Zwei-Faktor-Authentifizierung ist bereits aktiv.");
  const secret = generateTotpSecret();
  await db.update(schema.users).set({ totpSecretEnc: encrypt(secret) }).where(eq(schema.users.id, s.user.id));
  revalidatePath("/konto/mfa");
  return success();
}

export async function confirmTotpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireUser();
  if (!s.user.totpSecretEnc) return fail("Bitte starten Sie die Einrichtung erneut.");
  if (!verifyTotp(decrypt(s.user.totpSecretEnc), str(fd, "code"))) return fail("Der Code ist ungültig. Prüfen Sie die Uhrzeit Ihres Geräts.");
  await db.update(schema.users).set({ totpEnabledAt: new Date() }).where(eq(schema.users.id, s.user.id));
  await db.update(schema.sessions).set({ mfaVerifiedAt: new Date() }).where(eq(schema.sessions.id, s.session.id));
  await audit("auth.mfa_enabled", { userId: s.user.id, severity: "warning" });
  redirect(s.user.isPlatformAdmin ? "/admin" : "/app/einstellungen?tab=sicherheit&mfa=1");
}

export async function disableTotpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireUser();
  if (s.user.isPlatformAdmin) return fail("Für Administratoren ist die Zwei-Faktor-Authentifizierung Pflicht.");
  if (!s.user.totpSecretEnc || !verifyTotp(decrypt(s.user.totpSecretEnc), str(fd, "code"))) return fail("Der Code ist ungültig.");
  await db.update(schema.users).set({ totpEnabledAt: null, totpSecretEnc: null }).where(eq(schema.users.id, s.user.id));
  await audit("auth.mfa_disabled", { userId: s.user.id, severity: "warning" });
  revalidatePath("/app/einstellungen");
  return success("Zwei-Faktor-Authentifizierung deaktiviert.");
}

/* --------------------------- Account deletion -------------------------- */

export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("owner");
  if (str(fd, "confirm") !== ctx.org.name) return fail(`Bitte geben Sie zur Bestätigung «${ctx.org.name}» ein.`);
  if (!(await verifyPassword(String(fd.get("password") ?? ""), ctx.user.passwordHash))) return fail("Das Passwort ist falsch.");
  const [active] = await db
    .select({ n: count() })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.orgId, ctx.org.id), gt(schema.bookings.endsAt, new Date()), inArray(schema.bookings.status, ["confirmed", "requested", "awaiting_payment", "pending_payment"])));
  if (active.n > 0) return fail(`Es bestehen noch ${active.n} künftige Buchungen. Bitte stornieren oder abwickeln Sie diese zuerst.`);
  const subs = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.orgId, ctx.org.id), eq(schema.subscriptions.source, "stripe"), ne(schema.subscriptions.status, "canceled")));
  if (paymentsEnabled) {
    for (const s of subs) if (s.stripeSubscriptionId) await gateway().cancelSubscriptionNow(s.stripeSubscriptionId);
  }
  await audit("org.deleted", { userId: ctx.user.id, orgId: ctx.org.id, severity: "critical", data: { name: ctx.org.name } });
  const orgId = ctx.org.id;
  const photos = await db.select({ a: schema.roomPhotos.path, b: schema.roomPhotos.thumbPath }).from(schema.roomPhotos).where(eq(schema.roomPhotos.orgId, orgId));
  const files = [...photos.flatMap((p) => [p.a, p.b]), ...(ctx.org.logoPath ? [ctx.org.logoPath] : [])];
  await db.transaction(async (tx) => {
    await tx.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
    // Delete the user as well if they are not member of any other organisation.
    const [other] = await tx.select({ n: count() }).from(schema.memberships).where(eq(schema.memberships.userId, ctx.user.id));
    if (other.n === 0 && !ctx.user.isPlatformAdmin) await tx.delete(schema.users).where(eq(schema.users.id, ctx.user.id));
  });
  await db.execute(sql`DELETE FROM audit_log WHERE org_id = ${orgId} AND action NOT IN ('org.deleted')`);
  for (const f of files) await deleteObject(f).catch(() => {});
  await destroySession();
  redirect("/?konto=geloescht");
}
