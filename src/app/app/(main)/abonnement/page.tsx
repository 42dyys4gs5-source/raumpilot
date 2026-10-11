import { desc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { PlanCards } from "@/components/billing/plan-cards";
import { requireOrg } from "@/lib/auth/guards";
import { listPlans, roomUsage } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { paymentsEnabled } from "@/lib/env";
import { vatNote } from "@/lib/settings";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { portalAction, subscribeAction } from "./actions";

const SUB_STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" | "blue" }> = {
  active: { label: "Aktiv", tone: "green" },
  trialing: { label: "Testphase", tone: "blue" },
  past_due: { label: "Zahlung offen", tone: "amber" },
  unpaid: { label: "Unbezahlt", tone: "red" },
  canceled: { label: "Beendet", tone: "neutral" },
  incomplete: { label: "Unvollständig", tone: "amber" },
  incomplete_expired: { label: "Abgebrochen", tone: "neutral" },
  paused: { label: "Pausiert", tone: "neutral" },
  none: { label: "Kein Abo", tone: "neutral" },
};

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireOrg();
  const { status } = await searchParams;
  const [plans, subs, invoices, used, note] = await Promise.all([
    listPlans(),
    db.select().from(schema.subscriptions).where(eq(schema.subscriptions.orgId, ctx.org.id)).orderBy(desc(schema.subscriptions.createdAt)),
    db.select().from(schema.invoices).where(eq(schema.invoices.orgId, ctx.org.id)).orderBy(desc(schema.invoices.createdAt)).limit(24),
    roomUsage(ctx.org.id),
    vatNote(),
  ]);
  const current = subs.find((s) => ["active", "trialing", "past_due"].includes(s.status)) ?? subs[0];
  const st = SUB_STATUS[ctx.org.subscriptionStatus] ?? { label: ctx.org.subscriptionStatus, tone: "neutral" as const };
  const isOwner = ctx.role === "owner";

  return (
    <>
      <PageHeader title="Abonnement" description="Tarif, Zahlungsmittel, Rechnungen und Kündigung." />
      {status === "erfolgreich" && <Alert tone="success" className="mb-4" title="Vielen Dank!">Ihr Abo wird aktiviert. Die Bestätigung durch den Zahlungsanbieter kann einige Sekunden dauern.</Alert>}
      {status === "abgebrochen" && <Alert tone="warning" className="mb-4">Der Bezahlvorgang wurde abgebrochen. Es wurde nichts belastet.</Alert>}
      {!paymentsEnabled && <Alert tone="info" className="mb-4" title="Online-Abrechnung noch nicht aktiviert">Diese Installation ist noch nicht mit dem Zahlungsanbieter verbunden. Für einen Pilotzugang kontaktieren Sie bitte den Support.</Alert>}

      <Card className="mb-8">
        <CardHeader title="Ihr Abo" action={<Badge tone={st.tone}>{st.label}</Badge>} />
        <CardBody>
          {ctx.plan ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-sm text-ink-500">Tarif</p><p className="font-semibold">{ctx.plan.name}</p></div>
              <div><p className="text-sm text-ink-500">Räume</p><p className="font-semibold">{used} von {ctx.plan.maxRooms}</p></div>
              <div>
                <p className="text-sm text-ink-500">{current?.cancelAtPeriodEnd ? "Endet am" : current?.status === "trialing" ? "Testphase bis" : "Nächste Verlängerung"}</p>
                <p className="font-semibold">{current?.currentPeriodEnd ? formatDate(current.currentPeriodEnd) : current?.source === "manual" ? "unbefristet" : "–"}</p>
              </div>
              {current?.source === "manual" && <p className="text-sm text-ink-500 sm:col-span-3">Dieser Zugang wurde manuell freigeschaltet{current.note ? ` (${current.note})` : ""}.</p>}
              {current?.cancelAtPeriodEnd && <Alert tone="warning" className="sm:col-span-3">Ihr Abo ist gekündigt und endet am {current.currentPeriodEnd ? formatDate(current.currentPeriodEnd) : "Laufzeitende"}. Sie können die Kündigung im Kundenportal zurücknehmen.</Alert>}
            </div>
          ) : (
            <p className="text-sm text-ink-600">Sie haben noch keinen aktiven Tarif. Wählen Sie unten einen Tarif, um Ihre Räume zu veröffentlichen.</p>
          )}
          {isOwner && ctx.org.stripeCustomerId && paymentsEnabled && (
            <ActionForm action={portalAction} className="mt-6">
              <SubmitButton variant="secondary">Tarif wechseln, Zahlungsmittel ändern oder kündigen</SubmitButton>
              <p className="text-xs text-ink-500">Sie werden zum sicheren Kundenportal von Stripe weitergeleitet. Upgrades gelten sofort (anteilig verrechnet), Kündigungen zum Ende der bezahlten Laufzeit.</p>
            </ActionForm>
          )}
        </CardBody>
      </Card>

      {(!ctx.plan || !ctx.org.stripeCustomerId) && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Tarif wählen</h2>
          {isOwner ? (
            <PlanCards plans={plans} currentKey={ctx.plan?.key} action={subscribeAction} vatNote={note} />
          ) : (
            <Alert tone="info">Nur die Kontoinhaberin bzw. der Kontoinhaber kann das Abo verwalten.</Alert>
          )}
        </section>
      )}

      <Card>
        <CardHeader title="Rechnungen" description="Rechnungen und Zahlungsbelege werden von Stripe erstellt und Ihnen zusätzlich per E-Mail zugestellt." />
        {invoices.length === 0 ? (
          <CardBody><p className="text-sm text-ink-500">Noch keine Rechnungen.</p></CardBody>
        ) : (
          <Table>
            <thead><tr><th>Datum</th><th>Nummer</th><th>Betrag</th><th>Status</th><th /></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>{formatDate(i.createdAt)}</td>
                  <td>{i.number ?? "–"}</td>
                  <td className="tabular-nums">{formatMoney(i.amountDue, i.currency)}</td>
                  <td>{i.status === "paid" ? <Badge tone="green">Bezahlt</Badge> : i.status === "open" ? <Badge tone="amber">Offen</Badge> : <Badge>{i.status}</Badge>}</td>
                  <td className="text-right">{i.hostedInvoiceUrl && <a href={i.hostedInvoiceUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand-700 hover:underline">Öffnen <ExternalLink className="size-3.5" /></a>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
