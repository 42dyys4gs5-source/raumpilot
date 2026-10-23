import { AlertTriangle, Building2, CalendarCheck2, CreditCard, LifeBuoy, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Alert, Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { platformMetrics } from "@/lib/admin/metrics";
import { env, paymentsEnabled } from "@/lib/env";
import { getOperator } from "@/lib/settings";
import { formatMoney } from "@/lib/utils/money";

export default async function AdminHome() {
  const [m, op] = await Promise.all([platformMetrics(), getOperator()]);
  const warnings = [
    !paymentsEnabled && "Onlinezahlungen/Abo-Abrechnung sind deaktiviert (PAYMENTS_MODE).",
    env.PAYMENTS_MODE === "fake" && "Testmodus für Zahlungen aktiv – nur für Tests!",
    env.EMAIL_MODE === "log" && "E-Mails werden nur protokolliert, nicht versendet (EMAIL_MODE=log).",
    !op.name && "Betreiberangaben (Impressum) fehlen – Admin › Einstellungen.",
    !env.ADMIN_ALERT_EMAIL && "ADMIN_ALERT_EMAIL ist nicht gesetzt – Sie erhalten keine Fehlerwarnungen.",
  ].filter(Boolean) as string[];
  const max = Math.max(1, ...m.signups.map((s) => s.n));
  return (
    <>
      <PageHeader title="Plattform-Übersicht" />
      {warnings.length > 0 && <Alert tone="warning" className="mb-6" title="Konfiguration prüfen"><ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR (Stripe)" value={formatMoney(m.subs.mrr)} icon={<TrendingUp />} hint={`${m.subs.manual} manuelle Freischaltungen`} />
        <Stat label="Aktive Abos" value={m.subs.active} icon={<CreditCard />} hint={`${m.subs.trialing} in Testphase · ${m.subs.past_due} Zahlung offen`} />
        <Stat label="Abo-Umsatz gesamt" value={formatMoney(m.invoices.revenue)} hint={`letzte 30 Tage ${formatMoney(m.invoices.revenue30)}`} />
        <Stat label="Vermieter" value={m.orgs.total} icon={<Building2 />} hint={`+${m.orgs.new30} in 30 Tagen · ${m.orgs.suspended} gesperrt`} />
        <Stat label="Kündigungen (30 T.)" value={m.churn.n30} hint={`${m.churn.scheduled} zum Laufzeitende vorgemerkt`} />
        <Stat label="Fehlgeschlagene Zahlungen" value={m.failed.n} hint="offene Rechnungen, 60 Tage" />
        <Stat label="Buchungsvolumen (30 T.)" value={formatMoney(m.bookings.volume30)} icon={<CalendarCheck2 />} hint={`${m.bookings.n30} bestätigte Buchungen`} />
        <Stat label="Räume online" value={m.rooms.published} hint={`+${m.rooms.new30} neue Räume in 30 Tagen`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="Neuregistrierungen pro Woche" />
          <CardBody>
            {m.signups.length === 0 ? <p className="text-sm text-ink-500">Noch keine Registrierungen.</p> : (
              <div className="flex h-40 items-end gap-2">{m.signups.map((s) => <div key={s.week} className="flex flex-1 flex-col items-center gap-1"><span className="text-xs text-ink-500">{s.n}</span><div className="w-full rounded-t bg-brand-600" style={{ height: `${(s.n / max) * 120}px` }} /><span className="text-[10px] text-ink-400">{s.week.slice(5)}</span></div>)}</div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Handlungsbedarf" />
          <CardBody className="space-y-3 text-sm">
            <Link href="/admin/support" className="flex items-center gap-2 hover:underline"><LifeBuoy className="size-4 text-brand-700" /> {m.tickets.open} offene Supportanfragen</Link>
            <Link href="/admin/fehler" className="flex items-center gap-2 hover:underline"><AlertTriangle className="size-4 text-red-600" /> {m.errors.open} ungelöste Fehler ({m.errors.d1} in 24 Std.)</Link>
            <Link href="/admin/abos" className="flex items-center gap-2 hover:underline"><CreditCard className="size-4 text-amber-600" /> {m.subs.past_due} Abos mit offener Zahlung</Link>
          </CardBody>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Aktivierungs-Funnel (letzte 30 Tage)" />
        <CardBody>
          {(() => {
            const labels: Record<string, string> = {
              "funnel.registration_started": "Registrierung gestartet",
              "user.registered": "Registrierung abgeschlossen",
              "funnel.first_room_created": "Erster Raum erstellt",
              "funnel.private_preview_viewed": "Private Vorschau angesehen",
              "funnel.plan_selection_opened": "Tarifauswahl geöffnet",
              "billing.checkout_started": "Checkout gestartet",
              "funnel.subscription_activated": "Abo aktiviert",
              "funnel.first_room_published": "Erster Raum veröffentlicht",
            };
            const values = new Map(m.funnel.map((item) => [item.action, item.organisations]));
            return <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(labels).map(([action, label]) => <li key={action} className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3 text-sm"><span>{label}</span><strong className="tabular-nums text-brand-800">{values.get(action) ?? 0}</strong></li>)}</ol>;
          })()}
          <p className="mt-3 text-xs text-ink-500">Registrierungsstarts werden mit zufälliger Sitzungs-ID dedupliziert; übrige Schritte zählen Organisationen. Keine IP- oder User-Agent-Daten für diese Auswertung.</p>
        </CardBody>
      </Card>
    </>
  );
}
