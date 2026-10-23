import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck2 } from "lucide-react";

export function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white shadow-lift">
        <div className="relative aspect-[4/3]">
          <Image src="/media/raum-am-park.webp" alt="Illustration eines hellen Eventraums mit Holztischen und Blick ins Grüne" fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-brand-900">Ihr Raum verdient einen schönen Auftritt.</span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-ink-500">Beispiel-Buchungsseite</p><h2 className="mt-1 text-xl font-semibold">Raum am Park</h2></div><CalendarCheck2 className="size-6 shrink-0 text-brand-700" /></div>
          <p className="mt-2 text-sm text-ink-600">Termin wählen. Preis sehen. Buchung ausprobieren.</p>
          <Link href="/demo" className="mt-5 flex items-center justify-between rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white transition hover:bg-brand-800">Demo ohne Anmeldung öffnen <ArrowRight className="size-5" /></Link>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-500">Fiktiver Beispielraum · KI-generiertes Raumbild</figcaption>
    </figure>
  );
}
