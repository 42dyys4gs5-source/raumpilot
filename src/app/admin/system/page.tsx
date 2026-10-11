import { desc, eq, sql } from "drizzle-orm";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader, Stat, Table } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";
import { jobAdminAction } from "../actions";

export default async function SystemAdmin() {
  await requireAdmin();
  const [[stats], failed, checks, events] = await Promise.all([
    db.execute<{ pending: number; due: number; failed: number; done24: number }>(sql`SELECT count(*) FILTER (WHERE status='pending')::int AS pending, count(*) FILTER (WHERE status='pending' AND run_at <= now())::int AS due, count(*) FILTER (WHERE status='failed')::int AS failed, count(*) FILTER (WHERE status='done' AND completed_at > now() - interval '1 day')::int AS done24 FROM jobs`),
    db.select().from(schema.jobs).where(eq(schema.jobs.status, "failed")).orderBy(desc(schema.jobs.createdAt)).limit(50),
    db.select().from(schema.systemChecks).orderBy(desc(schema.systemChecks.createdAt)).limit(20),
    db.select().from(schema.stripeEvents).orderBy(desc(schema.stripeEvents.receivedAt)).limit(30),
  ]);
  return (
    <>
      <PageHeader title="System & Hintergrundjobs" />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Jobs wartend" value={stats.pending} hint={`${stats.due} fällig`} />
        <Stat label="Erledigt (24 Std.)" value={stats.done24} />
        <Stat label="Fehlgeschlagen" value={stats.failed} />
        <Stat label="Letzte Systemprüfung" value={checks.find((c) => c.kind === "daily") ? (checks.find((c) => c.kind === "daily")!.ok ? "OK" : "Warnung") : "–"} />
      </div>
      {failed.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Fehlgeschlagene Jobs" />
          <Table><tbody>{failed.map((j) => <tr key={j.id}><td className="text-xs">{formatDateTime(j.createdAt)}</td><td className="font-mono text-xs">{j.type}</td><td className="max-w-md truncate text-xs text-red-700">{j.lastError}</td><td><ActionForm action={jobAdminAction} className="space-y-0"><input type="hidden" name="jobId" value={j.id} /><SubmitButton size="sm" variant="secondary">Erneut</SubmitButton></ActionForm></td></tr>)}</tbody></Table>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="System- und Sicherungsprüfungen" />
          <Table><tbody>{checks.map((c) => <tr key={c.id}><td className="text-xs">{formatDateTime(c.createdAt)}</td><td>{c.kind}</td><td>{c.ok ? <Badge tone="green">ok</Badge> : <Badge tone="red">Problem</Badge>}</td><td className="max-w-xs truncate text-xs text-ink-500">{JSON.stringify(c.details)}</td></tr>)}</tbody></Table>
          {checks.length === 0 && <CardBody><p className="text-sm text-ink-500">Noch keine Prüfungen gelaufen. Läuft der Cron-Job?</p></CardBody>}
        </Card>
        <Card>
          <CardHeader title="Stripe-Webhooks" />
          <Table><tbody>{events.map((e) => <tr key={e.id}><td className="text-xs">{formatDateTime(e.receivedAt)}</td><td className="font-mono text-xs">{e.type}</td><td>{e.processedAt ? <Badge tone="green">verarbeitet</Badge> : e.error ? <Badge tone="red">Fehler</Badge> : <Badge>offen</Badge>}</td></tr>)}</tbody></Table>
        </Card>
      </div>
    </>
  );
}
