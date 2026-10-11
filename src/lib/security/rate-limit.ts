import { sql } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by Postgres – works across serverless instances
 * without additional infrastructure. Returns true if the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await sql<{ count: number }[]>`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_start END
    RETURNING count`;
  return rows[0].count <= limit;
}

export async function cleanupRateLimits() {
  await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
}
