import { after } from "next/server";
import { runDueJobs } from "./worker";

/** Process freshly enqueued jobs right after the response is sent (fast e-mails); cron is the safety net. */
export function kickJobs() {
  try {
    after(async () => {
      try {
        await runDueJobs(10, 8_000);
      } catch (err) {
        console.error("[kickJobs]", err);
      }
    });
  } catch {
    // Outside a request scope (scripts/tests): the cron worker will pick the jobs up.
  }
}
