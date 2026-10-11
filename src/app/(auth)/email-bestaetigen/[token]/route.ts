import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { consumeToken } from "@/lib/auth/tokens";
import { db, schema } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { audit } from "@/lib/security/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const userId = await consumeToken(token, "email_verify");
  if (!userId) return NextResponse.redirect(appUrl("/email-bestaetigen?fehler=link"));
  await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, userId));
  await audit("user.email_verified", { userId });
  return NextResponse.redirect(appUrl("/app/onboarding"));
}
