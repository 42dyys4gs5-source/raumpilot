import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CalendarSync,
  Check,
  ChevronDown,
  CreditCard,
  Globe,
  Layers,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
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

const BEFORE = [
  "Anfragen per Telefon, E-Mail und WhatsApp",
  "Termine im Excel-Kalender nachführen",
  "Einzahlungsscheine nachfassen",
  "Doppelbelegungen, weil zwei Personen gleichzeitig zugesagt haben",
];
const AFTER = [
  "Kunden sehen freie Termine, buchen und bezahlen selbst",
  "Sie erhalten automatisch eine Benachrichtigung",
  "Bestätigungen und Belege gehen von selbst raus",
  "Die Datenbank verhindert Überschneidungen – inklusive Reinigungszeiten",
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
        <div className="container-page grid items-center gap-12 pb-16 pt-10 sm:gap-14 sm:pb-20 sm:pt-12 lg:grid-cols-[1.2fr_1fr] lg:pb-28 lg:pt-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-800 shadow-soft ring-1 ring-brand-200/70 backdrop-blur sm:text-sm"><Sparkles className="size-4 shrink-0 text-accent-500" /> Buchungssoftware für Raumvermieter in der Schweiz</p>
            <h1 className="mt-6 text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">Ihr Raum.<br />Online buchbar.<br /><span className="text-brand-700 xl:whitespace-nowrap">Ohne Telefon-Pingpong.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">Raumvia gibt Ihrem Event-, Party-, Seminar- oder Proberaum eine eigene Buchungsseite mit Echtzeit-Kalender, Onlinezahlung und automatischen Bestätigungen. Schritt für Schritt eingerichtet – ohne eigene Website programmieren zu müssen.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/registrieren" size="lg">{env.TRIAL_DAYS > 0 ? `${env.TRIAL_DAYS} Tage kostenlos testen` : "Jetzt starten"} <ArrowRight /></ButtonLink>
              <ButtonLink href="/demo" size="lg" variant="secondary">Demo ausprobieren</ButtonLink>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
              {["Ab CHF 39.– pro Monat", "Monatlich kündbar", "Keine Provision auf Buchungen"].map((x) => <li key={x} className="flex items-center gap-1.5"><Check className="size-4 text-brand-600" />{x}</li>)}
            </ul>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* Industries */}
      <section className="border-y border-ink-100 bg-ink-50/60 py-6 sm:py-8">
        <div className="container-page flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
          <span className="text-sm text-ink-500 sm:mr-2">Gemacht für</span>
          {/* Mobile: one swipeable row instead of four wrapped lines */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {SOLUTIONS.map((s) => <Link key={s.slug} href={`/loesungen/${s.slug}`} className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ink-700 ring-1 ring-ink-200 transition hover:text-brand-800 hover:ring-brand-300">{s.name}</Link>)}
          </div>
        </div>
      </section>

      <section className="container-page py-12 sm:py-16">
        <div className="grid overflow-hidden rounded-3xl bg-brand-900 text-white lg:grid-cols-2">
          <div className="p-7 sm:p-10"><p className="text-sm font-medium text-brand-200">In 48 Sekunden erklärt</p><h2 className="mt-3 text-3xl font-semibold">Vom freien Raum zur übersichtlichen Buchung.</h2><p className="mt-4 leading-relaxed text-brand-100">Sehen Sie, wie Gäste einen Termin auswählen und wie Sie Buchungen im Blick behalten. Mit einem Beispiel statt langer Erklärungen.</p><Link href="/so-funktionierts#video" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-brand-900 hover:bg-brand-50">Erklärvideo ansehen <ArrowRight className="size-4" /></Link></div>
          <Link href="/so-funktionierts#video" className="relative block min-h-56 bg-brand-50" aria-label="Erklärvideo: Raumvia in 48 Sekunden"><img src="/media/raumvia-erklaervideo-poster.jpg" width="1280" height="720" loading="lazy" alt="Vorschau des Raumvia-Erklärvideos" className="h-full w-full object-contain" /></Link>
        </div>
      </section>

      {/* Problem/solution */}
      <section className="py-16 sm:py-20 lg:py-28">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div>
            <p className="eyebrow">Warum Raumvia</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Weniger Abklärungen. Mehr gebuchte Stunden.</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">«Ist der Samstag noch frei? Was kostet es mit Beamer? Wie bezahle ich?» – solche Fragen beantwortet Ihre Buchungsseite ab sofort selbst. Sie behalten die Kontrolle über Preise, Regeln und Anfragen.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-ink-50 p-6 ring-1 ring-ink-100">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Vorher</p>
              <ul className="mt-4 space-y-3 text-sm text-ink-600">
                {BEFORE.map((x) => <li key={x} className="flex gap-2.5"><X className="mt-0.5 size-4 shrink-0 text-ink-400" />{x}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100">
              <p className="eyebrow">Mit Raumvia</p>
              <ul className="mt-4 space-y-3 text-sm text-brand-900">
                {AFTER.map((x) => <li key={x} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{x}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-ink-50/60 py-16 sm:py-20 lg:py-28">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Funktionen</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Alles, was Vermieter wirklich brauchen</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">Keine überladene Hotelsoftware, sondern genau die Funktionen für stunden- und tageweise Raumvermietung.</p>
          </div>
          <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-ink-200/80 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift sm:block sm:p-6">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"><f.icon className="size-5" /></div>
                <div>
                  <h3 className="font-semibold sm:mt-4">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600 sm:mt-2">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center"><ButtonLink href="/funktionen" variant="secondary">Alle Funktionen ansehen <ArrowRight /></ButtonLink></div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 lg:py-28">
        <div className="container-page">
          <p className="eyebrow text-center">So einfach geht&apos;s</p>
          <h2 className="mt-3 text-center text-3xl font-semibold sm:text-4xl">In drei Schritten online</h2>
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 md:grid-cols-3 md:gap-6">
            {[
              ["Raum erfassen", "Fotos, Beschreibung, Preise und buchbare Zeiten eintragen. Der Assistent führt Sie durch."],
              ["Link teilen", "Buchungslink auf Website, Google, Instagram oder als QR-Code vor Ort teilen."],
              ["Buchungen erhalten", "Kunden buchen und bezahlen selbst. Sie sehen alles im Dashboard und Kalender."],
            ].map(([t, x], i) => (
              <li key={t} className="relative flex gap-4 rounded-2xl border border-ink-200 bg-white p-5 md:block md:p-6 md:text-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-700 font-display text-base font-semibold text-white shadow-sm ring-4 ring-brand-50 md:mx-auto">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold md:mt-4">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600 md:mt-2">{x}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Payments & trust */}
      <section className="bg-brand-900 py-16 text-brand-50 sm:py-20 lg:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="eyebrow text-accent-400">Zahlungen & Sicherheit</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Das Geld gehört Ihnen. Direkt.</h2>
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
      <section className="scroll-mt-20 py-16 sm:py-20 lg:py-28" id="preise">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Preise</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Faire Preise, klare Leistungen</h2>
            <p className="mt-4 text-lg text-ink-600">Ein fixer Monatspreis. Keine Provision auf Ihre Buchungen.</p>
          </div>
          <div className="mt-10 sm:mt-12"><PlanCards plans={plans} hrefFor={(k) => `/registrieren?tarif=${k}`} ctaLabel="Kostenlos starten" vatNote={note} /></div>
        </div>
      </section>

      {/* FAQ excerpt */}
      <section className="bg-ink-50/60 py-16 sm:py-20">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold">Häufige Fragen</h2>
            <p className="mt-3 text-ink-600">Noch etwas unklar? <Link href="/kontakt" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">Schreiben Sie uns.</Link></p>
            <Link href="/faq" className="mt-4 hidden items-center gap-1 text-sm font-medium text-brand-700 hover:underline lg:inline-flex">Alle Fragen ansehen <ArrowRight className="size-4" /></Link>
          </div>
          <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
            {FAQ.slice(0, 6).map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition-colors hover:bg-ink-50/70 sm:px-6 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180 group-open:text-brand-700" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-600 sm:px-6">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand-500/30 blur-3xl" />
            <h2 className="relative text-3xl font-semibold text-white sm:text-4xl">Bereit für Ihre erste Onlinebuchung?</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-brand-100">Konto erstellen, Raum erfassen, Link teilen. Heute noch.</p>
            <ButtonLink href="/registrieren" size="lg" variant="accent" className="relative mt-8">Kostenlos starten <ArrowRight /></ButtonLink>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
