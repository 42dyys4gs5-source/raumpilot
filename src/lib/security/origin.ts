import { env } from "@/lib/env";

/** CSRF protection for JSON endpoints: require same-origin requests. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const expected = new URL(env.APP_URL).origin;
  if (origin) return origin === expected;
  const referer = req.headers.get("referer");
  return !!referer && new URL(referer).origin === expected;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}
