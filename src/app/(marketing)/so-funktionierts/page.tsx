import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "So funktioniert's – Demo und Erklärvideo",
  description: "So vermieten Sie Ihren Raum mit Raumvia: Konto erstellen, Raum erfassen, Tarif wählen, Link teilen – und Buchungen inklusive Zahlung automatisch erhalten.",
  alternates: { canonical: appUrl("/so-funktionierts") },
};

const STEPS = [
  { t: "Konto erstellen", x: "Registrieren Sie sich mit Firma, Adresse und E-Mail. Nach der Bestätigung Ihrer E-Mail-Adresse startet der Einrichtungsassistent." },
  { t: "Raum erfassen", x: "Name, Kategorie, Kapazität und Preis genügen für den Start. Danach ergänzen Sie Fotos, Beschreibung, Ausstattung, buchbare Zeiten, Reinigungszeiten, Hausregeln und Stornierungsbedingungen." },
  { t: "Tarif wählen und veröffentlichen", x: "Wählen Sie Starter, Professional oder Business. Eine Checkliste zeigt, ob alles bereit ist. Mit einem Klick ist Ihr Raum online buchbar." },
  { t: "Onlinezahlung verbinden (optional)", x: "Verbinden Sie Ihr Stripe-Konto, damit Mieter bei der Buchung per Karte oder TWINT bezahlen. Ohne Stripe rechnen Sie per Rechnung oder vor Ort ab." },
  { t: "Link teilen", x: "Teilen Sie Ihren Buchungslink auf Google, Instagram, WhatsApp, per QR-Code oder betten Sie das Widget in Ihre Website ein." },
  { t: "Buchungen empfangen", x: "Kunden wählen Datum, Dauer und Zusatzleistungen, sehen sofort den Preis und buchen. Sie erhalten eine Benachrichtigung, der Kunde eine Bestätigung mit Kalendereintrag." },
];

export default function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="So funktioniert's" title="Vom Konto zur ersten Buchung" intro="Kein Programmieren, kein Webdesign. Wenn Sie Ihren Raum beschreiben können, können Sie ihn mit Raumvia vermieten." />
      <section id="video" className="container-page scroll-mt-24 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow">48 Sekunden · ohne Ton verständlich</p>
          <h2 className="mt-3 text-3xl font-semibold">Raumvia kurz erklärt</h2>
          <video controls playsInline preload="none" poster="/media/raumvia-erklaervideo-poster.jpg" width="1280" height="720" className="mt-6 aspect-video w-full rounded-2xl bg-brand-900 shadow-lift" aria-label="Raumvia Erklärvideo mit fiktiven Beispieldaten">
            <source src="/media/raumvia-erklaervideo.mp4" type="video/mp4" />
            <track kind="captions" src="/media/raumvia-erklaervideo.vtt" srcLang="de" label="Deutsch" />
            Ihr Browser unterstützt keine Videowiedergabe. <a href="/media/raumvia-erklaervideo.mp4">Video herunterladen</a>
          </video>
          <details className="mt-4 rounded-xl border border-ink-200 p-4 text-sm text-ink-600"><summary className="cursor-pointer font-medium text-ink-900">Videoinhalt als Text lesen</summary><div className="mt-3 space-y-3"><p>Raumvia hilft, freie Zeiten zu zeigen, Buchungen zu verwalten und Rückfragen zu reduzieren. Im fiktiven Raum am Park wählen Mietende Datum, Dauer und eine freie Startzeit.</p><p>Im Beispiel kosten zwei Stunden CHF 120 und der Beamer CHF 20, zusammen CHF 140. Vermietende entscheiden zwischen Sofortbuchung und Anfrage mit Freigabe.</p><p>Buchungen und Anfragen erscheinen in der Übersicht und im Kalender. Bestätigungen werden per E-Mail verschickt. Die Buchungsseite lässt sich per Link, QR-Code oder Website-Widget teilen.</p><p>Onlinezahlung ist optional über Ihr eigenes Stripe-Konto möglich. TWINT hängt vom Konto ab; Stripe-Gebühren können anfallen. Alternativ rechnen Sie per Rechnung oder vor Ort ab.</p><p>Die Demo funktioniert ohne Anmeldung und löst keine echte Buchung aus. Danach können Sie Ihren eigenen Raum einrichten.</p></div></details>
          <div className="mt-6"><ButtonLink href="/demo" size="lg">Jetzt selbst ausprobieren <ArrowRight /></ButtonLink></div>
        </div>
      </section>
      <section className="py-16">
        <ol className="container-page max-w-3xl space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-700 font-semibold text-white">{i + 1}</span>
              <div className="pt-1.5"><h2 className="text-lg font-semibold">{s.t}</h2><p className="mt-1 text-ink-600">{s.x}</p></div>
            </li>
          ))}
        </ol>
        <div className="container-page mt-14 max-w-3xl rounded-2xl border border-ink-200 p-6">
          <h2 className="text-lg font-semibold">Was Ihre Kundinnen und Kunden erleben</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-ink-700">
            <li>Raum anschauen: Fotos, Ausstattung, Preise, Hausregeln.</li>
            <li>Datum im Verfügbarkeitskalender wählen, Dauer und Startzeit festlegen.</li>
            <li>Personenzahl und Zusatzleistungen wählen, Preis live sehen.</li>
            <li>Kontaktdaten eingeben, Bedingungen akzeptieren.</li>
            <li>Online bezahlen oder Anfrage senden.</li>
            <li>Automatische Bestätigung mit Kalendereintrag und Link zum Stornieren oder Umbuchen erhalten.</li>
          </ol>
        </div>
        <div className="mt-12 text-center"><ButtonLink href="/registrieren" size="lg">Jetzt starten <ArrowRight /></ButtonLink></div>
      </section>
    </>
  );
}
