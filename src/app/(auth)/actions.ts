"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroySession, getSession, updateSession } from "@/lib/auth/session";
import { consumeToken, issueToken } from "@/lib/auth/tokens";
import { verifyTotp } from "@/lib/auth/totp";
import { db, schema } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { passwordChangedMail, passwordResetMail, verifyEmailMail, WELCOME_STEPS } from "@/lib/email/templates";
import { kickJobs } from "@/lib/jobs/kick";
import { enqueue, enqueueEmail } from "@/lib/jobs/queue";
import { audit } from "@/lib/security/audit";
import { decrypt, sha256 } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestInfo } from "@/lib/security/request";
import { looksLikeBot, verifyTurnstile } from "@/lib/security/turnstile";
import { RESERVED_SLUGS, slugify } from "@/lib/utils/slug";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

async function uniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name) || "anbieter";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (RESERVED_SLUGS.has(candidate)) continue;
    const [r] = await db.select({ id: schema.organizations.id }).from(schema.organizations).where(eq(schema.organizations.slug, candidate));
    if (!r) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const registerSchema = z.object({
  name: z.string().min(2, "Bitte geben Sie Ihren Namen an.").max(100),
  company: z.string().min(2, "Bitte geben Sie Ihre Firma oder den Namen Ihres Angebots an.").max(120),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse an.").max(200),
  phone: z.string().max(40).optional(),
  street: z.string().min(2, "Bitte geben Sie Strasse und Nummer an.").max(120),
  postalCode: z.string().min(3, "PLZ fehlt.").max(12),
  city: z.string().min(2, "Ort fehlt.").max(80),
  country: z.enum(["CH", "LI", "DE", "AT", "FR", "IT"]),
  vatNumber: z.string().max(40).optional(),
  plan: z.enum(["starter", "professional", "business"]).optional(),
});

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ip } = await requestInfo();
  if (looksLikeBot(fd)) return fail("Die Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.");
  if (!(await rateLimit(`register:${ip}`, 5, 3600))) return fail("Zu viele Registrierungen von dieser Verbindung. Bitte später erneut versuchen.");
  if (!(await verifyTurnstile(str(fd, "cf-turnstile-response"), ip))) return fail("Die Sicherheitsprüfung ist fehlgeschlagen.");

  const parsed = registerSchema.safeParse({
    name: str(fd, "name"),
    company: str(fd, "company"),
    email: str(fd, "email").toLowerCase(),
    phone: str(fd, "phone") || undefined,
    street: str(fd, "street"),
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    country: str(fd, "country") || "CH",
    vatNumber: str(fd, "vatNumber") || undefined,
    plan: (str(fd, "plan") || undefined) as never,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return fail("Bitte prüfen Sie die markierten Felder.", fe);
  }
  const d = parsed.data;
  const password = String(fd.get("password") ?? "");
  const pwErr = validatePasswordStrength(password, d.email);
  if (pwErr) return fail(pwErr, { password: pwErr });
  if (fd.get("terms") !== "on") return fail("Bitte akzeptieren Sie die Nutzungsbedingungen und die Datenschutzerklärung.", { terms: "Erforderlich" });

  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, d.email));
  if (exists) {
    // Do not reveal account existence in detail; offer login/reset.
    return fail("Mit dieser E-Mail-Adresse besteht bereits ein Konto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.", { email: "Bereits registriert" });
  }

  const passwordHash = await hashPassword(password);
  const slug = await uniqueOrgSlug(d.company);
  const userId = await db.transaction(async (tx) => {
    const [user] = await tx.insert(schema.users).values({ email: d.email, name: d.name, phone: d.phone ?? null, passwordHash }).returning();
    const [org] = await tx
      .insert(schema.organizations)
      .values({
        name: d.company,
        slug,
        legalName: d.company,
        contactEmail: d.email,
        phone: d.phone ?? null,
        street: d.street,
        postalCode: d.postalCode,
        city: d.city,
        country: d.country,
        vatNumber: d.vatNumber ?? null,
        vatRegistered: !!d.vatNumber,
        planKey: null,
      })
      .returning();
    await tx.insert(schema.memberships).values({ orgId: org.id, userId: user.id, role: "owner" });
    for (const step of WELCOME_STEPS) {
      await enqueue(tx, "welcome.step", { userId: user.id, step }, { runAt: new Date(Date.now() + step * 86400_000 + (step === 0 ? 5 * 60_000 : 0)), dedupeKey: `welcome:${user.id}:${step}` });
    }
    return user.id;
  });
  await sendVerification(userId, d.name, d.email);
  await audit("user.registered", { userId, data: { plan: d.plan ?? null } });
  await createSession(userId);
  kickJobs();
  redirect(`/email-bestaetigen${d.plan ? `?tarif=${d.plan}` : ""}`);
}

async function sendVerification(userId: string, name: string, email: string) {
  const token = await issueToken(userId, "email_verify");
  await enqueueEmail(db, { to: email, ...verifyEmailMail(name, appUrl(`/email-bestaetigen/${token}`)), template: "auth.verify_email" });
}

