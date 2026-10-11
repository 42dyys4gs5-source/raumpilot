import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Funktionen – Buchungsseite, Kalender, Onlinezahlung",
  description: "Alle Funktionen von Raumvia: Buchungsseite mit Preisrechner, Echtzeit-Kalender ohne Doppelbuchungen, Anfragen, Onlinezahlung mit TWINT, automatische E-Mails, iCal-Abgleich, Team und Statistiken.",
  alternates: { canonical: appUrl("/funktionen") },
};

const GROUPS = [
  { title: "Buchungsseite", text: "Ihre Räume professionell präsentiert – ohne eigene Website.", items: ["Fotogalerie mit automatischer Bildoptimierung", "Ausstattung, Kapazität, Lage und Hausregeln", "Verfügbarkeitskalender mit freien und ausgebuchten Tagen", "Preisrechner mit transparenten Zuschlägen", "Eigene Adresse, QR-Code und Website-Widget", "Mobil optimiert und barrierearm", "Optional im öffentlichen Raumverzeichnis"] },
  { title: "Buchungslogik", text: "Zuverlässig auch in Sonderfällen.", items: ["Keine Doppelbuchungen – auch bei gleichzeitigen Buchungen", "Stunden-, Halbtages-, Tages- und Mehrtagesbuchungen", "Mindest- und Maximaldauer, Vorlaufzeit, Buchungshorizont", "Vorbereitungs- und Reinigungszeiten", "Buchungen über Mitternacht und korrekte Zeitumstellung", "Sofortbuchung oder Anfrage mit Freigabe", "Sperrzeiten, Ferien und Betriebsschliessungen"] },
  { title: "Preise & Zahlung", text: "Vom Preis bis zur Rückerstattung automatisiert.", items: ["Wochenend-, Saison- und Randzeitenpreise (Professional)", "Zusatzleistungen pro Buchung, Stunde, Person oder Stück (Professional)", "Rabattcodes mit Gültigkeit und Limiten (Professional)", "Onlinezahlung per Karte und TWINT über Stripe", "Kaution vor Ort oder online, Teilrückerstattung per Klick", "Automatische Rückerstattung nach Stornoregeln", "Zahlungsbelege mit MWST-Ausweis, CSV-Export"] },
  { title: "Automatisierung", text: "Damit Sie sich um Ihre Gäste kümmern können.", items: ["Bestätigungen mit Kalendereintrag (.ics)", "Zahlungsbelege und Zahlungsfehler-Hinweise", "Erinnerung vor Mietbeginn (Professional)", "Selbstständige Stornierung und Umbuchung durch Kunden", "Verfall nicht beantworteter Anfragen und nicht bezahlter Reservationen", "Benachrichtigung bei neuen Buchungen und Stornierungen"] },
  { title: "Kalender", text: "Alle Termine an einem Ort.", items: ["Monats-, Wochen- und Tagesansicht über alle Räume", "Manuelle Buchungen, z. B. telefonische Reservationen", "Import externer Kalender (Google, Outlook, Airbnb …)", "Export in Google, Outlook und Apple Kalender", "Konfliktwarnung statt automatischer Stornierung"] },
  { title: "Verwaltung", text: "Für eine Person oder ein ganzes Team.", items: ["Kundenübersicht mit Buchungshistorie", "Umsatzstatistiken (Professional) und Auswertungen pro Raum (Business)", "Mehrere Standorte und Teamzugänge mit Rollen (Business)", "Eigenes Logo und Markenfarbe (Business)", "Zwei-Faktor-Anmeldung, Datenexport und Kontolöschung"] },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Funktionen" title="Durchdacht für die Raumvermietung" intro="Raumvia deckt den ganzen Ablauf ab: von der ersten Frage nach freien Terminen bis zum Zahlungsbeleg und zur Rückerstattung." />
      <section className="py-16">
        <div className="container-page grid gap-6 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className="rounded-2xl border border-ink-200 p-7">
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <p className="mt-1 text-ink-600">{g.text}</p>
              <ul className="mt-5 space-y-2.5">{g.items.map((i) => <li key={i} className="flex gap-2 text-sm text-ink-700"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{i}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="container-page mt-12 rounded-2xl bg-ink-50 p-6 text-sm text-ink-600">
          <strong className="text-ink-900">In Vorbereitung:</strong> direkte Zwei-Wege-Synchronisation mit Google- und Microsoft-Konten, Serienbuchungen, Anzahlungen sowie Französisch, Italienisch und Englisch. Bis dahin funktioniert der Kalenderabgleich zuverlässig per iCal.
        </div>
        <div className="mt-12 text-center"><ButtonLink href="/registrieren" size="lg">Jetzt ausprobieren <ArrowRight /></ButtonLink></div>
      </section>
    </>
  );
}
