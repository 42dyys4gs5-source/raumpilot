import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking/booking-widget";
import { Gallery, PriceSummary, RoomDetails, widgetProps } from "@/components/booking/room-public";
import { Logo } from "@/components/brand/logo";
import { getPublicRoom } from "@/lib/booking/public";
import { appUrl } from "@/lib/env";
import { CATEGORY_LABELS } from "@/lib/rooms/constants";
import { publicUrl } from "@/lib/storage";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const d = await getPublicRoom(slug);
  if (!d) return { title: "Raum nicht gefunden" };
  const title = `${d.room.name} mieten${d.room.city ? ` in ${d.room.city}` : ""} – ${CATEGORY_LABELS[d.room.category]}`;
  const description =
    d.room.shortDescription ||
    `${CATEGORY_LABELS[d.room.category]} für bis zu ${d.room.capacity} Personen${d.room.city ? ` in ${d.room.city}` : ""}. Verfügbarkeit prüfen und direkt online buchen bei ${d.org.name}.`;
  const img = d.photos[0] ? publicUrl(d.photos[0].path) : null;
  return {
    title,
    description,
    alternates: { canonical: appUrl(`/r/${d.room.slug}`) },
    robots: d.bookable ? undefined : { index: false },
    openGraph: { title, description, url: appUrl(`/r/${d.room.slug}`), images: img ? [{ url: img.startsWith("http") ? img : appUrl(img) }] : undefined },
  };
}

export default async function RoomPage({ params }: Params) {
  const { slug } = await params;
  const d = await getPublicRoom(slug);
  if (!d || (d.room.status !== "published")) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["eventraum", "partyraum", "seminarraum"].includes(d.room.category) ? "EventVenue" : "Place",
    name: d.room.name,
    description: d.room.shortDescription ?? undefined,
    url: appUrl(`/r/${d.room.slug}`),
    maximumAttendeeCapacity: d.room.capacity,
    image: d.photos.slice(0, 5).map((p) => { const u = publicUrl(p.path)!; return u.startsWith("http") ? u : appUrl(u); }),
    address: d.room.city ? { "@type": "PostalAddress", streetAddress: d.room.street ?? undefined, postalCode: d.room.postalCode ?? undefined, addressLocality: d.room.city, addressCountry: d.room.country } : undefined,
    amenityFeature: d.room.amenities.slice(0, 20).map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
  };
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href={`/v/${d.org.slug}`} className="flex items-center gap-3 font-display font-semibold text-ink-900">
            {d.branding && d.org.logoPath ? <img src={publicUrl(d.org.logoPath)!} alt={d.org.name} className="h-9 w-auto" /> : null}
            <span>{d.org.name}</span>
          </Link>
          {!d.branding && <span className="hidden text-xs text-ink-400 sm:block">Buchung über <Link href="/" className="underline">Raumvia</Link></span>}
        </div>
      </header>
      <main className="container-page py-6 sm:py-10">
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-500" aria-label="Brotkrumen">
          <Link href={`/v/${d.org.slug}`} className="hover:text-ink-800 hover:underline">{d.org.name}</Link> <ChevronRight className="size-3.5 text-ink-300" aria-hidden="true" /> <span className="text-ink-800">{d.room.name}</span>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{d.room.name}</h1>
        <p className="mt-1.5 text-ink-500">{CATEGORY_LABELS[d.room.category]}{d.room.city ? ` in ${d.room.city}` : ""}</p>
        <div className="mt-6"><Gallery d={d} /></div>
        <div className="mt-8 grid gap-10 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          <div className="order-2 min-w-0 lg:order-1"><RoomDetails d={d} /></div>
          <aside className="order-1 min-w-0 scroll-mt-20 lg:order-2" id="buchen">
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-lift sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold">{d.room.bookingMode === "request" ? "Anfrage stellen" : "Jetzt buchen"}</h2>
              <div className="mb-5 mt-1"><PriceSummary d={d} /></div>
              {d.bookable ? (
                <BookingWidget {...widgetProps(d)} />
              ) : (
                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Dieser Raum ist derzeit nicht online buchbar. Bitte kontaktieren Sie {d.org.name} direkt: <a href={`mailto:${d.org.contactEmail}`} className="underline">{d.org.contactEmail}</a></p>
              )}
            </div>
          </aside>
        </div>
      </main>
      <footer className="border-t border-ink-100 py-8">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 text-xs text-ink-500">
          <span>© {d.org.name}</span>
          <span className="flex items-center gap-3"><Link href="/rechtliches/datenschutz" className="hover:underline">Datenschutz</Link><Link href="/rechtliches/impressum" className="hover:underline">Impressum Plattform</Link>{!d.branding && <Logo className="scale-75 text-sm" />}</span>
        </div>
      </footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
