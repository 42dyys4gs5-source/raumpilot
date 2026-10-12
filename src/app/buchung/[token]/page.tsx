import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Badge, Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { PaymentStatusRefresh } from "@/components/booking/payment-status-refresh";
import { RescheduleForm } from "@/components/booking/reschedule-form";
import { loadBookingByToken } from "@/lib/booking/customer";
import { PAYMENT_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/booking/labels";
import { canCustomerReschedule, computeRefund, describePolicy } from "@/lib/booking/policy";
import { formatDateTime, formatRange } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { customerCancelAction, customerRescheduleAction } from "./actions";

export const metadata: Metadata = { title: "Ihre Buchung", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ManageBookingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ zahlung?: string; storniert?: string }> }) {
  const { token } = await params;
  const { zahlung, storniert } = await searchParams;
  const d = await loadBookingByToken(token);
  if (!d) notFound();
  const { booking: b, room, org } = d;
  const now = new Date();
  const active = ["requested", "awaiting_payment", "pending_payment", "confirmed"].includes(b.status);
  const future = b.startsAt > now;
  const refundPreview = computeRefund({
    policy: room.cancellationPolicy,
    startsAt: b.startsAt,
    now,
    amountPaid: b.paymentMode === "online" ? b.amountPaid : 0,
    amountRefunded: b.amountRefunded,
    depositAmount: b.depositAmount,
    cancelledBy: "customer",
  });
  const payable = (b.status === "awaiting_payment" || b.status === "pending_payment") && b.paymentMode === "online";
  const processing = zahlung === "erfolgreich" && (b.status === "pending_payment" || b.status === "awaiting_payment");

  return (
    <div className="min-h-dvh bg-ink-50 py-8 sm:py-12">
      {processing && <PaymentStatusRefresh />}
      <div className="container-page max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-ink-500">{org.name}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Buchung {b.reference}</h1>
          <div className="mt-2"><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></div>
        </div>
        {storniert && b.status === "cancelled" && <Alert tone="success" title="Ihre Buchung wurde storniert.">{storniert === "erstattet" ? "Die Rückerstattung ist veranlasst. Die Gutschrift dauert je nach Bank 5–10 Bankarbeitstage." : "Sie erhalten eine Bestätigung per E-Mail."}</Alert>}
        {processing && <Alert tone="info" title="Zahlung wird bestätigt">Vielen Dank! Wir warten auf die Bestätigung des Zahlungsanbieters. Diese Seite aktualisiert sich automatisch.</Alert>}
        {zahlung === "abgebrochen" && payable && <Alert tone="warning" title="Zahlung abgebrochen">Die Zahlung wurde nicht abgeschlossen. Sie können es erneut versuchen, solange die Reservation gültig ist.</Alert>}
        {b.status === "confirmed" && zahlung === "erfolgreich" && <Alert tone="success" title="Zahlung erhalten – Buchung bestätigt">Eine Bestätigung mit allen Details ist per E-Mail unterwegs.</Alert>}
        {b.status === "requested" && <Alert tone="info" title="Anfrage beim Vermieter">{org.name} prüft Ihre Anfrage{b.requestExpiresAt ? ` und antwortet bis spätestens ${formatDateTime(b.requestExpiresAt, room.timezone)}` : ""}.</Alert>}

        <Card>
          <CardHeader title={room.name} description={[room.street, [room.postalCode, room.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">
              <dt className="text-ink-500">Zeit</dt><dd className="font-medium">{formatRange(b.startsAt, b.endsAt, room.timezone)}</dd>
              <dt className="text-ink-500">Personen</dt><dd>{b.guests}</dd>
              <dt className="text-ink-500">Name</dt><dd>{b.customerName}{b.customerCompany ? `, ${b.customerCompany}` : ""}</dd>
              <dt className="text-ink-500">Zahlung</dt><dd>{PAYMENT_LABEL[b.paymentStatus]}</dd>
            </dl>
            <div className="mt-6 rounded-xl bg-ink-50 p-4">
              <dl className="space-y-1.5 text-sm">
                {b.priceBreakdown.lines.map((l, i) => <div key={i} className="flex justify-between gap-4"><dt className="text-ink-600">{l.label}</dt><dd className="tabular-nums">{formatMoney(l.amount)}</dd></div>)}
                <div className="flex justify-between border-t border-ink-200 pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(b.totalAmount)}</dd></div>
                {b.amountRefunded > 0 && <div className="flex justify-between text-emerald-700"><dt>Rückerstattet</dt><dd>{formatMoney(b.amountRefunded)}</dd></div>}
              </dl>
            </div>
            {b.paymentMode === "offline" && b.paymentStatus === "offline_due" && room.offlinePaymentNote && (
              <p className="mt-4 whitespace-pre-line rounded-lg border border-ink-200 p-3 text-sm text-ink-700">{room.offlinePaymentNote}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {payable && <ButtonLink href={`/buchung/${token}/bezahlen`} size="lg">Jetzt bezahlen</ButtonLink>}
              {(b.paymentStatus === "paid" || b.paymentStatus === "partially_refunded" || b.paymentStatus === "refunded") && <ButtonLink href={`/buchung/${token}/beleg`} variant="secondary">Zahlungsbeleg</ButtonLink>}
              {room.status === "published" && <ButtonLink href={`/r/${room.slug}`} variant="ghost">Raum ansehen</ButtonLink>}
            </div>
          </CardBody>
        </Card>

        {active && future && b.status === "confirmed" && canCustomerReschedule(room.cancellationPolicy, b.startsAt, now) && (
          <Card>
            <CardHeader title="Umbuchen" description="Gleiche Dauer, anderer Termin. Möglich bis zum Ende der kostenlosen Stornierungsfrist. Ist der neue Termin teurer, wenden Sie sich bitte an den Vermieter." />
            <CardBody>
              <RescheduleForm token={token} roomId={room.id} duration={Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000)} timezone={room.timezone} action={customerRescheduleAction} />
            </CardBody>
          </Card>
        )}

        {active && future && (
          <Card>
            <CardHeader title={b.status === "requested" ? "Anfrage zurückziehen" : "Buchung stornieren"} description={describePolicy(room.cancellationPolicy)} />
            <CardBody>
              {b.paymentMode === "online" && b.amountPaid > 0 && (
                <p className="mb-4 text-sm">Bei einer Stornierung jetzt erhalten Sie <strong>{formatMoney(refundPreview.refund)}</strong> zurück.</p>
              )}
              <ActionForm action={customerCancelAction} confirm="Möchten Sie die Buchung wirklich stornieren?">
                <input type="hidden" name="token" value={token} />
                <Field label="Grund (optional)" htmlFor="reason"><Textarea id="reason" name="reason" rows={2} maxLength={500} /></Field>
                <SubmitButton variant="danger">{b.status === "requested" ? "Anfrage zurückziehen" : "Verbindlich stornieren"}</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}

        <p className="text-center text-sm text-ink-500">
          Fragen zur Buchung? Kontaktieren Sie {org.name}: <a href={`mailto:${org.contactEmail}`} className="text-brand-700 underline">{org.contactEmail}</a>
          {org.phone ? ` · ${org.phone}` : ""}
        </p>
        <p className="text-center text-xs text-ink-400">Diese Seite ist nur über Ihren persönlichen Link erreichbar. Bitte geben Sie ihn nicht weiter. <Link href="/" className="underline">Raumvia</Link></p>
      </div>
    </div>
  );
}
