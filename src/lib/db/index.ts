import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  var __rvSql: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection across hot reloads in development.
export const sql =
  globalThis.__rvSql ??
  postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: 20,
    // Supabase transaction pooler (port 6543) does not support prepared statements.
    prepare: !env.DATABASE_URL.includes(":6543"),
    onnotice: () => {},
  });
if (env.NODE_ENV !== "production") globalThis.__rvSql = sql;

export const db = drizzle(sql, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;
export { schema };
