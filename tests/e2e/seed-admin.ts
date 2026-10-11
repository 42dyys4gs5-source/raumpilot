import { hashPassword } from "@/lib/auth/password";
import { db, schema, sql } from "@/lib/db";
import { encrypt } from "@/lib/security/crypto";

export const ADMIN = { email: "admin@raumvia.test", password: "Admin-Passwort-2026", totp: "JBSWY3DPEHPK3PXP" };

await db
  .insert(schema.users)
  .values({ email: ADMIN.email, name: "Plattform Admin", isPlatformAdmin: true, emailVerifiedAt: new Date(), passwordHash: await hashPassword(ADMIN.password), totpSecretEnc: encrypt(ADMIN.totp), totpEnabledAt: new Date() })
  .onConflictDoNothing();
await sql.end();
