import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { and, asc, eq } from "drizzle-orm";
import { getOrgRoom } from "@/lib/rooms/service";
import { CATEGORY_LABELS, WEEKDAYS } from "@/lib/rooms/constants";
import { formatMoney } from "@/lib/utils/money";
import { publicUrl } from "@/lib/storage";
import { recordFunnelEvent } from "@/lib/admin/funnel";

export const metadata: Metadata = { title: "Private Vorschau", robots: { index: false, follow: false } };

export default async function RoomPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg("admin");
  const { id } = await params;
  const room = await getOrgRoom(ctx.org.id, id);
  if (!room) notFound();
  await recordFunnelEvent("funnel.private_preview_viewed", ctx.org.id, { roomId: room.id });
  const [photos, hours] = await Promise.all([
    db.select().from(schema.roomPhotos).where(and(eq(schema.roomPhotos.roomId, room.id), eq(schema.roomPhotos.orgId, ctx.org.id))).orderBy(asc(schema.roomPhotos.sort)),
    db.select().from(schema.roomOpeningHours).where(eq(schema.roomOpeningHours.roomId, room.id)).orderBy(asc(schema.roomOpeningHours.weekday)),
  ]);
  const hourLabel = room.hourlyPrice != null ? `${formatMoney(room.hourlyPrice)} pro Stunde` : "Preis folgt";
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
  const calendarOffset = (firstDay + 6) % 7;
  const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const weeks = Array.from({ length: Math.ceil((days + calendarOffset) / 7) }, (_, i) => i);
  const month = new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric" }).format(new Date());
  const openWeekdays = new Set(hours.map((h) => h.weekday % 7));

  return (
    <main className="min-h-dvh bg-ink-50 pb-12">
      <div className="sticky top-0 z-20 border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950">
        Private Vorschau · Nur Ihr Team kann diese Seite sehen. Buchungen und Zahlungen sind deaktiviert.
      </div>
      <div className="container-page py-6 sm:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500">So sehen Interessierte Ihre Buchungsseite</p>
          <ButtonLink href={`/app/raeume/${room.id}`} variant="secondary">Buchungsseite fertig einrichten</ButtonLink>
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{room.name}</h1>
        <p className="mt-2 flex items-center gap-2 text-ink-600"><span>{CATEGORY_LABELS[room.category]}</span>{room.city && <><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1"><MapPin className="size-4" />{room.city}</span></>}</p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {photos[0] ? <img src={publicUrl(photos[0].path)!} alt={photos[0].alt ?? room.name} className="h-56 w-full object-cover sm:h-80" /> : <div className="grid h-56 place-items-center bg-gradient-to-br from-brand-50 to-ink-100 text-sm text-ink-500 sm:h-80">{CATEGORY_LABELS[room.category]} · Ihr Foto erscheint hier</div>}
              {photos.length > 1 && <div className="grid grid-cols-4 gap-2 p-2">{photos.slice(1, 5).map((photo) => <img key={photo.id} src={publicUrl(photo.thumbPath)!} alt={photo.alt ?? room.name} className="h-20 w-full rounded-lg object-cover" />)}</div>}
            </div>
            <section className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold">Über den Raum</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-700">{room.description || room.shortDescription || "Ihre Beschreibung hilft Gästen, den passenden Raum zu finden. Sie können sie in der Einrichtung ergänzen."}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-ink-600"><span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-2"><Users className="size-4" />Bis {room.capacity} Personen</span>{room.city && <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-2"><MapPin className="size-4" />{room.city}</span>}</div>
            </section>
            <section className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold">Buchbare Zeiten</h2>
              <dl className="mt-3 divide-y divide-ink-100 text-sm">{WEEKDAYS.map((day) => {
                const windows = hours.filter((h) => h.weekday === day.n);
                return <div key={day.n} className="flex justify-between gap-4 py-2"><dt className="text-ink-500">{day.long}</dt><dd>{windows.length ? windows.map((w) => `${String(Math.floor(w.startMinute / 60)).padStart(2, "0")}:${String(w.startMinute % 60).padStart(2, "0")}–${String(Math.floor((w.endMinute % 1440) / 60)).padStart(2, "0")}:${String(w.endMinute % 60).padStart(2, "0")}`).join(", ") : "Geschlossen"}</dd></div>;
              })}</dl>
            </section>
          </section>
          <aside className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft sm:p-6">
              <h2 className="text-lg font-semibold">Preis</h2><p className="mt-2 text-2xl font-semibold text-brand-800">{hourLabel}</p>
              {room.halfDayPrice != null && <p className="mt-1 text-sm text-ink-600">Halbtag: {formatMoney(room.halfDayPrice)}</p>}
              {room.dayPrice != null && <p className="mt-1 text-sm text-ink-600">Ganzer Tag: {formatMoney(room.dayPrice)}</p>}
              <div className="mt-5 border-t border-ink-100 pt-4">
                <div className="flex items-center justify-between gap-2"><h3 className="font-medium">Verfügbarkeit</h3><CalendarDays className="size-4 text-brand-700" /></div>
                <p className="mt-1 text-sm capitalize text-ink-500">{month}</p>
                <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
                  {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <span key={d} className="py-1 font-medium text-ink-500">{d}</span>)}
                  {Array.from({ length: calendarOffset }, (_, i) => <span key={`blank-${i}`} />)}
                  {weeks.flatMap((week) => Array.from({ length: 7 }, (_, col) => week * 7 + col - calendarOffset + 1)).filter((d) => d >= 1 && d <= days).map((d) => <span key={d} className={`rounded-md py-1.5 ${openWeekdays.has(new Date(new Date().getFullYear(), new Date().getMonth(), d).getDay()) ? "bg-brand-50 text-brand-800" : "text-ink-300"}`}>{d}</span>)}
                </div>
                <p className="mt-2 text-xs text-ink-500">Vorschau Ihrer Öffnungstage. Konkrete freie Termine werden nach der Einrichtung angezeigt.</p>
              </div>
              <form className="mt-5 space-y-3" aria-label="Buchungsformular Vorschau">
                <label className="block text-sm font-medium" htmlFor="preview-date">Wunschtermin</label><input id="preview-date" type="date" disabled className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-500" />
                <label className="block text-sm font-medium" htmlFor="preview-duration">Dauer</label><select id="preview-duration" disabled className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-500"><option>Bitte zuerst einen Termin wählen</option></select>
                <button type="button" disabled className="w-full rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white opacity-60">Buchungsmaske inaktiv in der Vorschau</button>
              </form>
            </section>
            <ButtonLink href={`/app/raeume/${room.id}`} className="w-full justify-center">Buchungsseite fertig einrichten</ButtonLink>
          </aside>
        </div>
      </div>
    </main>
  );
}
