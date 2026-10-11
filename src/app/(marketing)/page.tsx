import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CalendarSync,
  Check,
  CreditCard,
  Globe,
  Layers,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PlanCards } from "@/components/billing/plan-cards";
import { ProductPreview } from "@/components/marketing/product-preview";
import { BRAND } from "@/config/brand";
import { FAQ } from "@/content/faq";
import { SOLUTIONS } from "@/content/solutions";
import { listPlans } from "@/lib/billing/entitlements";
import { appUrl, env } from "@/lib/env";
import { vatNote } from "@/lib/settings";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} – Buchungssoftware für Raumvermietung in der Schweiz` },
  description:
    "Vermieten Sie Event-, Party-, Seminar- und Proberäume, Studios und Sitzungszimmer online: eigene Buchungsseite, Echtzeit-Kalender ohne Doppelbuchungen, Zahlung mit TWINT oder Karte und automatische Bestätigungen. Ab CHF 39.– pro Monat.",
  alternates: { canonical: appUrl("/") },
};

const FEATURES = [
  { icon: Globe, title: "Eigene Buchungsseite", text: "Fotos, Ausstattung, Preise und freie Termine auf einer schnellen, mobilen Seite – mit Link und QR-Code." },
  { icon: CalendarCheck2, title: "Echtzeit-Verfügbarkeit", text: "Freie Zeiten werden live berechnet. Doppelbuchungen sind technisch ausgeschlossen – auch wenn zwei gleichzeitig buchen." },
  { icon: CreditCard, title: "Onlinezahlung", text: "Karte oder TWINT über Ihr eigenes Stripe-Konto. Das Geld geht direkt an Sie." },
  { icon: BellRing, title: "Automatische E-Mails", text: "Bestätigung mit Kalendereintrag, Zahlungsbeleg, Erinnerung, Storno – ohne dass Sie etwas tun müssen." },
  { icon: Tag, title: "Flexible Preise", text: "Stunde, Halbtag, Tag, Wochenend- und Saisonzuschläge, Zusatzleistungen und Rabattcodes." },
  { icon: CalendarSync, title: "Kalender-Abgleich", text: "Externe Kalender importieren, Buchungen in Google, Outlook oder Apple Kalender anzeigen." },
  { icon: Layers, title: "Anfragen oder Sofortbuchung", text: "Sie entscheiden pro Raum, ob gebucht oder angefragt wird." },
  { icon: QrCode, title: "Widget für Ihre Website", text: "Buchungsformular mit zwei Zeilen Code auf jeder Website einbetten." },
];

export default async function Home() {
  const [plans, note] = await Promise.all([listPlans(), vatNote()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: BRAND.name, url: appUrl("/"), logo: appUrl("/icon.svg"), email: BRAND.salesEmail },
      {
        "@type": "SoftwareApplication",
        name: BRAND.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "de-CH",
        offers: plans.map((p) => ({ "@type": "Offer", name: p.name, price: (p.priceMonthly / 100).toFixed(2), priceCurrency: "CHF" })),
      },
    ],
  };
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,var(--color-brand-100),transparent_70%)]" />
        <div className="container-page grid items-center gap-14 pb-20 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-brand-200"><Sparkles className="size-4 text-accent-500" /> Buchungssoftware für Raumvermieter in der Schweiz</p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">Ihr Raum.<br />Online buchbar.<br /><span className="text-brand-700">Ohne Telefon-Pingpong.</span></h1>
            <p className="mt-6 max-w-xl text-lg text-ink-600">Raumvia gibt Ihrem Event-, Party-, Seminar- oder Proberaum eine eigene Buchungsseite mit Echtzeit-Kalender, Onlinezahlung und automatischen Bestätigungen. Eingerichtet in einer Viertelstunde.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/registrieren" size="lg">{env.TRIAL_DAYS > 0 ? `${env.TRIAL_DAYS} Tage kostenlos testen` : "Jetzt starten"} <ArrowRight /></ButtonLink>
              <ButtonLink href="/so-funktionierts" size="lg" variant="secondary">So funktioniert&apos;s</ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
              {["Ab CHF 39.– pro Monat", "Monatlich kündbar", "Keine Provision auf Buchungen"].map((x) => <li key={x} className="flex items-center gap-1.5"><Check className="size-4 text-brand-600" />{x}</li>)}
            </ul>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* Industries */}
      <section className="border-y border-ink-100 bg-ink-50/60 py-8">
        <div className="container-page flex flex-wrap items-center justify-center gap-2">
          <span className="mr-2 text-sm text-ink-500">Gemacht für</span>
          {SOLUTIONS.map((s) => <Link key={s.slug} href={`/loesungen/${s.slug}`} className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ink-700 ring-1 ring-ink-200 transition hover:text-brand-800 hover:ring-brand-300">{s.name}</Link>)}
        </div>
      </section>

      {/* Problem/solution */}
      <section className="py-20 lg:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">Weniger Abklärungen. Mehr gebuchte Stunden.</h2>
            <p className="mt-4 text-lg text-ink-600">«Ist der Samstag noch frei? Was kostet es mit Beamer? Wie bezahle ich?» – solche Fragen beantwortet Ihre Buchungsseite ab sofort selbst. Sie behalten die Kontrolle über Preise, Regeln und Anfragen.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Vorher", "Anfragen per Telefon, E-Mail und WhatsApp, Excel-Kalender, Einzahlungsscheine nachfassen."],
              ["Mit Raumvia", "Kunden sehen freie Termine, buchen und bezahlen selbst. Sie erhalten eine Benachrichtigung."],
              ["Vorher", "Doppelbelegungen, weil zwei Personen gleichzeitig zugesagt haben."],
              ["Mit Raumvia", "Die Datenbank verhindert Überschneidungen – inklusive Reinigungszeiten."],
            ].map(([t, x], i) => (
              <div key={i} className={`rounded-2xl p-5 ${t === "Vorher" ? "bg-ink-50 text-ink-600" : "bg-brand-50 text-brand-900 ring-1 ring-brand-100"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{t}</p>
                <p className="mt-2 text-sm">{x}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-ink-50/60 py-20 lg:py-28">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">Alles, was Vermieter wirklich brauchen</h2>
            <p className="mt-4 text-lg text-ink-600">Keine überladene Hotelsoftware, sondern genau die Funktionen für stunden- und tageweise Raumvermietung.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-ink-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><f.icon className="size-5" /></div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-600">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center"><ButtonLink href="/funktionen" variant="secondary">Alle Funktionen ansehen <ArrowRight /></ButtonLink></div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-28">
        <div className="container-page">
          <h2 className="text-center text-3xl font-semibold sm:text-4xl">In drei Schritten online</h2>
          <ol className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              ["Raum erfassen", "Fotos, Beschreibung, Preise und buchbare Zeiten eintragen. Der Assistent führt Sie durch."],
              ["Link teilen", "Buchungslink auf Website, Google, Instagram oder als QR-Code vor Ort teilen."],
              ["Buchungen erhalten", "Kunden buchen und bezahlen selbst. Sie sehen alles im Dashboard und Kalender."],
            ].map(([t, x], i) => (
              <li key={t} className="relative rounded-2xl border border-ink-200 p-6">
                <span className="font-display text-5xl font-bold text-brand-100">{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-ink-600">{x}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Payments & trust */}
      <section className="bg-brand-900 py-20 text-brand-50 lg:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Das Geld gehört Ihnen. Direkt.</h2>
            <p className="mt-4 text-lg text-brand-100">Mietzahlungen laufen über Ihr eigenes Stripe-Konto – per Karte oder TWINT. Raumvia ist nicht Zahlungsempfänger, verlangt keine Provision und hat keinen Zugriff auf Ihre Einnahmen.</p>
            <ul className="mt-6 space-y-3 text-brand-100">
              {["Automatische Rückerstattung nach Ihren Stornoregeln", "Reservation des Termins während der Zahlung", "Zahlungsbelege mit MWST-Ausweis", "Alternativ: Bezahlung per Rechnung oder vor Ort"].map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-5 shrink-0 text-accent-400" />{x}</li>)}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, t: "Datenschutz nach DSG", x: "Datensparsam, ohne Tracking-Cookies, mit Export- und Löschfunktion." },
              { icon: LockKeyhole, t: "Sicher", x: "Verschlüsselte Verbindungen, Zwei-Faktor-Login, Schutz vor automatisierten Angriffen." },
              { icon: CalendarCheck2, t: "Schweizer Alltag", x: "CHF, 5-Rappen-Rundung, MWST, Sommer- und Winterzeit, Schweizer Hochdeutsch." },
              { icon: BellRing, t: "Automatisiert", x: "Erinnerungen, Abläufe und Benachrichtigungen laufen im Hintergrund." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <c.icon className="size-6 text-accent-400" />
                <h3 className="mt-3 font-semibold text-white">{c.t}</h3>
                <p className="mt-1 text-sm text-brand-100">{c.x}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 lg:py-28" id="preise">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">Faire Preise, klare Leistungen</h2>
            <p className="mt-4 text-lg text-ink-600">Ein fixer Monatspreis. Keine Provision auf Ihre Buchungen.</p>
          </div>
          <div className="mt-12"><PlanCards plans={plans} hrefFor={(k) => `/registrieren?tarif=${k}`} ctaLabel="Kostenlos starten" vatNote={note} /></div>
        </div>
      </section>

      {/* FAQ excerpt */}
      <section className="bg-ink-50/60 py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="text-3xl font-semibold">Häufige Fragen</h2>
            <p className="mt-3 text-ink-600">Noch etwas unklar? <Link href="/kontakt" className="text-brand-700 underline">Schreiben Sie uns.</Link></p>
          </div>
          <div className="divide-y divide-ink-200 rounded-2xl border border-ink-200 bg-white">
            {FAQ.slice(0, 6).map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span className="text-ink-400 transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm text-ink-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Bereit für Ihre erste Onlinebuchung?</h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-100">Konto erstellen, Raum erfassen, Link teilen. Heute noch.</p>
            <ButtonLink href="/registrieren" size="lg" variant="accent" className="mt-8">Kostenlos starten <ArrowRight /></ButtonLink>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
