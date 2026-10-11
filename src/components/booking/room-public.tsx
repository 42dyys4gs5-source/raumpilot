import { Check, MapPin, Ruler, Users } from "lucide-react";
import { durationOptions } from "@/lib/booking/availability";
import { env } from "@/lib/env";
import { canTakeOnlinePayments } from "@/lib/booking/engine";
import { describePolicy } from "@/lib/booking/policy";
import type { PublicRoom } from "@/lib/booking/public";
import { CATEGORY_LABELS, WEEKDAYS, minutesToTime } from "@/lib/rooms/constants";
import { publicUrl } from "@/lib/storage";
import { formatMoney } from "@/lib/utils/money";

export function widgetProps(d: PublicRoom, embed = false) {
  const durations = durationOptions(d.room);
  return {
    roomId: d.room.id,
    timezone: d.room.timezone,
    durations,
    defaultDuration: durations.includes(120) ? 120 : durations[0] ?? d.room.minDurationMinutes,
    capacity: d.room.capacity,
    extras: d.extras.map((x) => ({ id: x.id, name: x.name, description: x.description, price: x.price, pricing: x.pricing, maxQuantity: x.maxQuantity })),
    discountEnabled: d.discountCodes,
    bookingMode: d.room.bookingMode,
    onlinePayment: d.room.paymentMode === "online" && canTakeOnlinePayments(d.org),
    hasTerms: !!d.room.rentalTerms,
    embed,
    accent: d.branding ? d.org.brandColor : null,
    turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null,
  };
}

export function PriceSummary({ d }: { d: PublicRoom }) {
  const r = d.room;
  const items = [
    r.hourlyPrice ? `${formatMoney(r.hourlyPrice)} pro Stunde` : null,
    r.halfDayPrice ? `${formatMoney(r.halfDayPrice)} Halbtag (bis ${r.halfDayHours} Std.)` : null,
    r.dayPrice ? `${formatMoney(r.dayPrice)} Tag (bis ${r.dayHours} Std.)` : null,
  ].filter(Boolean);
  return (
    <ul className="space-y-1 text-sm text-ink-700">
      {items.map((i) => <li key={i}>{i}</li>)}
      {r.depositMode !== "none" && r.depositAmount > 0 && <li className="text-ink-500">Kaution {formatMoney(r.depositAmount)} ({r.depositMode === "online" ? "online, rückerstattbar" : "vor Ort"})</li>}
      {d.org.vatRegistered && <li className="text-xs text-ink-500">Preise inkl. MWST</li>}
    </ul>
  );
}

export function RoomDetails({ d }: { d: PublicRoom }) {
  const r = d.room;
  const byDay = WEEKDAYS.map((w) => ({ ...w, windows: d.hours.filter((h) => h.weekday === w.n) }));
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
        <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-brand-700" /> bis {r.capacity} Personen</span>
        {r.sizeSqm ? <span className="inline-flex items-center gap-1.5"><Ruler className="size-4 text-brand-700" /> {r.sizeSqm} m²</span> : null}
        {r.city && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-brand-700" /> {[r.street, [r.postalCode, r.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>}
      </div>
      {r.description && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Über den Raum</h2>
          <div className="space-y-3 whitespace-pre-line text-ink-700 leading-relaxed">{r.description}</div>
        </section>
      )}
      {r.amenities.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Ausstattung</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {r.amenities.map((a) => <li key={a} className="flex items-center gap-2 text-sm text-ink-700"><Check className="size-4 text-brand-600" /> {a}</li>)}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Preise</h2>
        <PriceSummary d={d} />
        <p className="mt-2 text-xs text-ink-500">Der Preisrechner im Buchungsformular berücksichtigt automatisch den günstigsten Tarif sowie allfällige Wochenend- oder Saisonpreise.</p>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Buchbare Zeiten</h2>
        <dl className="grid max-w-md grid-cols-[110px_1fr] gap-y-1 text-sm">
          {byDay.map((w) => (
            <div key={w.n} className="contents">
              <dt className="text-ink-500">{w.long}</dt>
              <dd className="text-ink-800">{w.windows.length ? w.windows.map((h) => `${minutesToTime(h.startMinute)}–${minutesToTime(h.endMinute)}${h.endMinute > 1440 ? " (Folgetag)" : ""}`).join(", ") : "geschlossen"}</dd>
            </div>
          ))}
        </dl>
      </section>
      {r.houseRules && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Hausregeln</h2>
          <p className="whitespace-pre-line text-sm text-ink-700">{r.houseRules}</p>
        </section>
      )}
      {r.rentalTerms && (
        <section id="mietbedingungen" className="scroll-mt-24">
          <h2 className="mb-3 text-xl font-semibold">Mietbedingungen</h2>
          <p className="whitespace-pre-line text-sm text-ink-700">{r.rentalTerms}</p>
        </section>
      )}
      <section id="stornierung" className="scroll-mt-24">
        <h2 className="mb-3 text-xl font-semibold">Stornierung</h2>
        <p className="text-sm text-ink-700">{describePolicy(r.cancellationPolicy)}</p>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Vermieter</h2>
        <p className="text-sm text-ink-700">
          <strong className="text-ink-900">{d.org.name}</strong>
          {d.org.legalName && d.org.legalName !== d.org.name ? `, ${d.org.legalName}` : ""}
          <br />
          {[d.org.street, [d.org.postalCode, d.org.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
          <br />
          <a className="text-brand-700 underline" href={`mailto:${d.org.contactEmail}`}>{d.org.contactEmail}</a>
          {d.org.phone ? <> · <a className="text-brand-700 underline" href={`tel:${d.org.phone.replace(/\s/g, "")}`}>{d.org.phone}</a></> : null}
        </p>
        <p className="mt-2 text-xs text-ink-500">Vertragspartner für die Raummiete ist der Vermieter. Raumvia stellt die Buchungssoftware zur Verfügung.</p>
      </section>
    </div>
  );
}

export function Gallery({ d }: { d: PublicRoom }) {
  const photos = d.photos;
  if (!photos.length) {
    return <div className="grid h-28 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-ink-100 text-sm text-ink-500">{CATEGORY_LABELS[d.room.category]} · Fotos folgen</div>;
  }
  const [first, ...rest] = photos;
  return (
    <div className="grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2" style={{ maxHeight: 460 }}>
      <img src={publicUrl(first.path)!} alt={first.alt ?? d.room.name} width={first.width} height={first.height} className="aspect-[4/3] size-full object-cover sm:col-span-2 sm:row-span-2 sm:aspect-auto" fetchPriority="high" />
      {rest.slice(0, 4).map((p) => (
        <img key={p.id} src={publicUrl(p.thumbPath)!} alt={p.alt ?? d.room.name} loading="lazy" className="hidden size-full object-cover sm:block" />
      ))}
    </div>
  );
}
