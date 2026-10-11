import { desc, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge, Card, PageHeader, Table } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/utils/dates";

export default async function OrgList({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const like = q ? `%${q.replace(/[%_]/g, "")}%` : null;
  const rows = await db
    .select({
      o: schema.organizations,
      rooms: sql<number>`(SELECT count(*)::int FROM rooms r WHERE r.org_id = ${schema.organizations.id} AND r.status = 'published')`,
      bookings: sql<number>`(SELECT count(*)::int FROM bookings b WHERE b.org_id = ${schema.organizations.id} AND b.status = 'confirmed')`,
    })
    .from(schema.organizations)
    .where(like ? or(ilike(schema.organizations.name, like), ilike(schema.organizations.contactEmail, like), ilike(schema.organizations.slug, like)) : undefined)
    .orderBy(desc(schema.organizations.createdAt))
    .limit(200);
  return (
    <>
      <PageHeader title="Vermieter" description={`${rows.length} angezeigt`} />
      <form className="mb-4"><Input name="q" defaultValue={q} placeholder="Name, E-Mail oder Adresse" className="max-w-sm" aria-label="Suche" /></form>
      <Card>
        <Table>
          <thead><tr><th>Vermieter</th><th>Tarif</th><th>Status</th><th>Räume online</th><th>Buchungen</th><th>Stripe</th><th>Seit</th></tr></thead>
          <tbody>
            {rows.map(({ o, rooms, bookings }) => (
              <tr key={o.id}>
                <td><Link href={`/admin/vermieter/${o.id}`} className="font-medium hover:underline">{o.name}</Link><div className="text-xs text-ink-400">{o.contactEmail}</div></td>
                <td>{o.planKey ?? "–"}</td>
                <td>{o.suspendedAt ? <Badge tone="red">gesperrt</Badge> : <Badge tone={["active", "trialing"].includes(o.subscriptionStatus) ? "green" : o.subscriptionStatus === "past_due" ? "amber" : "neutral"}>{o.subscriptionStatus}</Badge>}</td>
                <td>{rooms}</td>
                <td>{bookings}</td>
                <td>{o.stripeChargesEnabled ? <Badge tone="green">aktiv</Badge> : o.stripeAccountId ? <Badge tone="amber">Prüfung</Badge> : "–"}</td>
                <td className="text-xs">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
