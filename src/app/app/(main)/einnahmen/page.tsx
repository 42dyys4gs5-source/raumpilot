import { desc, eq } from "drizzle-orm";
import { BarChart3, CheckCircle2, Clock, Download, ExternalLink } from "lucide-react";
import { DateTime } from "luxon";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader, Stat, Table } from "@/components/ui/card";
import { FeatureLocked } from "@/components/dashboard/feature-gate";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { paymentsEnabled } from "@/lib/env";
import { gateway } from "@/lib/payments/gateway";
import { orgStats } from "@/lib/stats";
import { formatDateTime } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { connectStripeAction, refreshStripeAction } from "./actions";

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ stripe?: string }> }) {
  const ctx = await requireOrg("admin");
  const { stripe } = await searchParams;
  let org = ctx.org;
  // Back from Stripe onboarding: fetch the account status right away instead of waiting for the webhook.
  if (stripe === "zurueck" && paymentsEnabled && org.stripeAccountId) {
    try {
      const s = await gateway().retrieveAccount(org.stripeAccountId);
      const status = { stripeChargesEnabled: s.chargesEnabled, stripePayoutsEnabled: s.payoutsEnabled, stripeDetailsSubmitted: s.detailsSubmitted };
      await db.update(schema.organizations).set(status).where(eq(schema.organizations.id, org.id));
      org = { ...org, ...status };
    } catch {
      // The webhook or the «Status aktualisieren» button will catch up.
    }
  }
  const features = ctx.plan?.features;
  const [payments, stats] = await Promise.all([
    db.select({ p: schema.payments, ref: schema.bookings.reference, customer: schema.bookings.customerName, bookingId: schema.bookings.id })
      .from(schema.payments).leftJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
      .where(eq(schema.payments.orgId, org.id)).orderBy(desc(schema.payments.createdAt)).limit(50),
    orgStats(org.id, org.timezone),
  ]);
  const max = Math.max(1, ...stats.monthly.map((m) => m.revenue));

  return (
    <>
      <PageHeader title="Zahlungen & Einnahmen" actions={ctx.role !== "staff" ? <a href="/api/export/payments" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-ink-200 hover:bg-ink-50"><Download className="size-4" /> CSV-Export</a> : null} />
      {stripe === "zurueck" && <Alert tone="info" className="mb-4">Willkommen zurück. Falls Stripe noch Angaben benötigt, sehen Sie das unten. Der Status wird automatisch aktualisiert.</Alert>}

      <Card className="mb-6">
        <CardHeader title="Onlinezahlung mit Stripe" description="Mieter bezahlen bei der Buchung per Karte oder – sofern in Ihrem Stripe-Konto aktiviert – mit TWINT. Das Geld fliesst direkt auf Ihr Stripe-Konto; Sie sind Zahlungsempfänger." action={
          org.stripeChargesEnabled ? <Badge tone="green"><CheckCircle2 className="size-3" /> Aktiv</Badge> : org.stripeAccountId ? <Badge tone="amber"><Clock className="size-3" /> In Prüfung</Badge> : <Badge>Nicht verbunden</Badge>
        } />
        <CardBody className="space-y-4">
          {!paymentsEnabled ? (
            <Alert tone="info">Onlinezahlungen sind auf dieser Installation noch nicht aktiviert. Sie können Buchungen bis dahin per Rechnung oder vor Ort abrechnen.</Alert>
          ) : org.stripeChargesEnabled ? (
            <div className="flex flex-wrap gap-2">
              <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-ink-200 hover:bg-ink-50">Stripe-Dashboard <ExternalLink className="size-4" /></a>
              <ActionForm action={refreshStripeAction} className="space-y-0"><SubmitButton variant="ghost">Status aktualisieren</SubmitButton></ActionForm>
            </div>
          ) : ctx.role === "owner" ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-600">Stripe verlangt gesetzlich vorgeschriebene Angaben (Identität, Bankkonto, ggf. Handelsregister). Die Prüfung dauert meist wenige Minuten bis Tage.</p>
              <div className="flex flex-wrap gap-2">
                <ActionForm action={connectStripeAction} className="space-y-0"><SubmitButton>{org.stripeAccountId ? "Einrichtung bei Stripe fortsetzen" : "Stripe-Konto verbinden"}</SubmitButton></ActionForm>
                {org.stripeAccountId && <ActionForm action={refreshStripeAction} className="space-y-0"><SubmitButton variant="ghost">Status aktualisieren</SubmitButton></ActionForm>}
              </div>
            </div>
          ) : <p className="text-sm text-ink-500">Nur die Kontoinhaberin bzw. der Kontoinhaber kann Stripe verbinden.</p>}
          <details className="text-sm text-ink-600">
            <summary className="cursor-pointer font-medium text-ink-800">Gebühren & Zahlungsarten</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Stripe belastet Ihnen die Transaktionsgebühren direkt gemäss Ihrem Stripe-Vertrag (aktuelle Preise auf stripe.com/ch/pricing).</li>
              <li>Raumvia erhebt derzeit keine zusätzliche Buchungsprovision.</li>
              <li>TWINT erscheint im Checkout, wenn es in Ihrem Stripe-Konto unter «Zahlungsmethoden» aktiviert ist (Konten mit Sitz in der Schweiz, Zahlungen in CHF).</li>
              <li>Rückerstattungen nach Ihren Stornierungsregeln werden automatisch über Stripe ausgelöst.</li>
            </ul>
          </details>
        </CardBody>
      </Card>

      {features?.statistics ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Umsatz diesen Monat" value={formatMoney(stats.thisMonth.revenue)} hint={`${stats.thisMonth.n} Buchungen`} icon={<BarChart3 />} />
            <Stat label="Vormonat" value={formatMoney(stats.lastMonth.revenue)} hint={`${stats.lastMonth.n} Buchungen`} />
            <Stat label="Seit Jahresbeginn" value={formatMoney(stats.ytd.revenue)} hint={`${Math.round(stats.ytd.hours)} gebuchte Stunden`} />
            <Stat label="Offen (Rechnung/vor Ort)" value={formatMoney(stats.openOffline)} />
          </div>
          <Card className="mb-6">
            <CardHeader title="Umsatz der letzten 12 Monate" description="Bestätigte Buchungen nach Mietdatum, ohne Kaution." />
            <CardBody>
              <div className="flex h-48 items-end gap-2" role="img" aria-label="Balkendiagramm Monatsumsatz">
                {Array.from({ length: 12 }, (_, i) => DateTime.now().setZone(org.timezone).minus({ months: 11 - i }).toFormat("yyyy-LL")).map((m) => {
                  const v = stats.monthly.find((x) => x.month === m)?.revenue ?? 0;
                  return (
                    <div key={m} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-brand-600/85 transition-all" style={{ height: `${Math.max(2, (v / max) * 160)}px` }} title={`${m}: ${formatMoney(v)}`} />
                      <span className="text-[10px] text-ink-500">{DateTime.fromFormat(m, "yyyy-LL").setLocale("de-CH").toFormat("LLL")}</span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
          {features.advancedStatistics ? (
            <Card className="mb-6">
              <CardHeader title="Auswertung pro Raum (seit Jahresbeginn)" description={`Stornoquote 12 Monate: ${(stats.cancellationRate * 100).toFixed(1)} % · Ø Vorlauf: ${stats.avgLeadDays != null ? `${stats.avgLeadDays.toFixed(1)} Tage` : "–"}`} />
              <Table>
                <thead><tr><th>Raum</th><th>Buchungen</th><th>Stunden</th><th className="text-right">Umsatz</th></tr></thead>
                <tbody>{stats.perRoom.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.n}</td><td>{Math.round(r.hours)}</td><td className="text-right tabular-nums">{formatMoney(r.revenue)}</td></tr>)}</tbody>
              </Table>
            </Card>
          ) : <p className="mb-6 text-sm text-ink-500">Auswertungen pro Raum, Stornoquote und Vorlaufzeiten sind im Tarif Business enthalten.</p>}
        </>
      ) : <div className="mb-6"><FeatureLocked feature="statistics" /></div>}

      <Card>
        <CardHeader title="Zahlungsjournal" description="Die letzten 50 Zahlungen und Rückerstattungen." />
        {payments.length === 0 ? <CardBody><p className="text-sm text-ink-500">Noch keine Zahlungen.</p></CardBody> : (
          <Table>
            <thead><tr><th>Datum</th><th>Buchung</th><th>Art</th><th>Status</th><th className="text-right">Betrag</th></tr></thead>
            <tbody>
              {payments.map(({ p, ref, customer, bookingId }) => (
                <tr key={p.id}>
                  <td className="text-xs">{formatDateTime(p.createdAt, org.timezone)}</td>
                  <td>{bookingId ? <a href={`/app/buchungen/${bookingId}`} className="text-brand-700 hover:underline">{ref}</a> : "–"}<div className="text-xs text-ink-400">{customer}</div></td>
                  <td>{p.kind === "refund" ? "Rückerstattung" : p.kind === "offline" ? "Manuell" : "Online"}</td>
                  <td>{p.status === "succeeded" ? <Badge tone="green">erfolgreich</Badge> : p.status === "pending" ? <Badge tone="amber">ausstehend</Badge> : <Badge tone="red">fehlgeschlagen</Badge>}</td>
                  <td className="text-right tabular-nums">{p.kind === "refund" ? "– " : ""}{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
