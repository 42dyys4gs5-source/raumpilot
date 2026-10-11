import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { listOrgRooms } from "@/lib/rooms/service";
import { DEFAULT_TZ } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

type Entry = { id: string; kind: "booking" | "block"; start: DateTime; end: DateTime; title: string; sub: string; roomId: string | null; status?: string; href?: string };

const VIEWS = [
  { key: "monat", label: "Monat" },
  { key: "woche", label: "Woche" },
  { key: "tag", label: "Tag" },
] as const;

function tone(e: Entry) {
  if (e.kind === "block") return "bg-ink-100 text-ink-600 border-ink-300";
  if (e.status === "confirmed") return "bg-brand-50 text-brand-900 border-brand-500";
  return "bg-amber-50 text-amber-900 border-amber-500";
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ ansicht?: string; datum?: string; raum?: string }> }) {
  const ctx = await requireOrg();
  const sp = await searchParams;
  const tz = ctx.org.timezone || DEFAULT_TZ;
  const view = (VIEWS.find((v) => v.key === sp.ansicht)?.key ?? "monat") as "monat" | "woche" | "tag";
  const base = sp.datum && DateTime.fromISO(sp.datum, { zone: tz }).isValid ? DateTime.fromISO(sp.datum, { zone: tz }) : DateTime.now().setZone(tz);
  const rooms = await listOrgRooms(ctx.org.id);
  const roomFilter = sp.raum && rooms.some((r) => r.id === sp.raum) ? sp.raum : null;

  let from: DateTime, to: DateTime, prev: DateTime, next: DateTime, title: string;
  if (view === "monat") {
    from = base.startOf("month").startOf("week");
    to = base.endOf("month").endOf("week").plus({ milliseconds: 1 });
    prev = base.minus({ months: 1 });
    next = base.plus({ months: 1 });
    title = base.setLocale("de-CH").toFormat("LLLL yyyy");
  } else if (view === "woche") {
    from = base.startOf("week");
    to = from.plus({ weeks: 1 });
    prev = base.minus({ weeks: 1 });
    next = base.plus({ weeks: 1 });
    title = `${from.setLocale("de-CH").toFormat("d. LLL")} – ${to.minus({ days: 1 }).setLocale("de-CH").toFormat("d. LLL yyyy")}`;
  } else {
    from = base.startOf("day");
    to = from.plus({ days: 1 });
    prev = base.minus({ days: 1 });
    next = base.plus({ days: 1 });
    title = base.setLocale("de-CH").toFormat("cccc, d. LLLL yyyy");
  }

  const roomIds = roomFilter ? [roomFilter] : rooms.map((r) => r.id);
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const [bookings, blocks] = roomIds.length
    ? await Promise.all([
        db.select().from(schema.bookings).where(and(eq(schema.bookings.orgId, ctx.org.id), inArray(schema.bookings.roomId, roomIds), inArray(schema.bookings.status, ["confirmed", "requested", "awaiting_payment", "pending_payment"]), lt(schema.bookings.startsAt, to.toJSDate()), gt(schema.bookings.endsAt, from.toJSDate()))),
        db.select().from(schema.roomBlocks).where(and(eq(schema.roomBlocks.orgId, ctx.org.id), or(inArray(schema.roomBlocks.roomId, roomIds), isNull(schema.roomBlocks.roomId)), lt(schema.roomBlocks.startsAt, to.toJSDate()), gt(schema.roomBlocks.endsAt, from.toJSDate()))),
      ])
    : [[], []];
  const entries: Entry[] = [
    ...bookings.map((b) => ({ id: b.id, kind: "booking" as const, start: DateTime.fromJSDate(b.startsAt, { zone: tz }), end: DateTime.fromJSDate(b.endsAt, { zone: tz }), title: b.customerName, sub: roomName.get(b.roomId) ?? "", roomId: b.roomId, status: b.status, href: `/app/buchungen/${b.id}` })),
    ...blocks.map((x) => ({ id: x.id, kind: "block" as const, start: DateTime.fromJSDate(x.startsAt, { zone: tz }), end: DateTime.fromJSDate(x.endsAt, { zone: tz }), title: x.reason || "Gesperrt", sub: x.roomId ? (roomName.get(x.roomId) ?? "") : "Alle Räume", roomId: x.roomId, href: "/app/verfuegbarkeit" })),
  ].sort((a, b) => a.start.toMillis() - b.start.toMillis());

  const on = (day: DateTime) => entries.filter((e) => e.start < day.endOf("day") && e.end > day.startOf("day"));
  const link = (o: Record<string, string | undefined>) => "/app/kalender?" + new URLSearchParams(Object.entries({ ansicht: view, datum: base.toISODate()!, raum: roomFilter ?? undefined, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  const today = DateTime.now().setZone(tz).toISODate();

  return (
    <>
      <PageHeader title="Buchungskalender" actions={<><ButtonLink href="/app/verfuegbarkeit" variant="secondary">Zeit sperren</ButtonLink><ButtonLink href={`/app/buchungen/neu?datum=${base.toISODate()}${roomFilter ? `&raum=${roomFilter}` : ""}`}><Plus /> Buchung</ButtonLink></>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Link href={link({ datum: prev.toISODate()! })} className="rounded-lg p-2 hover:bg-white" aria-label="Zurück"><ChevronLeft className="size-5" /></Link>
          <Link href={link({ datum: DateTime.now().setZone(tz).toISODate()! })} className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-ink-200 hover:bg-white">Heute</Link>
          <Link href={link({ datum: next.toISODate()! })} className="rounded-lg p-2 hover:bg-white" aria-label="Weiter"><ChevronRight className="size-5" /></Link>
        </div>
        <h2 className="text-lg font-semibold capitalize">{title}</h2>
        <div className="ml-auto flex flex-wrap gap-2">
          <div className="flex rounded-lg bg-white p-0.5 ring-1 ring-ink-200">
            {VIEWS.map((v) => <Link key={v.key} href={link({ ansicht: v.key })} className={cn("rounded-md px-3 py-1.5 text-sm", view === v.key ? "bg-brand-700 text-white" : "text-ink-600 hover:bg-ink-50")}>{v.label}</Link>)}
          </div>
          <form className="flex gap-2">
            <input type="hidden" name="ansicht" value={view} /><input type="hidden" name="datum" value={base.toISODate()!} />
            <select name="raum" defaultValue={roomFilter ?? ""} className="h-9 rounded-lg bg-white px-2 text-sm ring-1 ring-ink-200" aria-label="Raum filtern">
              <option value="">Alle Räume</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="h-9 rounded-lg bg-white px-3 text-sm ring-1 ring-ink-200">OK</button>
          </form>
        </div>
      </div>

      {view === "monat" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50 text-center text-xs font-medium text-ink-500">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {Array.from({ length: Math.round(to.diff(from, "days").days) }, (_, i) => from.plus({ days: i })).map((day) => {
              const list = on(day);
              const inMonth = day.month === base.month;
              return (
                <div key={day.toISODate()} className={cn("min-h-24 border-b border-r border-ink-100 p-1.5 sm:min-h-28", !inMonth && "bg-ink-50/60")}>
                  <Link href={link({ ansicht: "tag", datum: day.toISODate()! })} className={cn("inline-grid size-6 place-items-center rounded-full text-xs", day.toISODate() === today ? "bg-brand-700 font-semibold text-white" : inMonth ? "text-ink-700 hover:bg-ink-100" : "text-ink-400")}>{day.day}</Link>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((e) => (
                      <Link key={e.id + day.toISODate()} href={e.href ?? "#"} className={cn("block truncate rounded border-l-2 px-1 py-0.5 text-[11px] leading-tight", tone(e))} title={`${e.start.toFormat("HH:mm")}–${e.end.toFormat("HH:mm")} ${e.title} · ${e.sub}`}>
                        <span className="hidden sm:inline">{e.start.toFormat("HH:mm")} </span>{e.title}
                      </Link>
                    ))}
                    {list.length > 3 && <Link href={link({ ansicht: "tag", datum: day.toISODate()! })} className="block px-1 text-[11px] text-ink-500">+{list.length - 3} weitere</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "woche" && (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => from.plus({ days: i })).map((day) => (
            <Card key={day.toISODate()} className={cn("p-3", day.toISODate() === today && "ring-2 ring-brand-500")}>
              <Link href={link({ ansicht: "tag", datum: day.toISODate()! })} className="text-sm font-semibold capitalize hover:underline">{day.setLocale("de-CH").toFormat("ccc d.M.")}</Link>
              <div className="mt-2 space-y-1.5">
                {on(day).length === 0 && <p className="text-xs text-ink-400">frei</p>}
                {on(day).map((e) => (
                  <Link key={e.id} href={e.href ?? "#"} className={cn("block rounded-md border-l-2 px-2 py-1 text-xs", tone(e))}>
                    <span className="font-medium tabular-nums">{e.start.toFormat("HH:mm")}–{e.end.toFormat("HH:mm")}</span>
                    <span className="block truncate">{e.title}</span>
                    <span className="block truncate text-[11px] opacity-70">{e.sub}</span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {view === "tag" && (
        <Card className="overflow-x-auto">
          <div className="grid min-w-[600px]" style={{ gridTemplateColumns: `56px repeat(${Math.max(1, roomFilter ? 1 : rooms.length)}, minmax(160px, 1fr))` }}>
            <div className="border-b border-ink-100" />
            {(roomFilter ? rooms.filter((r) => r.id === roomFilter) : rooms).map((r) => <div key={r.id} className="truncate border-b border-l border-ink-100 px-2 py-2 text-sm font-semibold">{r.name}</div>)}
            <div className="relative" style={{ height: 24 * 40 }}>
              {Array.from({ length: 24 }, (_, h) => <div key={h} className="absolute right-2 text-[11px] text-ink-400" style={{ top: h * 40 - 6 }}>{h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}</div>)}
            </div>
            {(roomFilter ? rooms.filter((r) => r.id === roomFilter) : rooms).map((r) => (
              <div key={r.id} className="relative border-l border-ink-100" style={{ height: 24 * 40, backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 39px, #eef1f0 39px 40px)" }}>
                {entries.filter((e) => (e.roomId === r.id || e.roomId === null) && e.start < to && e.end > from).map((e) => {
                  const s = Math.max(0, e.start.diff(from, "minutes").minutes);
                  const en = Math.min(1440, e.end.diff(from, "minutes").minutes);
                  return (
                    <Link key={e.id} href={e.href ?? "#"} className={cn("absolute inset-x-1 overflow-hidden rounded-md border-l-2 px-2 py-1 text-xs", tone(e))} style={{ top: (s / 60) * 40, height: Math.max(20, ((en - s) / 60) * 40 - 2) }}>
                      <span className="font-medium tabular-nums">{e.start.toFormat("HH:mm")}–{e.end.toFormat("HH:mm")}</span> {e.title}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1"><span className="size-3 rounded-sm border-l-2 border-brand-500 bg-brand-50" /> bestätigt</span>
        <span className="inline-flex items-center gap-1"><span className="size-3 rounded-sm border-l-2 border-amber-500 bg-amber-50" /> Anfrage / Zahlung offen</span>
        <span className="inline-flex items-center gap-1"><span className="size-3 rounded-sm border-l-2 border-ink-300 bg-ink-100" /> gesperrt / externer Termin</span>
      </p>
    </>
  );
}
