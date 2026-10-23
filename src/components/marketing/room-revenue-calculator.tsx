"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesColumnIncreasing, ChevronDown, SlidersHorizontal, Sparkles } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/rooms/constants";
import { formatMoney } from "@/lib/utils/money";

const categories = Object.entries(CATEGORY_LABELS);
const amount = (value: number) => formatMoney(Math.round(value * 100));
const inputClass = "mt-2 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-base font-normal shadow-sm transition placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function RoomRevenueCalculator() {
  const [category, setCategory] = useState("eventraum");
  const [price, setPrice] = useState(80);
  const [hours, setHours] = useState(20);
  const [occupancy, setOccupancy] = useState(40);
  const [costs, setCosts] = useState(0);
  const result = useMemo(() => {
    const monthly = price * hours * (occupancy / 100) * 52 / 12;
    return { monthly, yearly: price * hours * (occupancy / 100) * 52, afterCosts: monthly - costs };
  }, [price, hours, occupancy, costs]);
  const scenarios = [25, 50, 75, 100].map((rate) => ({ rate, monthly: price * hours * (rate / 100) * 52 / 12 }));
  const setBounded = (setter: (v: number) => void, raw: string, max: number) => {
    if (raw === "") { setter(0); return; }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) setter(Math.max(0, Math.min(max, parsed)));
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
      <form className="rounded-3xl border border-ink-200/80 bg-white p-5 shadow-soft sm:p-7" onSubmit={(e) => e.preventDefault()}>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"><SlidersHorizontal className="size-5" /></span>
          <div><h2 className="font-semibold">Ihre Annahmen</h2><p className="mt-0.5 text-sm text-ink-500">Einfach anpassen und direkt vergleichen.</p></div>
        </div>
        <div className="space-y-5">
          <label htmlFor="room-type" className="block text-sm font-medium text-ink-800">Was vermieten Sie?
            <select id="room-type" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <label className="block text-sm font-medium text-ink-800" htmlFor="hourly-rate">Preis pro Stunde
              <span className="relative mt-2 block">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-medium text-ink-500">CHF</span>
                <input id="hourly-rate" aria-label="Mietpreis pro Stunde (CHF)" type="number" min={0} max={10000} step={0.05} inputMode="decimal" value={price} onChange={(e) => setBounded(setPrice, e.target.value, 10000)} className={`${inputClass} pl-14`} />
              </span>
            </label>
            <label className="block text-sm font-medium text-ink-800" htmlFor="weekly-hours">Stunden pro Woche
              <span className="relative mt-2 block">
                <input id="weekly-hours" aria-label="Buchbare Stunden pro Woche" type="number" min={0} max={168} step={1} inputMode="numeric" value={hours} onChange={(e) => setBounded(setHours, e.target.value, 168)} className={`${inputClass} pr-14`} />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-500">Std.</span>
              </span>
            </label>
          </div>
          <label className="block rounded-2xl bg-ink-50/80 p-4 text-sm font-medium text-ink-800" htmlFor="occupancy">
            <span className="flex items-center justify-between gap-3"><span>Erwartete Auslastung:</span><output htmlFor="occupancy" className="rounded-full bg-white px-3 py-1 font-semibold text-brand-800 shadow-sm">{occupancy}%</output></span>
            <input id="occupancy" aria-label="Erwartete Auslastung in Prozent" type="range" min={0} max={100} step={1} value={occupancy} onChange={(e) => setBounded(setOccupancy, e.target.value, 100)} className="mt-4 block w-full cursor-pointer accent-brand-700" />
            <span className="mt-1 flex justify-between text-xs font-normal text-ink-500"><span>0% · kaum gebucht</span><span>100% · voll</span></span>
          </label>
          <details className="group rounded-2xl border border-ink-200 transition-colors open:border-brand-200 open:bg-brand-50/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50/70 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-ink-100 text-ink-600"><ArrowDownRight className="size-4" /></span>Betriebskosten einrechnen <span className="font-normal text-ink-400">optional</span></span>
              <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-1">
              <label className="block text-sm font-medium text-ink-800" htmlFor="operating-costs">Monatliche Kosten (CHF)
                <input id="operating-costs" aria-label="Monatliche Betriebskosten (CHF, optional)" type="number" min={0} max={1000000} step={10} inputMode="decimal" value={costs} onChange={(e) => setBounded(setCosts, e.target.value, 1000000)} className={inputClass} />
              </label>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">Die Kosten werden in der Schätzung nach Abzug angezeigt.</p>
            </div>
          </details>
        </div>
      </form>

      <section className="space-y-4">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 p-6 text-white shadow-lift sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 -z-10 size-56 animate-pulse-glow rounded-full bg-brand-400/40 blur-3xl" />
          <div className="flex items-center gap-2 text-sm font-medium text-brand-100"><Sparkles className="size-4 text-accent-400" />Ihre persönliche Schätzung</div>
          <p className="mt-3 text-sm text-brand-100">Möglicher Monatsumsatz · {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}</p>
          <p key={Math.round(result.monthly * 100)} aria-live="polite" aria-atomic="true" className="mt-1 animate-result-pop text-[2.5rem] font-semibold leading-tight tracking-tight tabular-nums sm:text-5xl">{amount(result.monthly)}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs text-brand-100">Hochgerechnet aufs Jahr</p>
              <p key={Math.round(result.yearly * 100)} className="mt-1 animate-result-pop text-lg font-semibold tabular-nums sm:text-xl">{amount(result.yearly)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs text-brand-100">Nach Kosten pro Monat</p>
              <p key={Math.round(result.afterCosts * 100)} className="mt-1 animate-result-pop flex items-center gap-1.5 text-lg font-semibold tabular-nums sm:text-xl">{result.afterCosts < 0 && <ArrowDownRight aria-label="negativ" className="size-4 text-rose-200" />}{result.afterCosts >= 0 && <ArrowUpRight aria-label="positiv" className="size-4 text-emerald-200" />}{amount(result.afterCosts)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-brand-100/80">Eine Modellrechnung auf Basis Ihrer Eingaben, keine Umsatzgarantie.</p>
        </div>

        <div className="rounded-3xl border border-ink-200/80 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-600"><ChartNoAxesColumnIncreasing className="size-5" /></span>
            <div><h2 className="font-semibold">Was wäre bei anderer Auslastung?</h2><p className="mt-1 text-sm text-ink-500">Tippen Sie ein Szenario an, um es zu übernehmen.</p></div>
          </div>
          <div className="mt-4 space-y-1">
            {scenarios.map((scenario) => (
              <button key={scenario.rate} type="button" aria-pressed={occupancy === scenario.rate} onClick={() => setOccupancy(scenario.rate)} className={`group/scenario w-full rounded-xl px-3 py-3 text-left transition duration-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${occupancy === scenario.rate ? "bg-brand-50 ring-1 ring-brand-200" : ""}`}>
                <span className="flex items-center justify-between gap-3"><span className={`text-sm ${occupancy === scenario.rate ? "font-semibold text-brand-900" : "text-ink-600"}`}>{scenario.rate}% Auslastung</span><strong className="tabular-nums text-ink-900">{amount(scenario.monthly)}<span className="ml-1 text-xs font-normal text-ink-500">/ Mt.</span></strong></span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-100"><span className={`block h-full rounded-full transition-[width] duration-500 ease-out ${occupancy === scenario.rate ? "bg-brand-600" : "bg-brand-300 group-hover/scenario:bg-brand-500"}`} style={{ width: `${scenario.rate}%` }} /></span>
              </button>
            ))}
          </div>
        </div>
        <p className="px-1 text-xs leading-relaxed text-ink-500">Rechenannahme: Preis × buchbare Stunden pro Woche × Auslastung. Ein Monat entspricht 52 Wochen geteilt durch 12; ein Jahr hat 52 Wochen. Nicht berücksichtigt sind Steuern, Zahlungsgebühren, saisonale Schwankungen oder Leerzeiten ausserhalb Ihrer Annahme. Es fliessen keine Marktdaten ein. Diese unverbindliche Schätzung garantiert keinen Umsatz.</p>
      </section>
    </div>
  );
}
