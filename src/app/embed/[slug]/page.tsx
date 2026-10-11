import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking/booking-widget";
import { PriceSummary, widgetProps } from "@/components/booking/room-public";
import { EmbedResizer } from "@/components/booking/embed-resizer";
import { getPublicRoom } from "@/lib/booking/public";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = { robots: { index: false } };

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getPublicRoom(slug);
  if (!d || d.room.status !== "published") notFound();
  return (
    <div className="bg-white p-4">
      <EmbedResizer />
      <h1 className="text-lg font-semibold">{d.room.name}</h1>
      <div className="mb-4 mt-1"><PriceSummary d={d} /></div>
      {d.bookable ? <BookingWidget {...widgetProps(d, true)} /> : <p className="text-sm text-amber-900">Dieser Raum ist derzeit nicht online buchbar.</p>}
      <p className="mt-4 text-center text-xs text-ink-400">
        <a href={appUrl(`/r/${d.room.slug}`)} target="_blank" rel="noopener" className="underline">Alle Details & Bedingungen</a>
        {!d.branding && <> · Buchungssystem von <a href={appUrl("/")} target="_blank" rel="noopener" className="underline">Raumvia</a></>}
      </p>
    </div>
  );
}
