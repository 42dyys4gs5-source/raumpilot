"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, Lock, Minus, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type WidgetExtra = { id: string; name: string; description: string | null; price: number; pricing: "per_booking" | "per_hour" | "per_person" | "per_unit"; maxQuantity: number };

type Props = {
  roomId: string;
  timezone: string;
  durations: number[];
  defaultDuration: number;
  capacity: number;
  extras: WidgetExtra[];
  discountEnabled: boolean;
  bookingMode: "instant" | "request";
  onlinePayment: boolean;
  hasTerms: boolean;
  embed?: boolean;
  accent?: string | null;
};

type PriceLine = { label: string; amount: number; kind: string };
type Quote = { lines: PriceLine[]; totalAmount: number; vatAmount: number; vatRateBp: number; depositAmount: number };

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function chf(r: number) {
  const neg = r < 0;
  const a = Math.abs(r);
  const fr = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  const c = a % 100;
  return `${neg ? "–" : ""}CHF ${c ? `${fr}.${String(c).padStart(2, "0")}` : `${fr}.–`}`;
}

function durationLabel(m: number) {
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return [d ? `${d} ${d === 1 ? "Tag" : "Tage"}` : "", h ? `${h} Std.` : "", mm ? `${mm} Min.` : ""].filter(Boolean).join(" ");
}

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const pricingSuffix: Record<WidgetExtra["pricing"], string> = { per_booking: "pauschal", per_hour: "pro Stunde", per_person: "pro Person", per_unit: "pro Stück" };

