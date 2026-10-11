/**
 * Creates (or promotes) a platform administrator.
 * Usage: npm run admin:create -- admin@example.ch "Vorname Name"
 * A random initial password is printed once; on first login the admin must set up 2FA.
 */
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { db, schema, sql } from "@/lib/db";

const [email, name = "Administrator"] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("Bitte E-Mail angeben: npm run admin:create -- admin@example.ch \"Name\"");
  process.exit(1);
}
const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
if (existing) {
  await db.update(schema.users).set({ isPlatformAdmin: true, emailVerifiedAt: existing.emailVerifiedAt ?? new Date() }).where(eq(schema.users.id, existing.id));
  console.log(`✓ ${email} ist jetzt Administrator. Beim nächsten Login wird 2FA verlangt.`);
} else {
  const password = randomBytes(12).toString("base64url") + "A1!";
  await db.insert(schema.users).values({ email: email.toLowerCase(), name, isPlatformAdmin: true, emailVerifiedAt: new Date(), passwordHash: await hashPassword(password) });
  console.log(`✓ Administrator angelegt: ${email}\n  Einmaliges Passwort: ${password}\n  Bitte nach dem ersten Login ändern. 2FA wird beim ersten Login eingerichtet.`);
}
await sql.end();
