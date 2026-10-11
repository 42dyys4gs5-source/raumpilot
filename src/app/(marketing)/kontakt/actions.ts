"use server";

import { fail, success, type ActionState } from "@/lib/actions/types";
import { kickJobs } from "@/lib/jobs/kick";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestInfo } from "@/lib/security/request";
import { looksLikeBot, verifyTurnstile } from "@/lib/security/turnstile";
import { createTicket } from "@/lib/support/service";

export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ip } = await requestInfo();
  if (looksLikeBot(fd)) return success("Danke für Ihre Nachricht!");
  if (!(await rateLimit(`contact:${ip}`, 5, 3600))) return fail("Zu viele Nachrichten. Bitte versuchen Sie es später erneut.");
  if (!(await verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), ip))) return fail("Die Sicherheitsprüfung ist fehlgeschlagen.");
  const name = String(fd.get("name") ?? "").trim().slice(0, 100);
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const subject = String(fd.get("subject") ?? "").trim().slice(0, 150) || "Kontaktanfrage";
  const body = String(fd.get("message") ?? "").trim().slice(0, 5000);
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || body.length < 10) return fail("Bitte füllen Sie Name, E-Mail und Nachricht aus.");
  if (fd.get("privacy") !== "on") return fail("Bitte bestätigen Sie den Hinweis zum Datenschutz.");
  await createTicket({ category: "sales", name, email, subject, body });
  kickJobs();
  return success("Danke für Ihre Nachricht! Wir melden uns in der Regel innert 1–2 Arbeitstagen.");
}
