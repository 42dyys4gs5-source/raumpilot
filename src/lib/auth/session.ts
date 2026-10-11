import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { requestInfo } from "@/lib/security/request";

const secure = env.APP_URL.startsWith("https://");
export const SESSION_COOKIE = secure ? "__Host-rv_session" : "rv_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string, opts: { mfaVerified?: boolean; activeOrgId?: string | null } = {}) {
  const token = randomToken(32);
  const { ip, userAgent } = await requestInfo();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(schema.sessions).values({
    id: sha256(token),
    userId,
    ip,
    userAgent,
    expiresAt,
    activeOrgId: opts.activeOrgId ?? null,
    mfaVerifiedAt: opts.mfaVerified ? new Date() : null,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export type SessionUser = typeof schema.users.$inferSelect;
export type CurrentSession = { session: typeof schema.sessions.$inferSelect; user: SessionUser };

/** Resolves the current session (cached per request). Sliding expiration, updated at most hourly. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const rows = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || row.user.disabledAt) return null;
  if (Date.now() - row.session.lastSeenAt.getTime() > 3600_000) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
    await db
      .update(schema.sessions)
      .set({ lastSeenAt: new Date(), expiresAt })
      .where(eq(schema.sessions.id, row.session.id));
  }
  return row;
});

export async function updateSession(values: Partial<Pick<typeof schema.sessions.$inferInsert, "activeOrgId" | "mfaVerifiedAt">>) {
  const s = await getSession();
  if (!s) return;
  await db.update(schema.sessions).set(values).where(eq(schema.sessions.id, s.session.id));
}
