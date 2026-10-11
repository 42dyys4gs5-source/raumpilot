import { and, asc, desc, eq, gte, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { requireOrg } from "@/lib/auth/guards";
import { PAYMENT_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/booking/labels";
import { db, schema } from "@/lib/db";
import { listOrgRooms } from "@/lib/rooms/service";
import { formatRange } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

const FILTERS = [
  { key: "anstehend", label: "Anstehend" },
  { key: "offen", label: "Offene Anfragen" },
  { key: "vergangen", label: "Vergangen" },
  { key: "storniert", label: "Storniert/abgelaufen" },
  { key: "alle", label: "Alle" },
];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string; raum?: string; seite?: string }> }) {
  const ctx = await requireOrg();
  const sp = await searchParams;
  const f = sp.f ?? "anstehend";
  const page = Math.max(1, Number(sp.seite) || 1);
  const now = new Date();
  const conds: SQL[] = [eq(schema.bookings.orgId, ctx.org.id)];
  if (f === "anstehend") conds.push(gte(schema.bookings.endsAt, now), inArray(schema.bookings.status, ["confirmed", "awaiting_payment", "pending_payment", "requested"]));
  if (f === "offen") conds.push(eq(schema.bookings.status, "requested"));
  if (f === "vergangen") conds.push(lt(schema.bookings.endsAt, now), eq(schema.bookings.status, "confirmed"));
  if (f === "storniert") conds.push(inArray(schema.bookings.status, ["cancelled", "declined", "expired"]));
  if (sp.raum && /^[0-9a-f-]{36}$/.test(sp.raum)) conds.push(eq(schema.bookings.roomId, sp.raum));
  if (sp.q) {
    const q = `%${sp.q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(schema.bookings.customerName, q), ilike(schema.bookings.customerEmail, q), ilike(schema.bookings.reference, q))!);
  }
  const pageSize = 50;
  const rows = await db
    .select({ b: schema.bookings, roomName: schema.rooms.name, tz: schema.rooms.timezone })
    .from(schema.bookings)
    .innerJoin(schema.rooms, eq(schema.rooms.id, schema.bookings.roomId))
    .where(and(...conds))
    .orderBy(f === "anstehend" || f === "offen" ? asc(schema.bookings.startsAt) : desc(schema.bookings.startsAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const rooms = await listOrgRooms(ctx.org.id, { includeArchived: true });
  const qs = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ f, q: sp.q, raum: sp.raum, ...o }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader title="Buchungen" actions={<ButtonLink href="/app/buchungen/neu"><Plus /> Buchung erfassen</ButtonLink>} />
      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((x) => (
          <Link key={x.key} href={qs({ f: x.key, seite: undefined })} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", f === x.key ? "bg-brand-700 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50")}>{x.label}</Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input type="hidden" name="f" value={f} />
        <Input name="q" defaultValue={sp.q} placeholder="Name, E-Mail oder Buchungsnummer" className="max-w-xs" aria-label="Suche" />
        <Select name="raum" defaultValue={sp.raum ?? ""} className="max-w-xs" aria-label="Raum">
          <option value="">Alle Räume</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <button className="h-10 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-ink-200 hover:bg-ink-50">Filtern</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="Keine Buchungen gefunden">Sobald Kunden buchen, erscheinen die Buchungen hier. Sie können auch selbst Buchungen erfassen, z. B. telefonische Reservationen.</EmptyState>
      ) : (
        <Card>
          <Table>
            <thead><tr><th>Termin</th><th>Raum</th><th>Kunde</th><th>Status</th><th>Zahlung</th><th className="text-right">Betrag</th></tr></thead>
            <tbody>
              {rows.slice(0, pageSize).map(({ b, roomName, tz }) => (
                <tr key={b.id} className="cursor-pointer">
                  <td><Link href={`/app/buchungen/${b.id}`} className="font-medium text-ink-900 hover:underline">{formatRange(b.startsAt, b.endsAt, tz)}</Link><div className="text-xs text-ink-400">{b.reference}{b.calendarConflict && <span className="ml-2 text-red-600">Kalenderkonflikt</span>}</div></td>
                  <td>{roomName}</td>
                  <td>{b.customerName}<div className="text-xs text-ink-400">{b.customerEmail}</div></td>
                  <td><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></td>
                  <td className="text-xs">{PAYMENT_LABEL[b.paymentStatus]}</td>
                  <td className="text-right tabular-nums">{formatMoney(b.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? <Link href={qs({ seite: String(page - 1) })} className="text-brand-700 hover:underline">← Zurück</Link> : <span />}
        {rows.length > pageSize && <Link href={qs({ seite: String(page + 1) })} className="text-brand-700 hover:underline">Weiter →</Link>}
      </div>
    </>
  );
}
