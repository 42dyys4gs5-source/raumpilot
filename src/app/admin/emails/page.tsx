import { desc, ilike } from "drizzle-orm";
import { Badge, Card, PageHeader, Table } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";

export default async function EmailsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const rows = await db.select().from(schema.emailLog).where(q ? ilike(schema.emailLog.to, `%${q.replace(/[%_]/g, "")}%`) : undefined).orderBy(desc(schema.emailLog.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="E-Mail-Versand" description="Versandprotokoll (180 Tage). Inhalte werden in Produktion nicht gespeichert." />
      <form className="mb-4"><Input name="q" defaultValue={q} placeholder="Empfänger suchen" className="max-w-sm" aria-label="Empfänger" /></form>
      <Card>
        <Table>
          <thead><tr><th>Zeit</th><th>An</th><th>Vorlage</th><th>Betreff</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td className="text-xs">{formatDateTime(r.createdAt)}</td><td className="text-sm">{r.to}</td><td className="text-xs">{r.template}</td><td className="text-sm">{r.subject}</td><td><Badge tone={r.status === "sent" ? "green" : r.status === "failed" ? "red" : "neutral"}>{r.status}</Badge>{r.error && <div className="text-xs text-red-600">{r.error}</div>}</td></tr>)}</tbody>
        </Table>
      </Card>
    </>
  );
}
