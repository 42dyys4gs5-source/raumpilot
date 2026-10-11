import { desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { Badge, Card, PageHeader, Table } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";

export default async function SecurityAdmin({ searchParams }: { searchParams: Promise<{ alle?: string }> }) {
  await requireAdmin();
  const { alle } = await searchParams;
  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(alle ? undefined : inArray(schema.auditLog.severity, ["warning", "critical"]))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(300);
  return (
    <>
      <PageHeader title="Sicherheitsereignisse" description="Fehlgeschlagene Anmeldungen, Sperren, Rollenänderungen, Exporte, Löschungen und Admin-Aktionen." actions={<Link href={alle ? "/admin/sicherheit" : "/admin/sicherheit?alle=1"} className="text-sm text-brand-700 hover:underline">{alle ? "Nur Warnungen" : "Alle Ereignisse"}</Link>} />
      <Card>
        <Table>
          <thead><tr><th>Zeit</th><th>Ereignis</th><th>Stufe</th><th>Benutzer</th><th>IP</th><th>Details</th></tr></thead>
          <tbody>{rows.map((a) => <tr key={a.id}><td className="text-xs">{formatDateTime(a.createdAt)}</td><td className="font-mono text-xs">{a.action}</td><td><Badge tone={a.severity === "critical" ? "red" : a.severity === "warning" ? "amber" : "neutral"}>{a.severity}</Badge></td><td className="font-mono text-[11px]">{a.userId?.slice(0, 8) ?? "–"}</td><td className="text-xs">{a.ip}</td><td className="max-w-xs truncate text-xs text-ink-500">{a.data ? JSON.stringify(a.data) : ""}</td></tr>)}</tbody>
        </Table>
      </Card>
    </>
  );
}
