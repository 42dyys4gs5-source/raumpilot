/**
 * Richtet eine Supabase-Datenbank ausschliesslich über HTTPS ein (Supabase Management API),
 * z. B. aus Umgebungen ohne direkten Datenbank-Port. Mehrfach ausführbar.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_…  SUPABASE_PROJECT_REF=abcd…  SUPABASE_URL=https://abcd….supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_…  npx tsx scripts/supabase-api-setup.ts admin@raumvia.ch "Vorname Name"
 *
 * Schritte: Erweiterungen, Drizzle-Migrationen (kompatibel mit `npm run db:migrate`), Tarife,
 * Bucket «media» (öffentlich), Administrator, optional Betreiberangaben (OPERATOR_*).
 * Test gegen lokale DB: LOCAL_DATABASE_URL=postgres://… (statt Management API).
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { DEFAULT_PLANS } from "../src/config/plans";
import { hashPassword } from "../src/lib/auth/password";

const [adminEmail, adminName = "Administrator"] = process.argv.slice(2);
const local = process.env.LOCAL_DATABASE_URL ? postgres(process.env.LOCAL_DATABASE_URL, { max: 1, onnotice: () => {} }) : null;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!local && (!token || !ref)) throw new Error("SUPABASE_ACCESS_TOKEN und SUPABASE_PROJECT_REF fehlen.");

async function q<T = Record<string, unknown>>(query: string): Promise<T[]> {
  if (local) return (await local.unsafe(query)) as unknown as T[];
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL fehlgeschlagen (${res.status}): ${text.slice(0, 500)}`);
  return text ? (JSON.parse(text) as T[]) : [];
}
const lit = (s: string | null | undefined) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

// 1) Erweiterungen
await q(`CREATE EXTENSION IF NOT EXISTS citext; CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
console.log("✓ Erweiterungen");

// 2) Migrationen (gleiches Protokoll wie drizzle-orm/migrator)
await q(`CREATE SCHEMA IF NOT EXISTS drizzle; CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);`);
const [last] = await q<{ created_at: string | number }>(`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`);
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: { tag: string; when: number }[] };
let applied = 0;
for (const e of journal.entries) {
  if (last && Number(last.created_at) >= e.when) continue;
  const content = readFileSync(`drizzle/${e.tag}.sql`, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  const statements = content.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  await q(`BEGIN;\n${statements.map((s) => (s.endsWith(";") ? s : s + ";")).join("\n")}\nINSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${lit(hash)}, ${e.when});\nCOMMIT;`);
  applied++;
  console.log(`  ✓ ${e.tag}`);
}
console.log(`✓ Migrationen (${applied} neu)`);

// 3) Tarife
for (const p of DEFAULT_PLANS) {
  await q(`INSERT INTO plans (key, name, description, price_monthly, currency, max_rooms, max_locations, max_members, features, highlights, sort)
    VALUES (${lit(p.key)}, ${lit(p.name)}, ${lit(p.description)}, ${p.priceMonthly}, 'CHF', ${p.maxRooms}, ${p.maxLocations}, ${p.maxMembers},
    ${lit(JSON.stringify(p.features))}::jsonb, ARRAY[${p.highlights.map(lit).join(",")}]::text[], ${p.sort}) ON CONFLICT (key) DO NOTHING`);
}
console.log("✓ Tarife");

// 4) Speicher-Bucket
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers: Record<string, string> = { apikey: k, "Content-Type": "application/json", ...(k.startsWith("eyJ") ? { Authorization: `Bearer ${k}` } : {}) };
  const res = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: "media", name: "media", public: true, file_size_limit: 10 * 1024 * 1024, allowed_mime_types: ["image/webp"] }),
  });
  const body = await res.text();
  if (res.ok) console.log("✓ Bucket «media» angelegt");
  else if (/already exists|Duplicate/i.test(body)) console.log("✓ Bucket «media» vorhanden");
  else console.warn(`! Bucket konnte nicht angelegt werden (${res.status}): ${body.slice(0, 300)}`);
}

// 5) Betreiberangaben
if (process.env.OPERATOR_NAME) {
  const op = {
    name: process.env.OPERATOR_NAME, legalForm: process.env.OPERATOR_LEGAL_FORM ?? "Einzelunternehmen",
    street: process.env.OPERATOR_STREET ?? "", postalCode: process.env.OPERATOR_ZIP ?? "", city: process.env.OPERATOR_CITY ?? "",
    country: "Schweiz", email: process.env.OPERATOR_EMAIL ?? "info@raumvia.ch", phone: process.env.OPERATOR_PHONE ?? "",
    uid: process.env.OPERATOR_UID ?? "", vatNumber: "", representative: process.env.OPERATOR_REPRESENTATIVE ?? "", vatRegistered: false,
  };
  await q(`INSERT INTO platform_settings (key, value) VALUES ('operator', ${lit(JSON.stringify(op))}::jsonb) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()`);
  console.log("✓ Betreiberangaben");
}

// 6) Administrator
if (adminEmail) {
  const email = adminEmail.toLowerCase();
  const [u] = await q<{ id: string }>(`SELECT id FROM users WHERE email = ${lit(email)}`);
  if (u) {
    await q(`UPDATE users SET is_platform_admin = true, email_verified_at = coalesce(email_verified_at, now()) WHERE id = ${lit(u.id)}`);
    console.log(`✓ ${email} ist Administrator`);
  } else {
    const password = randomBytes(12).toString("base64url") + "A1!";
    await q(`INSERT INTO users (email, name, is_platform_admin, email_verified_at, password_hash) VALUES (${lit(email)}, ${lit(adminName)}, true, now(), ${lit(await hashPassword(password))})`);
    console.log(`✓ Administrator angelegt: ${email}\n  Einmaliges Passwort: ${password}`);
  }
}
if (local) await local.end();
