import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { IntervalToggle, PlanCards } from "@/components/billing/plan-cards";
import { PageHero } from "@/components/marketing/page-hero";
import { FEATURE_LABELS } from "@/config/plans";
import { listPlans, parseInterval, yearlyAvailable } from "@/lib/billing/entitlements";
import type { PlanFeatures } from "@/lib/db/schema";
import { appUrl, env } from "@/lib/env";
import { vatNote } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Preise – ab CHF 39.– pro Monat",
  description: "Transparente Preise für Raumvia: Starter CHF 39.–, Professional CHF 69.–, Business CHF 129.– pro Monat. Monatlich kündbar oder jährlich mit 2 Monaten gratis, keine Provision auf Buchungen.",
  alternates: { canonical: appUrl("/preise") },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ abrechnung?: string }> }) {
  const [plans, note] = await Promise.all([listPlans(), vatNote()]);
  const active = plans.filter((p) => p.active);
  const yearly = yearlyAvailable(plans, env.PAYMENTS_MODE);
  const interval = yearly ? parseInterval((await searchParams).abrechnung) : "month";
  return (
    <>
      <PageHero eyebrow="Preise" title="Ein fairer Monatspreis. Keine Provision." intro="Wählen Sie den Tarif, der zu Ihrer Anzahl Räume passt. Monatlich kündbar – oder jährlich bezahlen und 2 Monate sparen. Wechsel jederzeit möglich." />
      <section className="py-12 sm:py-16">
        <div className="container-page">{yearly && <IntervalToggle basePath="/preise" interval={interval} />}<PlanCards plans={active} interval={interval} hrefFor={(k) => `/registrieren?tarif=${k}${interval === "year" ? "&abrechnung=jaehrlich" : ""}`} ctaLabel="Kostenlos starten" vatNote={note} /></div>
        <div className="container-page mt-16 sm:mt-20">
          <p className="eyebrow">Übersicht</p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Tarife im Vergleich</h2>
          <p className="mt-2 text-sm text-ink-500 sm:hidden">Tabelle seitlich wischen, um alle Tarife zu sehen.</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-soft">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-ink-50"><tr><th className="sticky left-0 bg-ink-50 px-4 py-3 text-left font-medium text-ink-600">Funktion</th>{active.map((p) => <th key={p.key} className="px-4 py-3 text-center font-semibold">{p.name}</th>)}</tr></thead>
              <tbody className="divide-y divide-ink-100 [&_tr>td:first-child]:sticky [&_tr>td:first-child]:left-0 [&_tr>td:first-child]:bg-white [&_tr>td:first-child]:font-medium [&_tr>td:first-child]:text-ink-800">
                <tr><td className="px-4 py-3">Räume</td>{active.map((p) => <td key={p.key} className="px-4 py-3 text-center">{p.maxRooms === 1 ? "1" : `bis ${p.maxRooms}`}{p.key === "business" ? " (Fair Use)" : ""}</td>)}</tr>
                <tr><td className="px-4 py-3">Standorte</td>{active.map((p) => <td key={p.key} className="px-4 py-3 text-center">{p.maxLocations}</td>)}</tr>
                <tr><td className="px-4 py-3">Benutzer</td>{active.map((p) => <td key={p.key} className="px-4 py-3 text-center">{p.maxMembers}</td>)}</tr>
                {["Buchungsseite, QR-Code & Widget", "Echtzeit-Kalender & iCal", "Onlinezahlung (Karte, TWINT)", "Automatische Bestätigungen"].map((f) => (
                  <tr key={f}><td className="px-4 py-3">{f}</td>{active.map((p) => <td key={p.key} className="px-4 py-3 text-center"><Check className="mx-auto size-4 text-brand-600" /></td>)}</tr>
                ))}
                {(Object.keys(FEATURE_LABELS) as (keyof PlanFeatures)[]).filter((k) => k !== "calendarImport").map((k) => (
                  <tr key={k}><td className="px-4 py-3">{FEATURE_LABELS[k]}</td>{active.map((p) => <td key={p.key} className="px-4 py-3 text-center">{p.features[k] ? <Check className="mx-auto size-4 text-brand-600" /> : <Minus className="mx-auto size-4 text-ink-300" />}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 grid gap-4 text-sm leading-relaxed text-ink-600 md:grid-cols-3 [&>p]:rounded-2xl [&>p]:bg-ink-50 [&>p]:p-5 [&>p]:ring-1 [&>p]:ring-ink-100">
            <p><strong className="text-ink-900">Stripe-Gebühren:</strong> Für Onlinezahlungen Ihrer Mieter belastet Stripe Ihnen die Transaktionsgebühren direkt gemäss Ihrem Stripe-Vertrag. Raumvia verdient daran nichts.</p>
            <p><strong className="text-ink-900">Zahlung per Rechnung oder vor Ort:</strong> Ohne Onlinezahlung fallen keine Transaktionsgebühren an.</p>
            <p><strong className="text-ink-900">Fair Use Business:</strong> bis 25 Räume, 10 Standorte und 10 Benutzer. Darüber hinaus erstellen wir gerne ein Angebot.</p>
          </div>
        </div>
      </section>
    </>
  );
}
