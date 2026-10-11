import { and, asc, eq } from "drizzle-orm";
import { ArrowDown, ArrowUp, CheckCircle2, Circle, ExternalLink, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CopyField } from "@/components/ui/copy-field";
import { requireOrg } from "@/lib/auth/guards";
import { POLICY_PRESETS, describePolicy } from "@/lib/booking/policy";
import { db, schema } from "@/lib/db";
import { ROOM_CATEGORIES } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { AMENITIES, CATEGORY_LABELS, WEEKDAYS, minutesToTime } from "@/lib/rooms/constants";
import { getOrgRoom, publishChecklist, type Room } from "@/lib/rooms/service";
import { publicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils/cn";
import { toInputValue } from "@/lib/utils/money";
import {
  photoAction,
  publishAction,
  updateGeneralAction,
  updatePricesAction,
  updateRulesAction,
  updateTimesAction,
  uploadPhotosAction,
} from "../actions";

const TABS = [
  { key: "allgemein", label: "Allgemein" },
  { key: "fotos", label: "Fotos" },
  { key: "preise", label: "Preise & Buchungsart" },
  { key: "zeiten", label: "Zeiten & Dauer" },
  { key: "regeln", label: "Regeln & Stornierung" },
  { key: "veroeffentlichen", label: "Veröffentlichen" },
];

export default async function RoomEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; neu?: string }> }) {
  const ctx = await requireOrg("admin");
  const { id } = await params;
  const { tab = "allgemein", neu } = await searchParams;
  const room = await getOrgRoom(ctx.org.id, id);
  if (!room) notFound();
  const check = await publishChecklist(ctx.org, room);

  return (
    <>
      <PageHeader
        title={room.name}
        description={<>{CATEGORY_LABELS[room.category]} · {room.status === "published" ? <Badge tone="green">Online buchbar</Badge> : room.status === "archived" ? <Badge>Archiviert</Badge> : <Badge tone="amber">Entwurf</Badge>}</>}
        actions={room.status === "published" ? <Link className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline" href={`/r/${room.slug}`} target="_blank">Öffentliche Seite <ExternalLink className="size-3.5" /></Link> : null}
      />
      {neu && <Alert tone="success" className="mb-4" title="Raum erstellt">Ergänzen Sie nun Fotos, Preise und Zeiten. Unter «Veröffentlichen» schalten Sie den Raum online.</Alert>}
      <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-ink-200 px-4 sm:mx-0 sm:px-0" aria-label="Raum-Bereiche">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/app/raeume/${room.id}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium", tab === t.key ? "border-brand-700 text-brand-800" : "border-transparent text-ink-500 hover:text-ink-800")}
          >
            {t.label}
            {t.key === "veroeffentlichen" && !check.ok && <span className="ml-1.5 inline-block size-2 rounded-full bg-accent-500" />}
          </Link>
        ))}
      </nav>
      {tab === "allgemein" && <GeneralTab room={room} orgId={ctx.org.id} />}
      {tab === "fotos" && <PhotosTab room={room} />}
      {tab === "preise" && <PricesTab room={room} stripeReady={ctx.org.stripeChargesEnabled} />}
      {tab === "zeiten" && <TimesTab room={room} />}
      {tab === "regeln" && <RulesTab room={room} />}
      {tab === "veroeffentlichen" && <PublishTab room={room} check={check} />}
    </>
  );
}

