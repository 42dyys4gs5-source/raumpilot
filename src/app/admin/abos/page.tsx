import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Badge, Card, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

export default async function SubsPage() {
  await requireAdmin();
  const [subs, invoices] = await Promise.all([
    db.select({ s: schema.subscriptions, org: schema.organizations.name }).from(schema.subscriptions).innerJoin(schema.organizations, eq(schema.organizations.id, schema.subscriptions.orgId)).orderBy(desc(schema.subscriptions.updatedAt)).limit(200),
    db.select({ i: schema.invoices, org: schema.organizations.name, orgId: schema.organizations.id }).from(schema.invoices).innerJoin(schema.organizations, eq(schema.organizations.id, schema.invoices.orgId)).orderBy(desc(schema.invoices.createdAt)).limit(100),
  ]);
  return (
    <>
      <PageHeader title="Abos & Rechnungen" />
      <Card className="mb-6">
        <CardHeader title="Abonnemente" />
        <Table>
          <thead><tr><th>Vermieter</th><th>Tarif</th><th>Status</th><th>Betrag</th><th>Periode bis</th><th>Quelle</th></tr></thead>
          <tbody>{subs.map(({ s, org }) => <tr key={s.id}><td><Link href={`/admin/vermieter/${s.orgId}`} className="hover:underline">{org}</Link></td><td>{s.planKey}</td><td><Badge tone={s.status === "active" ? "green" : s.status === "past_due" ? "amber" : s.status === "trialing" ? "blue" : "neutral"}>{s.status}</Badge>{s.cancelAtPeriodEnd && <Badge tone="red" className="ml-1">gekündigt</Badge>}</td><td>{formatMoney(s.amountMonthly)}</td><td className="text-xs">{s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : "–"}</td><td>{s.source}</td></tr>)}</tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Rechnungen (Stripe)" />
        <Table>
          <thead><tr><th>Datum</th><th>Vermieter</th><th>Nummer</th><th>Betrag</th><th>Bezahlt</th><th>Status</th><th /></tr></thead>
          <tbody>{invoices.map(({ i, org, orgId }) => <tr key={i.id}><td className="text-xs">{formatDate(i.createdAt)}</td><td><Link href={`/admin/vermieter/${orgId}`} className="hover:underline">{org}</Link></td><td>{i.number}</td><td>{formatMoney(i.amountDue)}</td><td>{formatMoney(i.amountPaid)}</td><td><Badge tone={i.status === "paid" ? "green" : i.status === "open" ? "amber" : "neutral"}>{i.status}</Badge></td><td>{i.hostedInvoiceUrl && <a href={i.hostedInvoiceUrl} target="_blank" rel="noopener" className="text-brand-700 hover:underline">öffnen</a>}</td></tr>)}</tbody>
        </Table>
      </Card>
    </>
  );
}
