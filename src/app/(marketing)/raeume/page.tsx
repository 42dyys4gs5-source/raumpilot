import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { ACCESS_STATUSES } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { ROOM_CATEGORIES, type RoomCategory } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { CATEGORY_LABELS } from "@/lib/rooms/constants";
import { publicUrl } from "@/lib/storage";
import { formatMoney } from "@/lib/utils/money";

type SP = Promise<{ kategorie?: string; ort?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = ROOM_CATEGORIES.find((c) => c === sp.kategorie);
  return {
    title: cat ? `${CATEGORY_LABELS[cat]} mieten – online buchen` : "Räume mieten – Raumverzeichnis",
    description: "Buchbare Event-, Party-, Seminar- und Proberäume, Studios und Sitzungszimmer – Verfügbarkeit prüfen und direkt beim Vermieter online buchen.",
    alternates: { canonical: appUrl(cat ? `/raeume?kategorie=${cat}` : "/raeume") },
    robots: sp.ort ? { index: false } : undefined,
  };
}

export default async function DirectoryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const cat = ROOM_CATEGORIES.find((c) => c === sp.kategorie) as RoomCategory | undefined;
  const conds = [eq(schema.rooms.status, "published"), eq(schema.organizations.directoryOptIn, true), inArray(schema.organizations.subscriptionStatus, [...ACCESS_STATUSES])];
  if (cat) conds.push(eq(schema.rooms.category, cat));
  if (sp.ort) conds.push(ilike(schema.rooms.city, `%${sp.ort.replace(/[%_]/g, "").slice(0, 40)}%`));
  const rows = await db
    .select({ room: schema.rooms, org: schema.organizations.name, suspended: schema.organizations.suspendedAt })
    .from(schema.rooms)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.rooms.orgId))
    .where(and(...conds))
    .orderBy(asc(schema.rooms.city), asc(schema.rooms.name))
    .limit(120);
  const list = rows.filter((r) => !r.suspended);
  const photos = list.length ? await db.select().from(schema.roomPhotos).where(inArray(schema.roomPhotos.roomId, list.map((r) => r.room.id))).orderBy(asc(schema.roomPhotos.sort)) : [];
  return (
    <>
      <PageHero eyebrow="Raumverzeichnis" title={cat ? `${CATEGORY_LABELS[cat]} mieten` : "Räume finden und direkt buchen"} intro="Alle hier gelisteten Räume sind direkt beim Vermieter online buchbar. Vermieter entscheiden selbst, ob ihre Räume hier erscheinen.">
        <form className="mt-8 flex max-w-2xl flex-wrap gap-2" role="search">
          <select name="kategorie" defaultValue={cat ?? ""} className="h-11 rounded-lg bg-white px-3 text-sm ring-1 ring-ink-200" aria-label="Kategorie">
            <option value="">Alle Kategorien</option>
            {ROOM_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <input name="ort" defaultValue={sp.ort} placeholder="Ort, z. B. Zürich" className="h-11 flex-1 rounded-lg bg-white px-3 text-sm ring-1 ring-ink-200" aria-label="Ort" />
          <button className="h-11 rounded-lg bg-brand-700 px-5 text-sm font-medium text-white hover:bg-brand-800">Suchen</button>
        </form>
      </PageHero>
      <section className="py-14">
        <div className="container-page">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 p-10 text-center text-ink-600">
              <p className="font-medium text-ink-900">Für diese Suche sind noch keine Räume gelistet.</p>
              <p className="mt-1 text-sm">Sie vermieten selbst einen Raum? <Link href="/registrieren" className="text-brand-700 underline">Jetzt mit Raumvia online stellen.</Link></p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(({ room: r, org }) => {
                const cover = photos.find((p) => p.roomId === r.id);
                return (
                  <Link key={r.id} href={`/r/${r.slug}`} className="group overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft transition hover:shadow-lift">
                    <div className="aspect-[4/3] overflow-hidden bg-ink-100">{cover && <img src={publicUrl(cover.thumbPath)!} alt={cover.alt ?? r.name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />}</div>
                    <div className="p-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{CATEGORY_LABELS[r.category]}</p>
                      <h2 className="mt-1 font-semibold">{r.name}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-500"><span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{r.city}</span><span className="inline-flex items-center gap-1"><Users className="size-3.5" />bis {r.capacity}</span></p>
                      <p className="mt-3 text-sm"><span className="font-medium text-ink-900">{r.hourlyPrice ? `ab ${formatMoney(r.hourlyPrice)}/Std.` : r.halfDayPrice ? `ab ${formatMoney(r.halfDayPrice)}/Halbtag` : r.dayPrice ? `ab ${formatMoney(r.dayPrice)}/Tag` : ""}</span> <span className="text-ink-400">· {org}</span></p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
