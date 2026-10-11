import { env } from "@/lib/env";
import { safeEqual } from "./crypto";

export function isCronAuthorized(req: Request): boolean {
  const h = req.headers.get("authorization") ?? "";
  return safeEqual(h, `Bearer ${env.CRON_SECRET}`);
}
