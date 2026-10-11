import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security/crypto";

type TokenType = "email_verify" | "password_reset";
const TTL: Record<TokenType, number> = { email_verify: 48 * 3600_000, password_reset: 60 * 60_000 };

export async function issueToken(userId: string, type: TokenType): Promise<string> {
  // Invalidate previous unused tokens of the same type.
  await db
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.authTokens.userId, userId), eq(schema.authTokens.type, type), isNull(schema.authTokens.usedAt)));
  const token = randomToken(32);
  await db.insert(schema.authTokens).values({
    userId,
    type,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + TTL[type]),
  });
  return token;
}

/** Atomically consumes a token. Returns the userId or null. */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const rows = await db
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.authTokens.tokenHash, sha256(token)),
        eq(schema.authTokens.type, type),
        isNull(schema.authTokens.usedAt),
        gt(schema.authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: schema.authTokens.userId });
  return rows[0]?.userId ?? null;
}

export async function peekToken(token: string, type: TokenType): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const rows = await db
    .select({ id: schema.authTokens.id })
    .from(schema.authTokens)
    .where(
      and(
        eq(schema.authTokens.tokenHash, sha256(token)),
        eq(schema.authTokens.type, type),
        isNull(schema.authTokens.usedAt),
        gt(schema.authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
