import { execSync } from "node:child_process";
import postgres from "postgres";
import { E2E_ENV } from "../../playwright.config";

export default async function globalSetup() {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1, onnotice: () => {} });
  const tables = await sql<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  if (tables.length) await sql.unsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await sql.end();
  const env = { ...process.env, ...E2E_ENV, NODE_ENV: "test" } as NodeJS.ProcessEnv;
  execSync("npx tsx scripts/migrate.ts", { env, stdio: "inherit" });
  execSync("npx tsx scripts/seed-plans.ts", { env, stdio: "inherit" });
  execSync("npx tsx tests/e2e/seed-admin.ts", { env, stdio: "inherit" });
}
