import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { HELP_ARTICLES } from "@/content/help";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Wissensdatenbank", description: "Anleitungen zu Raumvia: Einrichtung, Preise, Verfügbarkeit, Onlinezahlung, Stornierung, Kalender und Datenschutz.", alternates: { canonical: appUrl("/hilfe") } };

export default function HelpIndex() {
  const cats = [...new Set(HELP_ARTICLES.map((a) => a.category))];
  return (
    <>
      <PageHero eyebrow="Hilfe" title="Wissensdatenbank" intro="Schritt-für-Schritt-Anleitungen für Vermieterinnen und Vermieter." />
      <section className="py-14">
        <div className="container-page grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div key={c}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{c}</h2>
              <ul className="mt-3 space-y-3">
                {HELP_ARTICLES.filter((a) => a.category === c).map((a) => (
                  <li key={a.slug}><Link href={`/hilfe/${a.slug}`} className="block rounded-xl border border-ink-200 p-4 transition hover:shadow-soft"><span className="font-medium text-ink-900">{a.title}</span><span className="mt-1 block text-sm text-ink-600">{a.summary}</span></Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
