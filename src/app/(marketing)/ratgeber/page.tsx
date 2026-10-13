import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { GUIDES } from "@/content/guides";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Ratgeber für Raumvermieter",
  description: "Praktische Leitfäden für die Vermietung von Party-, Event-, Seminar- und Proberäumen in der Schweiz: Preise, Kaution, Hausordnung, Kalender und Online-Buchung.",
  alternates: { canonical: appUrl("/ratgeber") },
};

const ORDER = ["Vermieten", "Preise & Geld", "Organisation"] as const;

export default function GuidesIndex() {
  return (
    <>
      <PageHero eyebrow="Ratgeber" title="Räume erfolgreich vermieten" intro="Praxiswissen für Vermieterinnen und Vermieter in der Schweiz – von der Preisfindung bis zur Hausordnung." />
      <section className="py-14">
        <div className="container-page grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {ORDER.map((c) => (
            <div key={c}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{c}</h2>
              <ul className="mt-3 space-y-3">
                {GUIDES.filter((g) => g.category === c).map((g) => (
                  <li key={g.slug}>
                    <Link href={`/ratgeber/${g.slug}`} className="block rounded-xl border border-ink-200 p-4 transition hover:shadow-soft">
                      <span className="font-medium text-ink-900">{g.title}</span>
                      <span className="mt-1 block text-sm text-ink-600">{g.description}</span>
                      <span className="mt-2 block text-xs text-ink-500">{g.readMinutes} Min. Lesezeit</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
