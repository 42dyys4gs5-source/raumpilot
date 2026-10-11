import { env } from "@/lib/env";

/** Optional Cloudflare Turnstile bot protection. Without keys configured it is a no-op. */
export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

/** Honeypot + minimum fill time check for public forms. */
export function looksLikeBot(form: FormData): boolean {
  if (String(form.get("website_hp") ?? "").length > 0) return true;
  const started = Number(form.get("form_started") ?? 0);
  if (started && Date.now() - started < 1500) return true;
  return false;
}
