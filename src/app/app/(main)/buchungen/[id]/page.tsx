import { and, asc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { requireOrg } from "@/lib/auth/guards";
import { pendingRefundAmount } from "@/lib/booking/engine";
import { PAYMENT_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/booking/labels";
import { bookingUrl } from "@/lib/booking/links";
import { db, schema } from "@/lib/db";
import { dt, formatDateTime, formatRange } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { bookingAction } from "../actions";

const EVENT_LABEL: Record<string, string> = {
  created: "Erstellt", paid: "Bezahlt", approved: "Angenommen", declined: "Abgelehnt", cancelled: "Storniert", expired: "Abgelaufen",
  rescheduled: "Verschoben", refunded: "Rückerstattung ausgeführt", refund_requested: "Rückerstattung angefordert", refund_synced: "Rückerstattung (Stripe)",
  marked_paid: "Als bezahlt markiert", payment_failed: "Zahlung fehlgeschlagen", checkout_expired: "Zahlung abgebrochen", paid_late_reactivated: "Verspätete Zahlung – reaktiviert",
  paid_late_refunded: "Verspätete Zahlung – erstattet", abandoned: "Reservation verworfen",
};

function Op({ id, op, label, variant, confirm, children }: { id: string; op: string; label: string; variant?: "primary" | "secondary" | "danger" | "ghost"; confirm?: string; children?: React.ReactNode }) {
  return (
    <ActionForm action={bookingAction} confirm={confirm}>
      <input type="hidden" name="bookingId" value={id} />
      <input type="hidden" name="op" value={op} />
      {children}
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </ActionForm>
  );
}

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ neu?: string; erledigt?: string }> }) {
  const ctx = await requireOrg();
  const { id } = await params;
  const { neu, erledigt } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ b: schema.bookings, room: schema.rooms })
    .from(schema.bookings)
    .innerJoin(schema.rooms, eq(schema.rooms.id, schema.bookings.roomId))
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.orgId, ctx.org.id)));
  if (!row) notFound();
  const { b, room } = row;
  const [events, payments, pendingRefund] = await Promise.all([
    db.select().from(schema.bookingEvents).where(eq(schema.bookingEvents.bookingId, b.id)).orderBy(asc(schema.bookingEvents.createdAt)),
    db.select().from(schema.payments).where(eq(schema.payments.bookingId, b.id)).orderBy(asc(schema.payments.createdAt)),
    pendingRefundAmount(db, b.id),
  ]);
  const active = ["requested", "awaiting_payment", "pending_payment", "confirmed"].includes(b.status);
  const local = dt(b.startsAt, room.timezone);
  const refundable = b.amountPaid - b.amountRefunded - pendingRefund;

  return (
    <>
      <PageHeader
        title={`Buchung ${b.reference}`}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge> {room.name} · {formatRange(b.startsAt, b.endsAt, room.timezone)}</span>}
        actions={<Link href={bookingUrl(b.id)} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">Kundenansicht <ExternalLink className="size-3.5" /></Link>}
      />
      {neu && <Alert tone="success" className="mb-4">Buchung erfasst.</Alert>}
      {erledigt && (
        <Alert tone="success" className="mb-4">
          {{ approve: "Anfrage angenommen. Der Kunde wurde benachrichtigt.", decline: "Anfrage abgelehnt. Der Kunde wurde benachrichtigt.", cancel: "Buchung storniert. Der Kunde wurde benachrichtigt; allfällige Rückerstattungen sind veranlasst.", paid: "Als bezahlt markiert." }[erledigt] ?? "Erledigt."}
        </Alert>
      )}
      {b.calendarConflict && <Alert tone="error" className="mb-4" title="Kalenderkonflikt">Ein importierter externer Termin überschneidet sich mit dieser Buchung. Bitte prüfen Sie die Termine.</Alert>}
      {pendingRefund > 0 && (
        <Alert tone="warning" className="mb-4" title={`Rückerstattung über ${formatMoney(pendingRefund)} ausstehend`}>
          Die Rückerstattung konnte noch nicht ausgeführt werden.
          <div className="mt-2"><Op id={b.id} op="retry-refunds" label="Erneut versuchen" variant="secondary" /></div>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[150px_1fr]">
                <dt className="text-ink-500">Kunde</dt><dd><Link className="font-medium text-brand-700 hover:underline" href={b.customerId ? `/app/kunden/${b.customerId}` : "#"}>{b.customerName}</Link>{b.customerCompany ? `, ${b.customerCompany}` : ""}</dd>
                <dt className="text-ink-500">Kontakt</dt><dd><a href={`mailto:${b.customerEmail}`} className="hover:underline">{b.customerEmail}</a>{b.customerPhone ? <> · <a href={`tel:${b.customerPhone}`} className="hover:underline">{b.customerPhone}</a></> : null}</dd>
                <dt className="text-ink-500">Personen</dt><dd>{b.guests}</dd>
                <dt className="text-ink-500">Quelle</dt><dd>{b.source === "manual" ? "Manuell erfasst" : b.source === "widget" ? "Website-Widget" : "Buchungsseite"}</dd>
                <dt className="text-ink-500">Zahlung</dt><dd>{PAYMENT_LABEL[b.paymentStatus]}{b.paymentMode === "online" ? " (online)" : ""}</dd>
                {b.requestExpiresAt && b.status === "requested" && <><dt className="text-ink-500">Antwort bis</dt><dd>{formatDateTime(b.requestExpiresAt, room.timezone)}</dd></>}
                {b.paymentDueAt && b.status === "awaiting_payment" && <><dt className="text-ink-500">Zahlungsfrist</dt><dd>{formatDateTime(b.paymentDueAt, room.timezone)}</dd></>}
                {b.customerMessage && <><dt className="text-ink-500">Nachricht</dt><dd className="whitespace-pre-line">{b.customerMessage}</dd></>}
                {b.cancellationReason && <><dt className="text-ink-500">Grund</dt><dd>{b.cancellationReason}</dd></>}
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Preis" />
            <CardBody>
              <dl className="space-y-1.5 text-sm">
                {b.priceBreakdown.lines.map((l, i) => <div key={i} className="flex justify-between"><dt className="text-ink-600">{l.label}</dt><dd className="tabular-nums">{formatMoney(l.amount)}</dd></div>)}
                <div className="flex justify-between border-t border-ink-100 pt-2 font-semibold"><dt>Total</dt><dd>{formatMoney(b.totalAmount)}</dd></div>
                {b.priceBreakdown.vatAmount > 0 && <div className="flex justify-between text-xs text-ink-500"><dt>davon MWST</dt><dd>{formatMoney(b.priceBreakdown.vatAmount)}</dd></div>}
                <div className="flex justify-between text-ink-600"><dt>Bezahlt</dt><dd>{formatMoney(b.amountPaid)}</dd></div>
                {b.amountRefunded > 0 && <div className="flex justify-between text-ink-600"><dt>Rückerstattet</dt><dd>{formatMoney(b.amountRefunded)}</dd></div>}
              </dl>
              {payments.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-ink-100 pt-3 text-xs text-ink-500">
                  {payments.map((p) => <li key={p.id}>{formatDateTime(p.createdAt, room.timezone)} · {p.kind === "refund" ? "Rückerstattung" : p.kind === "offline" ? "Zahlung (manuell)" : "Zahlung online"} {formatMoney(p.amount)} · {p.status === "succeeded" ? "erfolgreich" : p.status === "pending" ? "ausstehend" : "fehlgeschlagen"}</li>)}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Verlauf" />
            <CardBody>
              <ol className="space-y-2 text-sm">
                {events.map((e) => <li key={e.id} className="flex gap-3"><span className="w-32 shrink-0 text-ink-400">{formatDateTime(e.createdAt, room.timezone)}</span><span>{EVENT_LABEL[e.type] ?? e.type}{e.actor.startsWith("user:") ? " (Team)" : e.actor === "customer" ? " (Kunde)" : ""}</span></li>)}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {b.status === "requested" && (
            <Card>
              <CardHeader title="Anfrage beantworten" />
              <CardBody className="space-y-4">
                <Op id={b.id} op="approve" label="Annehmen" />
                <Op id={b.id} op="decline" label="Ablehnen" variant="secondary">
                  <Field label="Nachricht an den Kunden" htmlFor="reason" optional><Textarea id="reason" name="reason" rows={2} /></Field>
                </Op>
              </CardBody>
            </Card>
          )}
          {b.paymentStatus === "offline_due" && active && (
            <Card><CardBody><Op id={b.id} op="paid" label="Zahlung erhalten – als bezahlt markieren" variant="secondary" /></CardBody></Card>
          )}
          {active && (
            <Card>
              <CardHeader title="Verschieben" />
              <CardBody>
                <Op id={b.id} op="reschedule" label="Verschieben" variant="secondary">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Datum" htmlFor="date"><Input id="date" name="date" type="date" defaultValue={local.toISODate()!} required /></Field>
                    <Field label="Beginn" htmlFor="time"><Input id="time" name="time" type="time" defaultValue={local.toFormat("HH:mm")} required /></Field>
                  </div>
                  <p className="text-xs text-ink-500">Dauer und Preis bleiben gleich. Öffnungszeiten werden nicht geprüft, Überschneidungen schon.</p>
                </Op>
              </CardBody>
            </Card>
          )}
          {refundable > 0 && b.paymentMode === "online" && (
            <Card>
              <CardHeader title="Rückerstattung" description={`Bis ${formatMoney(refundable)} möglich (z. B. Kaution).`} />
              <CardBody>
                <Op id={b.id} op="refund" label="Betrag erstatten" variant="secondary" confirm="Rückerstattung jetzt ausführen?">
                  <Field label="Betrag (CHF)" htmlFor="amount"><Input id="amount" name="amount" inputMode="decimal" required /></Field>
                </Op>
              </CardBody>
            </Card>
          )}
          {active && (
            <Card>
              <CardHeader title="Stornieren" description={b.amountPaid > 0 && b.paymentMode === "online" ? "Bei einer Stornierung durch Sie erhält der Kunde den vollen Betrag zurück." : undefined} />
              <CardBody>
                <Op id={b.id} op="cancel" label="Buchung stornieren" variant="danger" confirm="Buchung wirklich stornieren? Der Kunde wird informiert.">
                  <Field label="Grund (wird dem Kunden mitgeteilt)" htmlFor="creason" optional><Textarea id="creason" name="reason" rows={2} /></Field>
                </Op>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Interne Notiz" />
            <CardBody>
              <Op id={b.id} op="note" label="Speichern" variant="secondary">
                <Textarea name="internalNote" rows={3} defaultValue={b.internalNote ?? ""} aria-label="Interne Notiz" />
              </Op>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
