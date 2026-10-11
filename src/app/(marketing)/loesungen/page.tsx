import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { SOLUTIONS } from "@/content/solutions";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Branchenlösungen – Buchungssoftware für jeden Raumtyp",
  description: "Raumvia für Eventräume, Partyräume, Sitzungszimmer, Seminarräume, Fotostudios, Proberäume sowie Tanz- und Yogastudios.",
  alternates: { canonical: appUrl("/loesungen") },
};

export default function SolutionsIndex() {
  return (
    <>
      <PageHero eyebrow="Lösungen" title="Für jeden Raum die passende Buchungslogik" intro="Ob stundenweise Proberäume oder Eventlocations mit Anfragen: Raumvia passt sich an Ihre Art der Vermietung an." />
      <section className="py-16">
        <div className="container-page grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <Link key={s.slug} href={`/loesungen/${s.slug}`} className="group rounded-2xl border border-ink-200 p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
              <h2 className="text-lg font-semibold">{s.name}</h2>
              <p className="mt-2 text-sm text-ink-600">{s.intro.slice(0, 150)}…</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">Mehr erfahren <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
          <div className="rounded-2xl bg-ink-50 p-6 text-sm text-ink-600">Auch für Gemeinschaftsräume, Ateliers, Vereinslokale und Werkräume geeignet. Sie wählen beim Erfassen einfach die passende Kategorie.</div>
        </div>
      </section>
    </>
  );
}
