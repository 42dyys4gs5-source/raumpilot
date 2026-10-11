import { and, asc, eq, inArray } from "drizzle-orm";
import { MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Logo } from "@/components/brand/logo";
import { activePlan } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { CATEGORY_LABELS } from "@/lib/rooms/constants";
import { publicUrl } from "@/lib/storage";
import { formatMoney } from "@/lib/utils/money";

const load = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, slug));
  if (!org) return null;
  const rooms = await db.select().from(schema.rooms).where(and(eq(schema.rooms.orgId, org.id), eq(schema.rooms.status, "published"))).orderBy(asc(schema.rooms.name));
  const photos = rooms.length ? await db.select().from(schema.roomPhotos).where(inArray(schema.roomPhotos.roomId, rooms.map((r) => r.id))).orderBy(asc(schema.roomPhotos.sort)) : [];
  const plan = await activePlan(org);
  return { org, rooms, photos, branding: !!plan?.features.branding };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await load((await params).slug);
  if (!d) return { title: "Nicht gefunden" };
  return {
    title: `${d.org.name} – Räume online buchen`,
    description: d.org.about?.slice(0, 160) || `Räume von ${d.org.name}${d.org.city ? ` in ${d.org.city}` : ""} – Verfügbarkeit prüfen und online buchen.`,
    alternates: { canonical: appUrl(`/v/${d.org.slug}`) },
    robots: d.rooms.length ? undefined : { index: false },
  };
}

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = await load((await params).slug);
  if (!d) notFound();
  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="bg-white">
        <div className="container-page py-10">
          {d.branding && d.org.logoPath && <img src={publicUrl(d.org.logoPath)!} alt="" className="mb-4 h-14 w-auto" />}
          <h1 className="text-3xl font-semibold">{d.org.name}</h1>
          {d.org.city && <p className="mt-1 flex items-center gap-1 text-ink-500"><MapPin className="size-4" /> {d.org.city}</p>}
          {d.org.about && <p className="mt-4 max-w-2xl whitespace-pre-line text-ink-700">{d.org.about}</p>}
        </div>
      </header>
      <main className="container-page py-10">
        {d.rooms.length === 0 ? (
          <p className="text-ink-500">Derzeit sind keine Räume online buchbar.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {d.rooms.map((r) => {
              const cover = d.photos.find((p) => p.roomId === r.id);
              return (
                <Link key={r.id} href={`/r/${r.slug}`} className="group overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft transition hover:shadow-lift">
                  <div className="aspect-[4/3] overflow-hidden bg-ink-100">
                    {cover && <img src={publicUrl(cover.thumbPath)!} alt={cover.alt ?? r.name} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />}
                  </div>
                  <div className="p-5">
                    <h2 className="font-semibold">{r.name}</h2>
                    <p className="mt-1 text-sm text-ink-500">{CATEGORY_LABELS[r.category]} · <Users className="inline size-3.5" /> bis {r.capacity}</p>
                    <p className="mt-3 text-sm font-medium text-brand-800">{r.hourlyPrice ? `ab ${formatMoney(r.hourlyPrice)}/Std.` : r.halfDayPrice ? `ab ${formatMoney(r.halfDayPrice)}/Halbtag` : r.dayPrice ? `ab ${formatMoney(r.dayPrice)}/Tag` : ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <p className="mt-12 text-sm text-ink-600">Kontakt: <a href={`mailto:${d.org.contactEmail}`} className="text-brand-700 underline">{d.org.contactEmail}</a>{d.org.phone ? ` · ${d.org.phone}` : ""}</p>
      </main>
      {!d.branding && <footer className="pb-10 text-center text-xs text-ink-400"><span className="inline-flex items-center gap-2">Online-Buchung mit <Logo className="text-sm" /></span></footer>}
    </div>
  );
}
