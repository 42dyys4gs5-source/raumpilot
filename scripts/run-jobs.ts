import { sql } from "@/lib/db";
import { runDueJobs, schedulePeriodic } from "@/lib/jobs/worker";

await schedulePeriodic();
console.log(await runDueJobs(50, 55_000));
await sql.end();
