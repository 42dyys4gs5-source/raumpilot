/**
 * Erst-Einrichtung einer Produktionsdatenbank in einem Schritt:
 * Erweiterungen prüfen, Migrationen, Tarife, Administrator, optional Betreiberangaben.
 *
 *   DATABASE_URL=postgres://… ENCRYPTION_KEY=… APP_SECRET=… npx tsx scripts/setup-production.ts admin@raumvia.ch "Vorname Name"
 *
 * Betreiberangaben (optional, sonst später im Admin-Bereich):
 *   OPERATOR_NAME="Vorname Name, Raumvia" OPERATOR_LEGAL_FORM=Einzelunternehmen OPERATOR_STREET=… OPERATOR_ZIP=… OPERATOR_CITY=… OPERATOR_EMAIL=info@raumvia.ch
 */
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL fehlt.");
const [adminEmail, adminName = "Administrator"] = process.argv.slice(2);

const sql = postgres(url, { max: 1, onnotice: () => {} });
for (const ext of ["citext", "btree_gist", "pgcrypto"]) {
  try {
    await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS ${ext}`);
  } catch (e) {
    console.warn(`! Erweiterung ${ext} konnte nicht aktiviert werden (bitte im Supabase-Dashboard aktivieren): ${(e as Error).message}`);
  }
}
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
console.log("✓ Migrationen ausgeführt");

const { DEFAULT_PLANS } = await import("../src/config/plans");
for (const p of DEFAULT_PLANS) {
  await sql`INSERT INTO plans (key, name, description, price_monthly, currency, max_rooms, max_locations, max_members, features, highlights, sort)
            VALUES (${p.key}, ${p.name}, ${p.description}, ${p.priceMonthly}, 'CHF', ${p.maxRooms}, ${p.maxLocations}, ${p.maxMembers}, ${JSON.stringify(p.features)}::jsonb, ${p.highlights}::text[], ${p.sort})
            ON CONFLICT (key) DO NOTHING`;
}
console.log("✓ Tarife vorhanden");

if (process.env.OPERATOR_NAME) {
  const op = {
    name: process.env.OPERATOR_NAME,
    legalForm: process.env.OPERATOR_LEGAL_FORM ?? "Einzelunternehmen",
    street: process.env.OPERATOR_STREET ?? "",
    postalCode: process.env.OPERATOR_ZIP ?? "",
    city: process.env.OPERATOR_CITY ?? "",
    country: "Schweiz",
    email: process.env.OPERATOR_EMAIL ?? "info@raumvia.ch",
    phone: process.env.OPERATOR_PHONE ?? "",
    uid: process.env.OPERATOR_UID ?? "",
    vatNumber: "",
    representative: process.env.OPERATOR_REPRESENTATIVE ?? "",
    vatRegistered: false,
  };
  await sql`INSERT INTO platform_settings (key, value) VALUES ('operator', ${JSON.stringify(op)}::jsonb) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()`;
  console.log("✓ Betreiberangaben gespeichert");
}

if (adminEmail) {
  const { hashPassword } = await import("../src/lib/auth/password");
  const existing = await sql`SELECT id FROM users WHERE email = ${adminEmail.toLowerCase()}`;
  if (existing.length) {
    await sql`UPDATE users SET is_platform_admin = true, email_verified_at = coalesce(email_verified_at, now()) WHERE id = ${existing[0].id}`;
    console.log(`✓ ${adminEmail} ist Administrator`);
  } else {
    const password = randomBytes(12).toString("base64url") + "A1!";
    await sql`INSERT INTO users (email, name, is_platform_admin, email_verified_at, password_hash) VALUES (${adminEmail.toLowerCase()}, ${adminName}, true, now(), ${await hashPassword(password)})`;
    console.log(`✓ Administrator angelegt: ${adminEmail}\n  Einmaliges Passwort: ${password}\n  → Beim ersten Login 2FA einrichten und Passwort ändern.`);
  }
}
await sql.end();