export function BookingWidget(p: Props) {
  const today = todayIn(p.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState<Record<string, string>>({});
  const [daysLoading, setDaysLoading] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [duration, setDuration] = useState(p.defaultDuration);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [guests, setGuests] = useState(Math.min(10, p.capacity));
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [accept, setAccept] = useState(false);
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  const timeFmt = useMemo(() => new Intl.DateTimeFormat("de-CH", { timeZone: p.timezone, hour: "2-digit", minute: "2-digit" }), [p.timezone]);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat("de-CH", { timeZone: p.timezone, weekday: "long", day: "numeric", month: "long", year: "numeric" }), [p.timezone]);

  // Month availability
  useEffect(() => {
    let cancelled = false;
    setDaysLoading(true);
    fetch(`/api/availability?room=${p.roomId}&month=${month}`)
      .then((r) => (r.ok ? r.json() : { days: {} }))
      .then((d) => !cancelled && setDays(d.days ?? {}))
      .finally(() => !cancelled && setDaysLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month, p.roomId]);

  // Slots for selected date/duration
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlotsLoading(true);
    setStart(null);
    fetch(`/api/availability?room=${p.roomId}&date=${date}&duration=${duration}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d) => !cancelled && setSlots(d.slots ?? []))
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, duration, p.roomId]);

  const extrasPayload = useMemo(() => Object.entries(extraQty).filter(([, q]) => q > 0).map(([extraId, quantity]) => ({ extraId, quantity })), [extraQty]);

  const fetchQuote = useCallback(async () => {
    if (!start) return setQuote(null);
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: p.roomId, start, durationMinutes: duration, guests, extras: extrasPayload, discountCode: appliedCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setQuoteError(data.error ?? "Preis konnte nicht berechnet werden.");
      if (data.code === "discount") setAppliedCode(null);
      return;
    }
    setQuoteError(null);
    setQuote(data.price);
  }, [start, duration, guests, extrasPayload, appliedCode, p.roomId]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 250);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  // Calendar grid
  const grid = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [month]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

  const end = start ? new Date(new Date(start).getTime() + duration * 60_000) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start) return setError("Bitte wählen Sie Datum und Uhrzeit.");
    if (!accept) return setError("Bitte akzeptieren Sie die Miet- und Stornierungsbedingungen.");
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: p.roomId,
          start,
          durationMinutes: duration,
          guests,
          extras: extrasPayload,
          discountCode: appliedCode,
          customer: { name: form.name, email: form.email, phone: form.phone || null, company: form.company || null, message: form.message || null },
          acceptTerms: true,
          source: p.embed ? "widget" : "online",
          website_hp: hp || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Die Buchung konnte nicht erstellt werden.");
        if (res.status === 409 && date) {
          // Slot was taken meanwhile: refresh slots.
          setSlots(null);
          setDate(date);
          setStart(null);
          fetch(`/api/availability?room=${p.roomId}&date=${date}&duration=${duration}`).then((r) => r.json()).then((d) => setSlots(d.slots ?? []));
        }
        return;
      }
      if (p.embed && data.payment) {
        // Payment pages cannot run inside an iframe: ask for a click (top-level navigation).
        setPaymentUrl(data.url);
        return;
      }
      if (p.embed) window.open(data.url, "_top");
      else window.location.href = data.url;
    } catch {
      setError("Verbindungsproblem. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  const ctaLabel = p.bookingMode === "request" ? "Unverbindlich anfragen" : p.onlinePayment && (quote?.totalAmount ?? 1) > 0 ? "Weiter zur Zahlung" : "Verbindlich buchen";
  const accentStyle = p.accent ? ({ "--rv-accent": p.accent } as React.CSSProperties) : undefined;

  if (paymentUrl) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center" style={accentStyle}>
        <Lock className="mx-auto size-8 text-brand-700" />
        <h3 className="mt-3 text-lg font-semibold">Termin reserviert</h3>
        <p className="mt-1 text-sm text-ink-600">Ihr Termin ist 30 Minuten für Sie reserviert. Schliessen Sie die Buchung mit der Zahlung ab.</p>
        <a href={paymentUrl} target="_top" className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-6 font-medium text-white hover:bg-brand-800">Zur sicheren Zahlung</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6" style={accentStyle} aria-label="Buchungsformular">
      {/* 1. Date */}
      <section aria-labelledby="rv-date">
        <h3 id="rv-date" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><CalendarDays className="size-4 text-brand-700" /> Datum wählen</h3>
        <div className="rounded-xl border border-ink-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} disabled={month <= today.slice(0, 7)} className="rounded-lg p-1.5 hover:bg-ink-100 disabled:opacity-30" aria-label="Vorheriger Monat"><ChevronLeft className="size-5" /></button>
            <span className="text-sm font-medium capitalize" aria-live="polite">{monthLabel}</span>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 hover:bg-ink-100" aria-label="Nächster Monat"><ChevronRight className="size-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-500">{WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
          <div className={cn("grid grid-cols-7 gap-1", daysLoading && "opacity-50")}>
            {grid.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const status = days[d];
              const available = status === "available";
              const selected = d === date;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={`${d}${status === "full" ? " (ausgebucht)" : !available ? " (nicht buchbar)" : ""}`}
                  onClick={() => {
                    setDate(d);
                    setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                  }}
                  className={cn(
                    "relative aspect-square rounded-lg text-sm tabular-nums transition",
                    selected ? "bg-brand-700 font-semibold text-white" : available ? "font-medium text-ink-900 hover:bg-brand-50" : "text-ink-300",
                    status === "full" && "line-through",
                  )}
                >
                  {Number(d.slice(8))}
                  {available && !selected && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-emerald-500" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 flex items-center gap-3 text-xs text-ink-500"><span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" /> verfügbar</span><span className="line-through">ausgebucht</span></p>
        </div>
      </section>

      {/* 2. Duration & time */}
      <section ref={slotsRef} aria-labelledby="rv-time">
        <h3 id="rv-time" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Clock className="size-4 text-brand-700" /> Mietdauer & Startzeit</h3>
        <label className="mb-3 block">
          <span className="sr-only">Mietdauer</span>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-10 w-full rounded-lg bg-white px-3 text-sm ring-1 ring-ink-200 ring-inset focus:ring-2 focus:ring-brand-500">
            {p.durations.map((d) => <option key={d} value={d}>{durationLabel(d)}</option>)}
          </select>
        </label>
        {!date ? (
          <p className="rounded-lg bg-ink-50 px-3 py-3 text-sm text-ink-500">Bitte zuerst ein Datum wählen.</p>
        ) : slotsLoading || slots === null ? (
          <p className="flex items-center gap-2 py-3 text-sm text-ink-500"><Loader2 className="size-4 animate-spin" /> Freie Zeiten werden geladen …</p>
        ) : slots.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900">Für diese Dauer ist an diesem Tag keine Startzeit mehr frei. Wählen Sie eine kürzere Dauer oder einen anderen Tag.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Startzeiten">
            {slots.map((s) => (
              <button key={s} type="button" aria-pressed={s === start} onClick={() => setStart(s)} className={cn("h-10 rounded-lg text-sm font-medium tabular-nums ring-1 ring-inset transition", s === start ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-ink-800 ring-ink-200 hover:ring-brand-500")}>
                {timeFmt.format(new Date(s))}
              </button>
            ))}
          </div>
        )}
        {start && end && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
            {dateFmt.format(new Date(start))}, {timeFmt.format(new Date(start))} – {timeFmt.format(end)} Uhr
            {end.getTime() - new Date(start).getTime() > 0 && new Intl.DateTimeFormat("en-CA", { timeZone: p.timezone }).format(end) !== new Intl.DateTimeFormat("en-CA", { timeZone: p.timezone }).format(new Date(start)) ? " (Folgetag)" : ""}
          </p>
        )}
      </section>

      {/* 3. Options */}
      <section aria-labelledby="rv-opts" className="space-y-4">
        <h3 id="rv-opts" className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Users className="size-4 text-brand-700" /> Personen & Optionen</h3>
        <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
          <span className="text-sm">Anzahl Personen <span className="text-ink-400">(max. {p.capacity})</span></span>
          <Stepper value={guests} min={1} max={p.capacity} onChange={setGuests} label="Personen" />
        </div>
        {p.extras.length > 0 && (
          <div className="divide-y divide-ink-100 rounded-xl border border-ink-200">
            {p.extras.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{x.name}</p>
                  <p className="text-xs text-ink-500">{chf(x.price)} {pricingSuffix[x.pricing]}{x.description ? ` · ${x.description}` : ""}</p>
                </div>
                {x.maxQuantity > 1 && x.pricing === "per_unit" ? (
                  <Stepper value={extraQty[x.id] ?? 0} min={0} max={x.maxQuantity} onChange={(v) => setExtraQty({ ...extraQty, [x.id]: v })} label={x.name} />
                ) : (
                  <input type="checkbox" aria-label={x.name} checked={(extraQty[x.id] ?? 0) > 0} onChange={(e) => setExtraQty({ ...extraQty, [x.id]: e.target.checked ? 1 : 0 })} className="size-5 accent-brand-700" />
                )}
              </div>
            ))}
          </div>
        )}
        {p.discountEnabled && (
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Rabattcode" aria-label="Rabattcode" className="h-10 min-w-0 flex-1 rounded-lg bg-white px-3 text-sm uppercase ring-1 ring-ink-200 ring-inset focus:ring-2 focus:ring-brand-500" />
            <button type="button" onClick={() => setAppliedCode(code.trim() || null)} className="h-10 rounded-lg px-4 text-sm font-medium ring-1 ring-ink-200 ring-inset hover:bg-ink-50">Einlösen</button>
          </div>
        )}
      </section>

      {/* Price */}
      {start && (
        <section aria-live="polite" className="rounded-xl bg-ink-50 p-4">
          {quoteError ? (
            <p className="text-sm text-red-700">{quoteError}</p>
          ) : !quote ? (
            <p className="flex items-center gap-2 text-sm text-ink-500"><Loader2 className="size-4 animate-spin" /> Preis wird berechnet …</p>
          ) : (
            <dl className="space-y-1.5 text-sm">
              {quote.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-4"><dt className="text-ink-600">{l.label}</dt><dd className="tabular-nums">{chf(l.amount)}</dd></div>
              ))}
              <div className="flex justify-between gap-4 border-t border-ink-200 pt-2 text-base font-semibold text-ink-900"><dt>Total</dt><dd className="tabular-nums">{chf(quote.totalAmount)}</dd></div>
              {quote.vatAmount > 0 && <p className="text-xs text-ink-500">inkl. {(quote.vatRateBp / 100).toFixed(1)} % MWST ({chf(quote.vatAmount)})</p>}
            </dl>
          )}
        </section>
      )}

      {/* 4. Contact */}
      <section aria-labelledby="rv-contact" className="space-y-3">
        <h3 id="rv-contact" className="text-sm font-semibold text-ink-900">Ihre Angaben</h3>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
          <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website_hp" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" />
          <TextInput label="E-Mail" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" />
          <TextInput label="Telefon" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} autoComplete="tel" />
          <TextInput label="Firma (optional)" value={form.company} onChange={(v) => setForm({ ...form, company: v })} autoComplete="organization" />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Nachricht an den Vermieter (optional)</span>
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} maxLength={2000} className="block w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-ink-200 ring-inset focus:ring-2 focus:ring-brand-500" placeholder="z. B. Anlass, Aufbauwünsche" />
        </label>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-brand-700" required />
          <span className="text-ink-700">
            Ich akzeptiere die {p.hasTerms ? <a href="#mietbedingungen" className="text-brand-700 underline" target={p.embed ? "_blank" : undefined}>Miet-</a> : "Miet-"} und <a href="#stornierung" className="text-brand-700 underline" target={p.embed ? "_blank" : undefined}>Stornierungsbedingungen</a>. Meine Angaben werden zur Abwicklung der Buchung an den Vermieter übermittelt (<a href="/rechtliches/datenschutz" className="underline" target="_blank">Datenschutz</a>).
          </span>
        </label>
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={submitting || !start || !!quoteError} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50" style={p.accent ? { background: p.accent } : undefined}>
        {submitting && <Loader2 className="size-4 animate-spin" />} {ctaLabel}
      </button>
      <p className="text-center text-xs text-ink-500">
        {p.bookingMode === "request"
          ? "Sie erhalten eine Bestätigung, sobald der Vermieter Ihre Anfrage angenommen hat."
          : p.onlinePayment
            ? "Sichere Zahlung über Stripe. Ihr Termin ist während der Zahlung 30 Minuten reserviert."
            : "Sie erhalten sofort eine Buchungsbestätigung per E-Mail."}
      </p>
    </form>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="grid size-8 place-items-center rounded-full ring-1 ring-ink-200 hover:bg-ink-50 disabled:opacity-30" aria-label={`${label} verringern`}><Minus className="size-4" /></button>
      <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} aria-label={label} className="w-12 rounded-md text-center text-sm tabular-nums ring-1 ring-ink-200 ring-inset" />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="grid size-8 place-items-center rounded-full ring-1 ring-ink-200 hover:bg-ink-50 disabled:opacity-30" aria-label={`${label} erhöhen`}><Plus className="size-4" /></button>
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", required, autoComplete }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}{required && " *"}</span>
      <input type={type} value={value} required={required} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="block h-10 w-full rounded-lg bg-white px-3 text-sm ring-1 ring-ink-200 ring-inset focus:ring-2 focus:ring-brand-500" />
    </label>
  );
}