async function GeneralTab({ room, orgId }: { room: Room; orgId: string }) {
  const locations = await db.select().from(schema.locations).where(eq(schema.locations.orgId, orgId));
  const custom = room.amenities.filter((a) => !(AMENITIES as readonly string[]).includes(a));
  return (
    <Card>
      <CardBody>
        <ActionForm action={updateGeneralAction}>
          <input type="hidden" name="roomId" value={room.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Raumname" htmlFor="name"><Input id="name" name="name" defaultValue={room.name} required /></Field>
            <Field label="Kategorie" htmlFor="category">
              <Select id="category" name="category" defaultValue={room.category}>
                {ROOM_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Kurzbeschreibung" htmlFor="shortDescription" hint="Ein Satz für Vorschauen und Suchmaschinen (max. 200 Zeichen)." optional>
            <Input id="shortDescription" name="shortDescription" maxLength={200} defaultValue={room.shortDescription ?? ""} />
          </Field>
          <Field label="Beschreibung" htmlFor="description" hint="Was macht Ihren Raum aus? Lage, Stimmung, wofür er sich eignet. Absätze werden übernommen.">
            <Textarea id="description" name="description" rows={7} maxLength={8000} defaultValue={room.description ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1.5fr]">
            <Field label="Strasse und Nr." htmlFor="street"><Input id="street" name="street" defaultValue={room.street ?? ""} /></Field>
            <Field label="PLZ" htmlFor="postalCode"><Input id="postalCode" name="postalCode" defaultValue={room.postalCode ?? ""} /></Field>
            <Field label="Ort" htmlFor="city"><Input id="city" name="city" defaultValue={room.city ?? ""} required /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Max. Personen" htmlFor="capacity"><Input id="capacity" name="capacity" type="number" min={1} defaultValue={room.capacity} required /></Field>
            <Field label="Fläche (m²)" htmlFor="sizeSqm" optional><Input id="sizeSqm" name="sizeSqm" type="number" min={0} defaultValue={room.sizeSqm ?? ""} /></Field>
            {locations.length > 0 && (
              <Field label="Standort" htmlFor="locationId" optional>
                <Select id="locationId" name="locationId" defaultValue={room.locationId ?? ""}>
                  <option value="">–</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-800">Ausstattung</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {AMENITIES.map((a) => <Checkbox key={a} name="amenities" value={a} label={a} defaultChecked={room.amenities.includes(a)} />)}
            </div>
            <Field label="Weitere Ausstattung" htmlFor="customAmenities" hint="Mit Komma trennen." className="mt-4" optional>
              <Input id="customAmenities" name="customAmenities" defaultValue={custom.join(", ")} />
            </Field>
          </fieldset>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </CardBody>
    </Card>
  );
}

async function PhotosTab({ room }: { room: Room }) {
  const photos = await db.select().from(schema.roomPhotos).where(eq(schema.roomPhotos.roomId, room.id)).orderBy(asc(schema.roomPhotos.sort));
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Fotos hochladen" description="JPG, PNG, WebP oder AVIF, max. 10 MB pro Bild. Wir optimieren die Bilder automatisch und entfernen Metadaten wie GPS-Daten." />
        <CardBody>
          <ActionForm action={uploadPhotosAction} resetOnSuccess>
            <input type="hidden" name="roomId" value={room.id} />
            <input type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-medium file:text-brand-800 hover:file:bg-brand-100" />
            <SubmitButton pendingText="Wird hochgeladen …">Hochladen</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
      {photos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-ink-100">
                <img src={publicUrl(p.thumbPath)!} alt={p.alt ?? ""} className="size-full object-cover" />
                {i === 0 && <span className="absolute top-2 left-2"><Badge tone="brand">Titelbild</Badge></span>}
              </div>
              <div className="space-y-2 p-3">
                <ActionForm action={photoAction} className="flex gap-2 space-y-0" successMessage={false}>
                  <input type="hidden" name="roomId" value={room.id} />
                  <input type="hidden" name="photoId" value={p.id} />
                  <input type="hidden" name="op" value="alt" />
                  <Input name="alt" defaultValue={p.alt ?? ""} placeholder="Bildbeschreibung" aria-label="Bildbeschreibung" className="h-8" />
                  <SubmitButton size="sm" variant="secondary">OK</SubmitButton>
                </ActionForm>
                <div className="flex flex-wrap gap-1">
                  {i > 0 && <PhotoOp room={room} photoId={p.id} op="cover" label="Als Titelbild" icon={<Star />} />}
                  {i > 0 && <PhotoOp room={room} photoId={p.id} op="up" label="Nach vorne" icon={<ArrowUp />} />}
                  {i < photos.length - 1 && <PhotoOp room={room} photoId={p.id} op="down" label="Nach hinten" icon={<ArrowDown />} />}
                  <PhotoOp room={room} photoId={p.id} op="delete" label="Löschen" icon={<Trash2 />} danger />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoOp({ room, photoId, op, label, icon, danger }: { room: Room; photoId: string; op: string; label: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <ActionForm action={photoAction} className="space-y-0" successMessage={false} confirm={danger ? "Foto wirklich löschen?" : undefined}>
      <input type="hidden" name="roomId" value={room.id} />
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="op" value={op} />
      <SubmitButton size="sm" variant={danger ? "danger-ghost" : "ghost"}>{icon}<span className="sr-only sm:not-sr-only">{label}</span></SubmitButton>
    </ActionForm>
  );
}

function PricesTab({ room, stripeReady }: { room: Room; stripeReady: boolean }) {
  return (
    <Card>
      <CardBody>
        <ActionForm action={updatePricesAction}>
          <input type="hidden" name="roomId" value={room.id} />
          <h3 className="font-semibold">Mietpreise (CHF)</h3>
          <p className="-mt-2 text-sm text-ink-500">Geben Sie einen oder mehrere Preise an. Bei jeder Buchung wird automatisch der günstigste passende Preis verrechnet.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Pro Stunde" htmlFor="hourlyPrice"><Input id="hourlyPrice" name="hourlyPrice" inputMode="decimal" defaultValue={toInputValue(room.hourlyPrice)} /></Field>
            <Field label="Halbtag" htmlFor="halfDayPrice"><Input id="halfDayPrice" name="halfDayPrice" inputMode="decimal" defaultValue={toInputValue(room.halfDayPrice)} /></Field>
            <Field label="Ganzer Tag" htmlFor="dayPrice"><Input id="dayPrice" name="dayPrice" inputMode="decimal" defaultValue={toInputValue(room.dayPrice)} /></Field>
            <div className="hidden sm:block" />
            <Field label="Halbtag = bis … Stunden" htmlFor="halfDayHours"><Input id="halfDayHours" name="halfDayHours" type="number" min={2} max={12} defaultValue={room.halfDayHours} /></Field>
            <Field label="Tag = bis … Stunden" htmlFor="dayHours"><Input id="dayHours" name="dayHours" type="number" min={4} max={24} defaultValue={room.dayHours} /></Field>
          </div>
          <p className="text-sm text-ink-500">Wochenend-, Saison- und Randzeitenpreise legen Sie unter <Link href="/app/preise" className="text-brand-700 underline">Preise</Link> fest.</p>

          <h3 className="pt-4 font-semibold">Buchungsart</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex gap-3 rounded-xl border border-ink-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50">
              <input type="radio" name="bookingMode" value="instant" defaultChecked={room.bookingMode === "instant"} className="mt-1 accent-brand-700" />
              <span><span className="font-medium">Sofortbuchung</span><span className="block text-sm text-ink-500">Freie Termine werden direkt verbindlich gebucht.</span></span>
            </label>
            <label className="flex gap-3 rounded-xl border border-ink-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50">
              <input type="radio" name="bookingMode" value="request" defaultChecked={room.bookingMode === "request"} className="mt-1 accent-brand-700" />
              <span><span className="font-medium">Buchungsanfrage</span><span className="block text-sm text-ink-500">Sie prüfen jede Anfrage und bestätigen sie manuell.</span></span>
            </label>
          </div>
          <Field label="Anfragen verfallen nach … Stunden ohne Antwort" htmlFor="requestExpiryHours" className="max-w-xs">
            <Input id="requestExpiryHours" name="requestExpiryHours" type="number" min={4} max={168} defaultValue={room.requestExpiryHours} />
          </Field>

          <h3 className="pt-4 font-semibold">Bezahlung</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={cn("flex gap-3 rounded-xl border border-ink-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50", !stripeReady && "opacity-60")}>
              <input type="radio" name="paymentMode" value="online" defaultChecked={room.paymentMode === "online"} disabled={!stripeReady} className="mt-1 accent-brand-700" />
              <span><span className="font-medium">Online bei Buchung</span><span className="block text-sm text-ink-500">Karte oder TWINT (sofern in Ihrem Stripe-Konto aktiv). {!stripeReady && <Link href="/app/einnahmen" className="text-brand-700 underline">Stripe verbinden</Link>}</span></span>
            </label>
            <label className="flex gap-3 rounded-xl border border-ink-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50">
              <input type="radio" name="paymentMode" value="offline" defaultChecked={room.paymentMode === "offline"} className="mt-1 accent-brand-700" />
              <span><span className="font-medium">Rechnung / vor Ort</span><span className="block text-sm text-ink-500">Sie kassieren selbst. Offene Beträge sehen Sie im Dashboard.</span></span>
            </label>
          </div>
          <Field label="Hinweis zur Bezahlung" htmlFor="offlinePaymentNote" hint="Wird bei Rechnung/vor Ort in der Bestätigung angezeigt, z. B. IBAN und Zahlungsfrist." optional>
            <Textarea id="offlinePaymentNote" name="offlinePaymentNote" rows={3} defaultValue={room.offlinePaymentNote ?? ""} />
          </Field>

          <h3 className="pt-4 font-semibold">Kaution</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kaution" htmlFor="depositMode">
              <Select id="depositMode" name="depositMode" defaultValue={room.depositMode}>
                <option value="none">Keine Kaution</option>
                <option value="on_site">Vor Ort zu hinterlegen</option>
                <option value="online">Online mit der Buchung (rückerstattbar)</option>
              </Select>
            </Field>
            <Field label="Betrag (CHF)" htmlFor="depositAmount"><Input id="depositAmount" name="depositAmount" inputMode="decimal" defaultValue={toInputValue(room.depositAmount || null)} /></Field>
          </div>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </CardBody>
    </Card>
  );
}

async function TimesTab({ room }: { room: Room }) {
  const hours = await db.select().from(schema.roomOpeningHours).where(eq(schema.roomOpeningHours.roomId, room.id)).orderBy(asc(schema.roomOpeningHours.startMinute));
  return (
    <Card>
      <CardBody>
        <ActionForm action={updateTimesAction}>
          <input type="hidden" name="roomId" value={room.id} />
          <h3 className="font-semibold">Buchbare Zeiten</h3>
          <p className="-mt-2 text-sm text-ink-500">Liegt das Ende vor dem Beginn (z. B. 18:00–02:00), gilt das Zeitfenster bis in den Folgetag. Pro Tag sind zwei Zeitfenster möglich.</p>
          <div className="divide-y divide-ink-100 rounded-xl border border-ink-200">
            {WEEKDAYS.map((d) => {
              const w = hours.filter((h) => h.weekday === d.n);
              return (
                <div key={d.n} className="grid items-center gap-3 p-3 sm:grid-cols-[140px_1fr_1fr]">
                  <Checkbox name={`open_${d.n}`} label={d.long} defaultChecked={w.length > 0} />
                  {[1, 2].map((slot) => {
                    const h = w[slot - 1];
                    return (
                      <div key={slot} className="flex items-center gap-2">
                        <Input type="time" name={`start_${d.n}_${slot}`} aria-label={`${d.long} Beginn ${slot}`} defaultValue={h ? minutesToTime(h.startMinute) : slot === 1 ? "08:00" : ""} className="h-9" />
                        <span className="text-ink-400">–</span>
                        <Input type="time" name={`end_${d.n}_${slot}`} aria-label={`${d.long} Ende ${slot}`} defaultValue={h ? minutesToTime(h.endMinute) : slot === 1 ? "22:00" : ""} className="h-9" />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <h3 className="pt-4 font-semibold">Mietdauer & Regeln</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Mindestdauer (Minuten)" htmlFor="minDurationMinutes"><Input id="minDurationMinutes" name="minDurationMinutes" type="number" min={15} step={15} defaultValue={room.minDurationMinutes} /></Field>
            <Field label="Maximaldauer (Minuten)" htmlFor="maxDurationMinutes" hint="1440 = 24 Std."><Input id="maxDurationMinutes" name="maxDurationMinutes" type="number" min={15} step={15} defaultValue={room.maxDurationMinutes} /></Field>
            <Field label="Startzeiten im Raster" htmlFor="slotIntervalMinutes">
              <Select id="slotIntervalMinutes" name="slotIntervalMinutes" defaultValue={String(room.slotIntervalMinutes)}>
                <option value="15">alle 15 Minuten</option>
                <option value="30">alle 30 Minuten</option>
                <option value="60">jede volle Stunde</option>
              </Select>
            </Field>
            <Field label="Mindestvorlaufzeit (Stunden)" htmlFor="leadTimeHours"><Input id="leadTimeHours" name="leadTimeHours" type="number" min={0} defaultValue={Math.round(room.leadTimeMinutes / 60)} /></Field>
            <Field label="Buchbar bis … Tage im Voraus" htmlFor="maxAdvanceDays"><Input id="maxAdvanceDays" name="maxAdvanceDays" type="number" min={1} max={730} defaultValue={room.maxAdvanceDays} /></Field>
            <div className="hidden sm:block" />
            <Field label="Vorbereitungszeit vorher (Min.)" htmlFor="bufferBeforeMinutes"><Input id="bufferBeforeMinutes" name="bufferBeforeMinutes" type="number" min={0} step={15} defaultValue={room.bufferBeforeMinutes} /></Field>
            <Field label="Reinigungszeit nachher (Min.)" htmlFor="bufferAfterMinutes"><Input id="bufferAfterMinutes" name="bufferAfterMinutes" type="number" min={0} step={15} defaultValue={room.bufferAfterMinutes} /></Field>
          </div>
          <p className="text-sm text-ink-500">Gesperrte Tage, Ferien und externe Kalender verwalten Sie unter <Link href="/app/verfuegbarkeit" className="text-brand-700 underline">Verfügbarkeit</Link>.</p>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </CardBody>
    </Card>
  );
}

function RulesTab({ room }: { room: Room }) {
  const p = room.cancellationPolicy;
  const preset = Object.entries(POLICY_PRESETS).find(([, v]) => JSON.stringify(v.policy) === JSON.stringify(p))?.[0] ?? "custom";
  return (
    <Card>
      <CardBody>
        <ActionForm action={updateRulesAction}>
          <input type="hidden" name="roomId" value={room.id} />
          <Field label="Mietbedingungen" htmlFor="rentalTerms" hint="z. B. Haftung, Schlüsselübergabe, Lärmschutz. Werden vor der Buchung angezeigt und müssen akzeptiert werden." optional>
            <Textarea id="rentalTerms" name="rentalTerms" rows={6} defaultValue={room.rentalTerms ?? ""} />
          </Field>
          <Field label="Hausregeln" htmlFor="houseRules" hint="z. B. Nachtruhe ab 22 Uhr, Rauchverbot, Abfall." optional>
            <Textarea id="houseRules" name="houseRules" rows={5} defaultValue={room.houseRules ?? ""} />
          </Field>
          <h3 className="pt-2 font-semibold">Stornierungsregeln</h3>
          <p className="-mt-2 text-sm text-ink-500">Aktuell: {describePolicy(p)}</p>
          <Field label="Vorlage" htmlFor="policyPreset">
            <Select id="policyPreset" name="policyPreset" defaultValue={preset}>
              {Object.entries(POLICY_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label} – {v.description}</option>)}
              <option value="custom">Individuell (unten festlegen)</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kostenlos bis … Std. vorher" htmlFor="freeUntilHours"><Input id="freeUntilHours" name="freeUntilHours" type="number" min={0} defaultValue={p.freeUntilHours} /></Field>
            <Field label="Danach Rückerstattung (%)" htmlFor="partialRefundPercent"><Input id="partialRefundPercent" name="partialRefundPercent" type="number" min={0} max={100} defaultValue={p.partialRefundPercent} /></Field>
            <Field label="… bis Std. vorher" htmlFor="partialUntilHours"><Input id="partialUntilHours" name="partialUntilHours" type="number" min={0} defaultValue={p.partialUntilHours} /></Field>
          </div>
          <p className="text-xs text-ink-500">Rückerstattungen online bezahlter Buchungen erfolgen automatisch nach diesen Regeln. Prüfen Sie Ihre Regeln auf Vereinbarkeit mit Ihren AGB.</p>
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </CardBody>
    </Card>
  );
}

async function PublishTab({ room, check }: { room: Room; check: Awaited<ReturnType<typeof publishChecklist>> }) {
  const url = appUrl(`/r/${room.slug}`);
  const ical = appUrl(`/api/ical/${room.icalToken}`);
  const hasFeeds = await db.select({ id: schema.calendarFeeds.id }).from(schema.calendarFeeds).where(and(eq(schema.calendarFeeds.roomId, room.id))).limit(1);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Checkliste" />
        <CardBody>
          <ul className="space-y-2.5">
            {check.items.map((i) => (
              <li key={i.label} className="flex items-start gap-2.5 text-sm">
                {i.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Circle className={cn("mt-0.5 size-4 shrink-0", i.required ? "text-accent-500" : "text-ink-300")} />}
                <span className={i.done ? "text-ink-600" : "text-ink-900"}>{i.label}{!i.required && <span className="text-ink-400"> (empfohlen)</span>}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            {room.status !== "published" && room.status !== "archived" && (
              <ActionForm action={publishAction} className="space-y-0">
                <input type="hidden" name="roomId" value={room.id} /><input type="hidden" name="op" value="publish" />
                <SubmitButton>Jetzt veröffentlichen</SubmitButton>
              </ActionForm>
            )}
            {room.status === "published" && (
              <ActionForm action={publishAction} className="space-y-0" confirm="Raum offline nehmen? Neue Buchungen sind dann nicht mehr möglich.">
                <input type="hidden" name="roomId" value={room.id} /><input type="hidden" name="op" value="unpublish" />
                <SubmitButton variant="secondary">Offline nehmen</SubmitButton>
              </ActionForm>
            )}
            {room.status !== "archived" ? (
              <ActionForm action={publishAction} className="space-y-0" confirm="Raum archivieren? Er ist danach nicht mehr buchbar und zählt nicht mehr zum Raumlimit.">
                <input type="hidden" name="roomId" value={room.id} /><input type="hidden" name="op" value="archive" />
                <SubmitButton variant="danger-ghost">Archivieren</SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={publishAction} className="space-y-0">
                <input type="hidden" name="roomId" value={room.id} /><input type="hidden" name="op" value="restore" />
                <SubmitButton variant="secondary">Wiederherstellen</SubmitButton>
              </ActionForm>
            )}
          </div>
        </CardBody>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Adresse der Buchungsseite" />
          <CardBody className="space-y-4">
            <CopyField value={url} label="Buchungslink" />
            <ActionForm action={publishAction}>
              <input type="hidden" name="roomId" value={room.id} /><input type="hidden" name="op" value="slug" />
              <Field label="Eigene Adresse" htmlFor="slug" hint="Nur Kleinbuchstaben, Ziffern und Bindestriche.">
                <div className="flex items-center gap-2"><span className="text-sm text-ink-500">/r/</span><Input id="slug" name="slug" defaultValue={room.slug} /></div>
              </Field>
              <SubmitButton variant="secondary" size="sm">Adresse ändern</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Kalender-Export (iCal)" description="Abonnieren Sie diesen Link in Google Kalender, Outlook oder Apple Kalender, um alle Buchungen dieses Raums zu sehen." />
          <CardBody className="space-y-2">
            <CopyField value={ical} label="iCal-Link (geheim halten)" />
            {!hasFeeds.length && <p className="text-xs text-ink-500">Externe Termine importieren Sie unter <Link className="text-brand-700 underline" href="/app/verfuegbarkeit">Verfügbarkeit</Link>.</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
