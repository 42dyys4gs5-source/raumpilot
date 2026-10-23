import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, Clock3 } from "lucide-react";

export function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-xl animate-fade-up [animation-delay:180ms]">
      <div className="pointer-events-none absolute -inset-5 -z-10 animate-pulse-glow rounded-[3rem] bg-brand-200/50 blur-3xl" />
      <div className="overflow-hidden rounded-[2rem] border border-ink-200/80 bg-white shadow-lift transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_80px_-28px_rgba(10,58,49,0.36)]">
        <div className="group/image relative aspect-[4/3] overflow-hidden">
          <Image src="/media/raum-am-park.webp" alt="Illustration eines hellen Eventraums mit Holztischen und Blick ins Grüne" fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-brand-900 shadow-soft backdrop-blur transition group-hover/image:-translate-y-0.5">Ihr Raum verdient einen schönen Auftritt.</span>
          <div className="absolute bottom-4 right-4 animate-float-soft rounded-2xl border border-white/70 bg-white/95 p-3 shadow-lift backdrop-blur sm:p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-brand-900 sm:text-sm"><span className="grid size-6 place-items-center rounded-full bg-brand-100 text-brand-700"><Check className="size-3.5" /></span>Freie Zeiten direkt sichtbar</p>
            <p className="mt-2 flex items-center gap-1.5 pl-8 text-[11px] text-ink-500 sm:text-xs"><Clock3 className="size-3.5" />Beispiel-Buchungsseite</p>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-ink-500">Beispiel-Buchungsseite</p><h2 className="mt-1 text-xl font-semibold">Raum am Park</h2></div><CalendarCheck2 className="size-6 shrink-0 text-brand-700" /></div>
          <p className="mt-2 text-sm text-ink-600">Termin wählen. Preis sehen. Buchung ausprobieren.</p>
          <Link href="/demo" className="group/cta mt-5 flex items-center justify-between rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-soft">Demo ohne Anmeldung öffnen <ArrowRight className="size-5 transition-transform group-hover/cta:translate-x-1" /></Link>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-500">Fiktiver Beispielraum · KI-generiertes Raumbild</figcaption>
    </figure>
  );
}
