import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";
import { loadBookingByToken } from "@/lib/booking/customer";
import { formatDateTime, formatRange } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Zahlungsbeleg", robots: { index: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await loadBookingByToken(token);
  if (!d || d.booking.amountPaid === 0) notFound();
  const { booking: b, room, org } = d;
  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-sm print:p-0">
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>
      <div className="flex justify-between gap-6">
        <div>
          <p className="text-lg font-semibold">{org.legalName || org.name}</p>
          <p className="text-ink-600">{org.street}<br />{org.postalCode} {org.city}<br />{org.contactEmail}</p>
          {org.vatRegistered && org.vatNumber && <p className="mt-1 text-ink-600">MWST-Nr. {org.vatNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">Zahlungsbeleg</p>
          <p className="text-ink-600">Nr. {b.reference}</p>
          <p className="text-ink-600">Datum: {formatDateTime(b.confirmedAt ?? b.createdAt, room.timezone)}</p>
        </div>
      </div>
      <div className="mt-8">
        <p className="text-ink-500">Mieter/in</p>
        <p>{b.customerName}{b.customerCompany ? `, ${b.customerCompany}` : ""}<br />{b.customerEmail}</p>
      </div>
      <div className="mt-6">
        <p className="text-ink-500">Leistung</p>
        <p>Raummiete «{room.name}», {formatRange(b.startsAt, b.endsAt, room.timezone)}, {b.guests} Personen</p>
      </div>
      <table className="mt-6 w-full">
        <tbody>
          {b.priceBreakdown.lines.map((l, i) => (
            <tr key={i} className="border-b border-ink-100"><td className="py-2">{l.label}</td><td className="py-2 text-right tabular-nums">{formatMoney(l.amount)}</td></tr>
          ))}
          <tr className="font-semibold"><td className="py-2">Total</td><td className="py-2 text-right">{formatMoney(b.totalAmount)}</td></tr>
          {b.priceBreakdown.vatAmount > 0 && <tr className="text-ink-600"><td className="py-1">enthaltene MWST {(b.priceBreakdown.vatRateBp / 100).toFixed(1)} %</td><td className="py-1 text-right">{formatMoney(b.priceBreakdown.vatAmount)}</td></tr>}
          <tr><td className="py-1">Bezahlt</td><td className="py-1 text-right">{formatMoney(b.amountPaid)}</td></tr>
          {b.amountRefunded > 0 && <tr><td className="py-1">Rückerstattet</td><td className="py-1 text-right">– {formatMoney(b.amountRefunded)}</td></tr>}
        </tbody>
      </table>
      <p className="mt-8 text-xs text-ink-500">Zahlung {b.paymentMode === "online" ? "online über Stripe" : "per Rechnung/vor Ort"} an {org.legalName || org.name}. Dieser Beleg wurde elektronisch erstellt und ist ohne Unterschrift gültig.{!org.vatRegistered && " Der Vermieter ist nicht als MWST-pflichtig erfasst."}</p>
    </div>
  );
}