export async function resendVerificationAction(): Promise<ActionState> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.user.emailVerifiedAt) redirect("/app");
  if (!(await rateLimit(`verify-resend:${s.user.id}`, 3, 3600))) return fail("Bitte warten Sie etwas, bevor Sie eine weitere E-Mail anfordern.");
  await sendVerification(s.user.id, s.user.name, s.user.email);
  kickJobs();
  return success("Wir haben Ihnen eine neue Bestätigungs-E-Mail gesendet.");
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"));
  const { ip } = await requestInfo();
  if (!(await rateLimit(`login-ip:${ip}`, 30, 900)) || !(await rateLimit(`login-email:${email}`, 10, 900))) {
    await audit("auth.rate_limited", { severity: "warning", data: { email } });
    return fail("Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.");
  }
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || user.disabledAt) {
    await audit("auth.login_failed", { severity: "warning", data: { email, reason: "unknown_or_disabled" } });
    return fail("E-Mail-Adresse oder Passwort ist falsch.");
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return fail("Ihr Konto ist wegen mehrerer Fehlversuche vorübergehend gesperrt. Bitte versuchen Sie es später erneut oder setzen Sie Ihr Passwort zurück.");
  }
  if (!valid) {
    const count = user.failedLoginCount + 1;
    await db
      .update(schema.users)
      .set({ failedLoginCount: count, lockedUntil: count >= 10 ? new Date(Date.now() + 15 * 60_000) : null })
      .where(eq(schema.users.id, user.id));
    await audit("auth.login_failed", { userId: user.id, severity: count >= 10 ? "critical" : "warning", data: { count } });
    return fail("E-Mail-Adresse oder Passwort ist falsch.");
  }
  await db.update(schema.users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  await createSession(user.id);
  await audit("auth.login", { userId: user.id });
  const target = user.isPlatformAdmin && next === "/app" ? "/admin" : next;
  if (user.totpEnabledAt) redirect(`/login/mfa?next=${encodeURIComponent(target)}`);
  redirect(target);
}

export async function mfaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.user.totpEnabledAt || !s.user.totpSecretEnc) redirect("/app");
  if (!(await rateLimit(`mfa:${s.user.id}`, 8, 900))) return fail("Zu viele Versuche. Bitte warten Sie 15 Minuten.");
  const ok = verifyTotp(decrypt(s.user.totpSecretEnc), str(fd, "code"));
  if (!ok) {
    await audit("auth.mfa_failed", { userId: s.user.id, severity: "warning" });
    return fail("Der Code ist ungültig.");
  }
  await updateSession({ mfaVerifiedAt: new Date() });
  await audit("auth.mfa_verified", { userId: s.user.id });
  const next = safeNext(str(fd, "next"), s.user.isPlatformAdmin ? "/admin" : "/app");
  redirect(next);
}

export async function logoutAction() {
  const s = await getSession();
  await destroySession();
  if (s) await audit("auth.logout", { userId: s.user.id });
  redirect("/login?abgemeldet=1");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const { ip } = await requestInfo();
  if (!(await rateLimit(`forgot-ip:${ip}`, 10, 3600)) || !(await rateLimit(`forgot:${email}`, 3, 3600))) {
    return success("Falls ein Konto mit dieser Adresse besteht, haben wir Ihnen eine E-Mail gesendet.");
  }
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (user && !user.disabledAt) {
    const token = await issueToken(user.id, "password_reset");
    await enqueueEmail(db, { to: user.email, ...passwordResetMail(user.name, appUrl(`/passwort-zuruecksetzen/${token}`)), template: "auth.password_reset" });
    await audit("auth.password_reset_requested", { userId: user.id });
    kickJobs();
  }
  // Identical response whether or not the account exists (no account enumeration).
  return success("Falls ein Konto mit dieser Adresse besteht, haben wir Ihnen eine E-Mail gesendet.");
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const password = String(fd.get("password") ?? "");
  if (password !== String(fd.get("password2") ?? "")) return fail("Die Passwörter stimmen nicht überein.", { password2: "Stimmt nicht überein" });
  const userId = await consumeTokenAfterValidation(token, password);
  if (typeof userId !== "string") return userId;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
  await destroyAllSessions(userId);
  await enqueueEmail(db, { to: user.email, ...passwordChangedMail(user.name), template: "auth.password_changed" });
  await audit("auth.password_reset", { userId, severity: "warning" });
  kickJobs();
  redirect("/login?passwort=neu");
}

async function consumeTokenAfterValidation(token: string, password: string): Promise<string | ActionState> {
  const [row] = await db
    .select({ email: schema.users.email })
    .from(schema.authTokens)
    .innerJoin(schema.users, eq(schema.users.id, schema.authTokens.userId))
    .where(and(eq(schema.authTokens.type, "password_reset"), sql`${schema.authTokens.usedAt} IS NULL`, sql`${schema.authTokens.expiresAt} > now()`, eq(schema.authTokens.tokenHash, sha256(token))));
  if (!row) return fail("Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.");
  const err = validatePasswordStrength(password, row.email);
  if (err) return fail(err, { password: err });
  const userId = await consumeToken(token, "password_reset");
  if (!userId) return fail("Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.");
  return userId;
}
