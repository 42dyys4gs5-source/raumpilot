import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { requireOrg } from "@/lib/auth/guards";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/booking/labels";
import { db, schema } from "@/lib/db";
import { formatRange } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { customerNoteAction, deleteCustomerAction } from "../actions";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [c] = await db.select().from(schema.customers).where(and(eq(schema.customers.id, id), eq(schema.customers.orgId, ctx.org.id)));
  if (!c) notFound();
  const bookings = await db
    .select({ b: schema.bookings, room: schema.rooms.name, tz: schema.rooms.timezone })
    .from(schema.bookings)
    .innerJoin(schema.rooms, eq(schema.rooms.id, schema.bookings.roomId))
    .where(and(eq(schema.bookings.customerId, c.id), eq(schema.bookings.orgId, ctx.org.id)))
    .orderBy(desc(schema.bookings.startsAt));
  return (
    <>
      <PageHeader title={c.name} description={<a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Buchungen" />
          <Table>
            <thead><tr><th>Termin</th><th>Raum</th><th>Status</th><th className="text-right">Betrag</th></tr></thead>
            <tbody>
              {bookings.map(({ b, room, tz }) => (
                <tr key={b.id}>
                  <td><Link href={`/app/buchungen/${b.id}`} className="hover:underline">{formatRange(b.startsAt, b.endsAt, tz)}</Link></td>
                  <td>{room}</td>
                  <td><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></td>
                  <td className="text-right tabular-nums">{formatMoney(b.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Angaben & Notizen" />
            <CardBody>
              <ActionForm action={customerNoteAction}>
                <input type="hidden" name="customerId" value={c.id} />
                <Field label="Telefon" htmlFor="phone"><Input id="phone" name="phone" defaultValue={c.phone ?? ""} /></Field>
                <Field label="Firma" htmlFor="company"><Input id="company" name="company" defaultValue={c.company ?? ""} /></Field>
                <Field label="Interne Notizen" htmlFor="notes"><Textarea id="notes" name="notes" rows={4} defaultValue={c.notes ?? ""} /></Field>
                <SubmitButton variant="secondary">Speichern</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          {ctx.role !== "staff" && (
            <Card>
              <CardHeader title="Daten löschen" description="Auf Wunsch der Person (Recht auf Löschung). Buchungen bleiben für Ihre Buchhaltung anonymisiert erhalten." />
              <CardBody>
                <ActionForm action={deleteCustomerAction} confirm="Kundendaten unwiderruflich löschen bzw. anonymisieren?">
                  <input type="hidden" name="customerId" value={c.id} />
                  <SubmitButton variant="danger">Kundendaten löschen</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
