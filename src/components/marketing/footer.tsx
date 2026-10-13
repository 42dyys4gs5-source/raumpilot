import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/config/brand";

const COLS = [
  { title: "Produkt", links: [["/funktionen", "Funktionen"], ["/preise", "Preise"], ["/so-funktionierts", "So funktioniert's"], ["/raeume", "Raumverzeichnis"], ["/registrieren", "Kostenlos testen"]] },
  { title: "Lösungen", links: [["/loesungen/eventraeume", "Eventräume"], ["/loesungen/partyraeume", "Partyräume"], ["/loesungen/sitzungszimmer", "Sitzungszimmer"], ["/loesungen/seminarraeume", "Seminarräume"], ["/loesungen/fotostudios", "Fotostudios"], ["/loesungen/proberaeume", "Proberäume"], ["/loesungen/tanzstudios", "Tanzstudios"], ["/loesungen/gemeinschaftsraeume", "Vereinslokale"]] },
  { title: "Hilfe", links: [["/faq", "Häufige Fragen"], ["/ratgeber", "Ratgeber"], ["/hilfe", "Wissensdatenbank"], ["/kontakt", "Kontakt"], ["/login", "Anmelden"]] },
  { title: "Rechtliches", links: [["/rechtliches/impressum", "Impressum"], ["/rechtliches/datenschutz", "Datenschutz"], ["/rechtliches/agb", "AGB"], ["/rechtliches/nutzungsbedingungen", "Nutzungsbedingungen"], ["/rechtliches/auftragsbearbeitung", "Auftragsbearbeitung"]] },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-600">{BRAND.tagline} Buchungssoftware für Raumvermieter in der Schweiz.</p>
          <p className="mt-4 text-sm text-ink-600"><a href={`mailto:${BRAND.salesEmail}`} className="font-medium text-ink-800 hover:text-brand-700 hover:underline">{BRAND.salesEmail}</a></p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h2 className="text-sm font-semibold text-ink-900">{c.title}</h2>
            <ul className="mt-3 space-y-2">{c.links.map(([href, label]) => <li key={href}><Link href={href} className="text-sm text-ink-600 transition-colors hover:text-brand-700">{label}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200">
        <div className="container-page flex flex-wrap justify-between gap-2 py-5 text-xs text-ink-500">
          <span>© {new Date().getFullYear()} {BRAND.name}. Alle Preise in CHF.</span>
          <span>Entwickelt in der Schweiz · ohne Tracking-Cookies</span>
        </div>
      </div>
    </footer>
  );
}
