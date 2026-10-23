"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/rooms/constants";
import { formatMoney } from "@/lib/utils/money";

const categories = Object.entries(CATEGORY_LABELS);
const amount = (value: number) => formatMoney(Math.round(value) * 100);

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
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form className="space-y-5 rounded-2xl border border-ink-200 bg-white p-5 shadow-soft sm:p-7" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="room-type" className="mb-1.5 block text-sm font-medium">Raumtyp</label>
          <select id="room-type" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-ink-300 bg-white px-3 py-3 text-base focus:border-brand-600">
            {categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <label className="block text-sm font-medium" htmlFor="hourly-rate">Mietpreis pro Stunde (CHF)
          <input id="hourly-rate" type="number" min={0} max={10000} step={1} inputMode="decimal" value={price} onChange={(e) => setBounded(setPrice, e.target.value, 10000)} className="mt-1.5 w-full rounded-xl border border-ink-300 px-3 py-3 text-base font-normal focus:border-brand-600" />
        </label>
        <label className="block text-sm font-medium" htmlFor="weekly-hours">Buchbare Stunden pro Woche
          <input id="weekly-hours" type="number" min={0} max={168} step={1} inputMode="numeric" value={hours} onChange={(e) => setBounded(setHours, e.target.value, 168)} className="mt-1.5 w-full rounded-xl border border-ink-300 px-3 py-3 text-base font-normal focus:border-brand-600" />
        </label>
        <label className="block text-sm font-medium" htmlFor="occupancy">Erwartete Auslastung: {occupancy}%
          <input id="occupancy" type="range" min={0} max={100} step={1} value={occupancy} onChange={(e) => setBounded(setOccupancy, e.target.value, 100)} className="mt-3 block w-full accent-brand-700" />
          <span className="mt-1 flex justify-between text-xs font-normal text-ink-500"><span>0%</span><span>100%</span></span>
        </label>
        <label className="block text-sm font-medium" htmlFor="operating-costs">Monatliche Betriebskosten (CHF, optional)
          <input id="operating-costs" type="number" min={0} max={1000000} step={10} inputMode="decimal" value={costs} onChange={(e) => setBounded(setCosts, e.target.value, 1000000)} className="mt-1.5 w-full rounded-xl border border-ink-300 px-3 py-3 text-base font-normal focus:border-brand-600" />
        </label>
      </form>

      <section aria-live="polite" className="space-y-5">
        <div className="rounded-2xl bg-brand-900 p-6 text-white sm:p-8">
          <p className="text-sm text-brand-100">Geschätztes Potenzial für Ihren {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums sm:text-5xl">{amount(result.monthly)}<span className="text-lg font-normal text-brand-100"> / Monat</span></p>
          <p className="mt-3 text-brand-100">Hochgerechnet aufs Jahr: <strong className="text-white">{amount(result.yearly)}</strong></p>
          <div className="mt-6 rounded-xl bg-white/10 p-4">
            <p className="text-sm text-brand-100">Nach den eingegebenen Betriebskosten</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{amount(result.afterCosts)} <span className="text-sm font-normal text-brand-100">pro Monat</span></p>
          </div>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold">Szenarien nach Auslastung</h2>
          <div className="mt-3 divide-y divide-ink-100">{scenarios.map((scenario) => <div key={scenario.rate} className="flex justify-between gap-4 py-3 text-sm"><span className="text-ink-600">{scenario.rate}% Auslastung</span><strong className="tabular-nums">{amount(scenario.monthly)} / Monat</strong></div>)}</div>
        </div>
        <p className="text-xs leading-relaxed text-ink-500">Rechenannahme: Preis × buchbare Stunden pro Woche × Auslastung. Für den Monat werden 52 Wochen durch 12 Monate geteilt; das Jahr hat 52 Wochen. Betriebskosten werden vom Monatswert abgezogen. Nicht berücksichtigt sind unter anderem Steuern, saisonale Schwankungen, Zahlungsgebühren, Rabatte oder Leerzeiten ausserhalb Ihrer Annahme. Dies ist eine unverbindliche Modellrechnung, keine Umsatzgarantie und keine Marktprognose.</p>
      </section>
    </div>
  );
}
