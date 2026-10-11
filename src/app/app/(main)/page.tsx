import { and, asc, count, eq, gte, inArray, lt } from "drizzle-orm";
import { ArrowRight, CalendarCheck2, CheckCircle2, Circle, Inbox, Wallet } from "lucide-react";
import Link from "next/link";
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { requireOrg } from "@/lib/auth/guards";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/booking/labels";
import { db, schema } from "@/lib/db";
import { listOrgRooms } from "@/lib/rooms/service";
import { orgStats } from "@/lib/stats";
import { formatRange } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

export default async function Overview({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const ctx = await requireOrg();
  const { fehler } = await searchParams;
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400_000);
  const [rooms, upcoming, [requests], [week], stats] = await Promise.all([
    listOrgRooms(ctx.org.id),
    db.select({ b: schema.bookings, room: schema.rooms.name, tz: schema.rooms.timezone }).from(schema.bookings).innerJoin(schema.rooms, eq(schema.rooms.id, schema.bookings.roomId))
      .where(and(eq(schema.bookings.orgId, ctx.org.id), gte(schema.bookings.endsAt, now), inArray(schema.bookings.status, ["confirmed", "requested", "awaiting_payment"]))).orderBy(asc(schema.bookings.startsAt)).limit(8),
    db.select({ n: count() }).from(schema.bookings).where(and(eq(schema.bookings.orgId, ctx.org.id), eq(schema.bookings.status, "requested"))),
    db.select({ n: count() }).from(schema.bookings).where(and(eq(schema.bookings.orgId, ctx.org.id), eq(schema.bookings.status, "confirmed"), gte(schema.bookings.startsAt, now), lt(schema.bookings.startsAt, in7))),
    orgStats(ctx.org.id, ctx.org.timezone),
  ]);
  const published = rooms.filter((r) => r.status === "published").length;
  const checklist = [
    { done: rooms.length > 0, label: "Ersten Raum erfassen", href: "/app/raeume/neu" },
    { done: !!ctx.plan, label: "Tarif wählen", href: "/app/abonnement" },
    { done: published > 0, label: "Raum veröffentlichen", href: rooms[0] ? `/app/raeume/${rooms[0].id}?tab=veroeffentlichen` : "/app/raeume" },
    { done: ctx.org.stripeChargesEnabled, label: "Onlinezahlung einrichten (optional)", href: "/app/einnahmen" },
  ];
  const setupDone = checklist.slice(0, 3).every((c) => c.done);

  return (
    <>
      <PageHeader title={`Grüezi ${ctx.user.name.split(" ")[0]}`} description={ctx.org.name} />
      {fehler === "berechtigung" && <Alert tone="warning" className="mb-4">Für diese Seite fehlt Ihnen die Berechtigung.</Alert>}
      {!setupDone && (
        <Card className="mb-6 border-brand-200 bg-brand-50/40">
          <CardHeader title="Einrichtung abschliessen" description="Noch wenige Schritte, bis Ihr Raum online buchbar ist." />
          <CardBody>
            <ul className="grid gap-2 sm:grid-cols-2">
              {checklist.map((c) => (
                <li key={c.label}><Link href={c.href} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-ink-200 hover:ring-brand-400">
                  {c.done ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4 text-ink-300" />}
                  <span className={c.done ? "text-ink-500 line-through" : "font-medium"}>{c.label}</span>
                  {!c.done && <ArrowRight className="ml-auto size-4 text-ink-400" />}
                </Link></li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Offene Anfragen" value={requests.n} icon={<Inbox />} hint={requests.n ? <Link href="/app/buchungen?f=offen" className="text-brand-700 hover:underline">Jetzt beantworten</Link> : "Alles erledigt"} />
        <Stat label="Buchungen nächste 7 Tage" value={week.n} icon={<CalendarCheck2 />} />
        <Stat label="Umsatz diesen Monat" value={formatMoney(stats.thisMonth.revenue)} icon={<Wallet />} hint={`Vormonat ${formatMoney(stats.lastMonth.revenue)}`} />
        <Stat label="Räume online" value={`${published} / ${rooms.length}`} hint={ctx.plan ? `Tarif ${ctx.plan.name}` : "Kein aktiver Tarif"} />
      </div>
      <Card>
        <CardHeader title="Nächste Buchungen" action={<ButtonLink href="/app/kalender" variant="ghost" size="sm">Kalender <ArrowRight /></ButtonLink>} />
        {upcoming.length === 0 ? <CardBody><p className="text-sm text-ink-500">Keine anstehenden Buchungen.{published === 0 ? " Veröffentlichen Sie einen Raum und teilen Sie Ihren Buchungslink." : ""}</p></CardBody> : (
          <ul className="divide-y divide-ink-100">
            {upcoming.map(({ b, room, tz }) => (
              <li key={b.id}>
                <Link href={`/app/buchungen/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-ink-50 sm:px-6">
                  <span className="min-w-56 text-sm font-medium">{formatRange(b.startsAt, b.endsAt, tz)}</span>
                  <span className="text-sm text-ink-600">{b.customerName} · {room}</span>
                  <span className="ml-auto"><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
