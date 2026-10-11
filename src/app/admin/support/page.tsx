import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge, Card, PageHeader, Table } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";

export default async function SupportAdmin() {
  await requireAdmin();
  const tickets = await db.select().from(schema.supportTickets).orderBy(desc(schema.supportTickets.createdAt)).limit(200);
  return (
    <>
      <PageHeader title="Supportanfragen" />
      <Card>
        <Table>
          <thead><tr><th>Eingang</th><th>Von</th><th>Betreff</th><th>Kategorie</th><th>Status</th></tr></thead>
          <tbody>{tickets.map((t) => <tr key={t.id}><td className="text-xs">{formatDateTime(t.createdAt)}</td><td>{t.name}<div className="text-xs text-ink-400">{t.email}</div></td><td><Link href={`/admin/support/${t.id}`} className="font-medium hover:underline">{t.subject}</Link>{t.priority === "high" && <Badge tone="amber" className="ml-1">priorisiert</Badge>}</td><td>{t.category}</td><td><Badge tone={t.status === "open" ? "amber" : t.status === "answered" ? "green" : "neutral"}>{t.status}</Badge></td></tr>)}</tbody>
        </Table>
      </Card>
    </>
  );
}
