import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Users } from "lucide-react";
import Link from "next/link";
import { Alert, Card, EmptyState, PageHeader, Table } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; geloescht?: string }> }) {
  const ctx = await requireOrg();
  const sp = await searchParams;
  const q = sp.q ? `%${sp.q.replace(/[%_]/g, "")}%` : null;
  const rows = await db
    .select({
      c: schema.customers,
      n: sql<number>`count(${schema.bookings.id}) FILTER (WHERE ${schema.bookings.status} = 'confirmed')::int`,
      revenue: sql<number>`coalesce(sum(${schema.bookings.totalAmount}) FILTER (WHERE ${schema.bookings.status} = 'confirmed'),0)::int`,
      last: sql<Date | null>`max(${schema.bookings.startsAt})`,
    })
    .from(schema.customers)
    .leftJoin(schema.bookings, eq(schema.bookings.customerId, schema.customers.id))
    .where(and(eq(schema.customers.orgId, ctx.org.id), q ? or(ilike(schema.customers.name, q), ilike(schema.customers.email, q), ilike(schema.customers.company, q)) : undefined))
    .groupBy(schema.customers.id)
    .orderBy(desc(sql`max(${schema.bookings.startsAt})`))
    .limit(200);
  return (
    <>
      <PageHeader title="Kunden" description="Alle Personen und Firmen, die bei Ihnen gebucht haben." />
      {sp.geloescht && <Alert tone="success" className="mb-4">Die Kundendaten wurden gelöscht bzw. anonymisiert.</Alert>}
      <form className="mb-4" role="search"><Input name="q" defaultValue={sp.q} placeholder="Name, E-Mail oder Firma suchen" className="max-w-sm" aria-label="Kunden suchen" /></form>
      {rows.length === 0 ? <EmptyState icon={<Users />} title="Noch keine Kunden">Kunden werden automatisch mit der ersten Buchung angelegt.</EmptyState> : (
        <Card>
          <Table>
            <thead><tr><th>Name</th><th>Kontakt</th><th>Buchungen</th><th>Umsatz</th><th>Letzte Buchung</th></tr></thead>
            <tbody>
              {rows.map(({ c, n, revenue, last }) => (
                <tr key={c.id}>
                  <td><Link href={`/app/kunden/${c.id}`} className="font-medium text-ink-900 hover:underline">{c.name}</Link>{c.company && <div className="text-xs text-ink-400">{c.company}</div>}</td>
                  <td className="text-sm">{c.email}{c.phone && <div className="text-xs text-ink-400">{c.phone}</div>}</td>
                  <td>{n}</td>
                  <td className="tabular-nums">{formatMoney(revenue)}</td>
                  <td className="text-sm">{last ? formatDate(new Date(last)) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
