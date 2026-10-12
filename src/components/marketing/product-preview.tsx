import { CalendarCheck2, Check, CreditCard } from "lucide-react";

/** Illustrative product preview built with HTML (no screenshots, no fake data claims). */
export function ProductPreview() {
  const days = Array.from({ length: 35 }, (_, i) => i - 2);
  const busy = new Set([3, 4, 10, 11, 17, 24, 25]);
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/60 via-accent-100/60 to-transparent blur-2xl" />
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <div><p className="text-xs text-ink-500">Eventraum · bis 60 Personen</p><p className="font-display font-semibold">Saal am See</p></div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">online buchbar</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-ink-400">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <span key={d}>{d}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => (
            <span key={d} className={`grid aspect-square place-items-center rounded-md text-xs ${d < 1 || d > 30 ? "text-transparent" : d === 18 ? "bg-brand-700 font-semibold text-white" : busy.has(d) ? "text-ink-300 line-through" : "text-ink-800"}`}>{d}</span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {["10:00", "13:00", "14:00", "18:00"].map((t, i) => <span key={t} className={`rounded-md py-1.5 text-center text-xs ring-1 ${i === 3 ? "bg-brand-700 text-white ring-brand-700" : "ring-ink-200"}`}>{t}</span>)}
        </div>
        <div className="mt-4 space-y-1.5 rounded-xl bg-ink-50 p-3 text-xs">
          <div className="flex justify-between"><span className="text-ink-600">Miete 5 Std. (Halbtag)</span><span>CHF 280.–</span></div>
          <div className="flex justify-between"><span className="text-ink-600">Apéro-Paket (40 Pers.)</span><span>CHF 480.–</span></div>
          <div className="flex justify-between border-t border-ink-200 pt-1.5 font-semibold"><span>Total</span><span>CHF 760.–</span></div>
        </div>
        <div className="mt-4 flex h-10 items-center justify-center rounded-lg bg-brand-700 text-sm font-semibold text-white">Weiter zur Zahlung</div>
      </div>
      <div className="absolute -left-10 -top-7 hidden rotate-[-4deg] rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-lift sm:flex sm:items-center sm:gap-2"><CreditCard className="size-4 text-brand-700" /> TWINT oder Karte</div>
      <div className="absolute -bottom-5 -right-6 hidden rotate-[3deg] rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-lift sm:flex sm:items-center sm:gap-2"><CalendarCheck2 className="size-4 text-brand-700" /> Bestätigung versendet <Check className="size-3.5 text-emerald-600" /></div>
    </div>
  );
}
