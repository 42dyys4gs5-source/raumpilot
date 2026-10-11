"use server";

import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { kickJobs } from "@/lib/jobs/kick";
import { rateLimit } from "@/lib/security/rate-limit";
import { createTicket } from "@/lib/support/service";

export async function ticketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg();
  if (!(await rateLimit(`ticket:${ctx.user.id}`, 10, 3600))) return fail("Zu viele Anfragen. Bitte später erneut.");
  const subject = String(fd.get("subject") ?? "").trim().slice(0, 150);
  const body = String(fd.get("body") ?? "").trim().slice(0, 5000);
  if (subject.length < 3 || body.length < 10) return fail("Bitte Betreff und eine kurze Beschreibung angeben.");
  const category = (["support", "billing", "privacy"] as const).find((c) => c === fd.get("category")) ?? "support";
  await createTicket({ orgId: ctx.org.id, userId: ctx.user.id, category, name: ctx.user.name, email: ctx.user.email, subject, body, priority: ctx.plan?.features.prioritySupport ? "high" : "normal" });
  kickJobs();
  revalidatePath("/app/support");
  return success("Danke! Ihre Anfrage ist eingegangen. Sie erhalten eine Bestätigung per E-Mail.");
}
