import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { RoomRevenueCalculator } from "@/components/marketing/room-revenue-calculator";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Raum-Umsatzrechner: Potenzial einfach einschätzen",
  description: "Schätzen Sie den möglichen Umsatz Ihres Eventraums, Studios oder Sitzungszimmers mit transparenten Annahmen zu Preis, buchbaren Stunden und Auslastung.",
  alternates: { canonical: appUrl("/tools/raum-umsatzrechner") },
  openGraph: { title: "Was könnte Ihr Raum einnehmen?", description: "Kostenloser Raum-Umsatzrechner mit transparenten Auslastungsszenarien.", url: appUrl("/tools/raum-umsatzrechner") },
};

export default function RoomRevenuePage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: "Raumvia Raum-Umsatzrechner", applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "de-CH", offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" } };
  return (
    <>
      <section className="bg-ink-50/70 py-10 sm:py-16">
        <div className="container-page max-w-5xl">
          <p className="eyebrow inline-flex items-center gap-2"><Calculator className="size-4" /> Kostenloses Planungstool</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold sm:text-5xl">Welches Umsatzpotenzial hat Ihr Raum?</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">Rechnen Sie mit Ihrem eigenen Stundenpreis, Ihrer verfügbaren Zeit und Ihrer geschätzten Auslastung. Die Berechnung funktioniert ohne Anmeldung.</p>
        </div>
      </section>
      <section className="container-page max-w-5xl py-8 sm:py-12">
        <RoomRevenueCalculator />
      </section>
      <section className="bg-ink-50/70 py-10 sm:py-14">
        <div className="container-page max-w-5xl">
          <h2 className="text-2xl font-semibold">So lesen Sie die Schätzung</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ["Sie bestimmen die Annahmen", "Der Rechner nutzt nur Ihre Eingaben. Es fliessen keine erfundenen Branchen- oder Marktdaten ein."],
              ["Auslastung verändert das Ergebnis", "Die Szenarien zeigen, wie sich derselbe Preis und dieselbe Verfügbarkeit bei unterschiedlicher Auslastung auswirken."],
              ["Planungswert statt Versprechen", "Tatsächliche Einnahmen hängen von Nachfrage, Saison, Kosten und weiteren Faktoren ab."],
            ].map(([title, text]) => <li key={title} className="rounded-2xl border border-ink-200 bg-white p-5"><Check className="size-5 text-brand-700" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-600">{text}</p></li>)}
          </ul>
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div><h2 className="text-2xl font-semibold text-white">Raum online buchbar machen</h2><p className="mt-2 text-sm text-brand-100">Mit Raumvia erstellen Sie eine eigene Buchungsseite und behalten Verfügbarkeit und Anfragen im Blick.</p></div>
            <ButtonLink href="/registrieren" variant="accent" className="shrink-0">Mit Raumvia starten <ArrowRight /></ButtonLink>
          </div>
          <p className="mt-6 text-sm text-ink-500">Fragen zur Einrichtung? In der <Link href="/demo" className="text-brand-700 underline">Demo</Link> sehen Sie, wie Raumvia funktioniert.</p>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
