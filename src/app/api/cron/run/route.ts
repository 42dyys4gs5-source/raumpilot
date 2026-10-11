import { NextResponse } from "next/server";
import { runDueJobs, schedulePeriodic } from "@/lib/jobs/worker";
import { isCronAuthorized } from "@/lib/security/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called every few minutes by Vercel Cron or GitHub Actions (Authorization: Bearer CRON_SECRET). */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await schedulePeriodic();
  const stats = await runDueJobs(25, 50_000);
  return NextResponse.json({ ok: true, ...stats });
}
