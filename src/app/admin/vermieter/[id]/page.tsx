import { desc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth/guards";
import { listPlans } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { orgAdminAction, userAdminAction } from "../../actions";

export default async function OrgDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [o] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, id));
  if (!o) notFound();
  const [members, rooms, subs, invoices, plans, audit] = await Promise.all([
    db.select({ m: schema.memberships, u: schema.users }).from(schema.memberships).innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId)).where(eq(schema.memberships.orgId, id)),
    db.select().from(schema.rooms).where(eq(schema.rooms.orgId, id)),
    db.select().from(schema.subscriptions).where(eq(schema.subscriptions.orgId, id)).orderBy(desc(schema.subscriptions.createdAt)),
    db.select().from(schema.invoices).where(eq(schema.invoices.orgId, id)).orderBy(desc(schema.invoices.createdAt)).limit(12),
    listPlans(),
    db.select().from(schema.auditLog).where(eq(schema.auditLog.orgId, id)).orderBy(desc(schema.auditLog.createdAt)).limit(20),
  ]);
  return (
    <>
      <PageHeader title={o.name} description={`${o.contactEmail} · ${[o.street, o.postalCode, o.city].filter(Boolean).join(" ")} · ${o.vatNumber ?? "keine UID"}`} actions={<Link href={`/v/${o.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">Öffentliche Seite <ExternalLink className="size-3.5" /></Link>} />
      {o.suspendedAt && <Alert tone="error" className="mb-4" title={`Gesperrt seit ${formatDate(o.suspendedAt)}`}>{o.suspendedReason}</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Abo" action={<Badge>{o.subscriptionStatus}</Badge>} />
          <CardBody className="space-y-4">
            <Table>
              <thead><tr><th>Quelle</th><th>Tarif</th><th>Status</th><th>Betrag</th><th>Periode</th></tr></thead>
              <tbody>{subs.map((s) => <tr key={s.id}><td>{s.source}</td><td>{s.planKey}</td><td>{s.status}{s.cancelAtPeriodEnd ? " (gekündigt)" : ""}</td><td>{formatMoney(s.amountMonthly)}</td><td className="text-xs">{s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : "–"}</td></tr>)}</tbody>
            </Table>
            <ActionForm action={orgAdminAction} className="grid gap-3 rounded-xl bg-ink-50 p-4">
              <input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="op" value="grant" />
              <p className="text-sm font-medium">Tarif manuell freischalten (z. B. Pilotkunde)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select name="plan" aria-label="Tarif">{plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</Select>
                <Input name="until" type="date" aria-label="Bis" />
                <Input name="note" placeholder="Notiz" aria-label="Notiz" />
              </div>
              <SubmitButton size="sm" variant="secondary">Freischalten</SubmitButton>
            </ActionForm>
            {subs.some((s) => s.source === "manual" && s.status === "active") && (
              <ActionForm action={orgAdminAction}><input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="op" value="revoke-manual" /><SubmitButton size="sm" variant="danger-ghost">Manuelle Freischaltung beenden</SubmitButton></ActionForm>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Konto" />
          <CardBody className="space-y-4 text-sm">
            <p>Stripe Connect: {o.stripeAccountId ?? "nicht verbunden"} {o.stripeChargesEnabled ? <Badge tone="green">Zahlungen aktiv</Badge> : null}</p>
            <p>Verzeichnis: {o.directoryOptIn ? "sichtbar" : "nicht sichtbar"} · Registriert {formatDateTime(o.createdAt)}</p>
            {o.suspendedAt ? (
              <ActionForm action={orgAdminAction}><input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="op" value="unsuspend" /><SubmitButton variant="secondary">Sperre aufheben</SubmitButton></ActionForm>
            ) : (
              <ActionForm action={orgAdminAction} confirm="Konto sperren? Buchungsseiten werden sofort deaktiviert.">
                <input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="op" value="suspend" />
                <Field label="Grund" htmlFor="reason"><Input id="reason" name="reason" /></Field>
                <SubmitButton variant="danger">Konto sperren</SubmitButton>
              </ActionForm>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Benutzer" />
          <Table>
            <tbody>
              {members.map(({ m, u }) => (
                <tr key={u.id}>
                  <td>{u.name}<div className="text-xs text-ink-400">{u.email} · {m.role}{u.emailVerifiedAt ? "" : " · nicht bestätigt"}{u.totpEnabledAt ? " · 2FA" : ""}</div></td>
                  <td className="text-xs">{u.lastLoginAt ? `Login ${formatDateTime(u.lastLoginAt)}` : "nie angemeldet"}</td>
                  <td className="flex justify-end gap-1">
                    <ActionForm action={userAdminAction} className="space-y-0"><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="op" value="logout" /><SubmitButton size="sm" variant="ghost">Abmelden</SubmitButton></ActionForm>
                    <ActionForm action={userAdminAction} className="space-y-0"><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="op" value={u.disabledAt ? "enable" : "disable"} /><SubmitButton size="sm" variant={u.disabledAt ? "secondary" : "danger-ghost"}>{u.disabledAt ? "Entsperren" : "Deaktivieren"}</SubmitButton></ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Räume" />
          <Table><tbody>{rooms.map((r) => <tr key={r.id}><td><Link href={`/r/${r.slug}`} target="_blank" className="hover:underline">{r.name}</Link></td><td>{r.status}</td><td>{r.city}</td></tr>)}</tbody></Table>
        </Card>
        <Card>
          <CardHeader title="Rechnungen" />
          <Table><tbody>{invoices.map((i) => <tr key={i.id}><td>{formatDate(i.createdAt)}</td><td>{i.number}</td><td>{formatMoney(i.amountDue)}</td><td>{i.status}</td><td>{i.hostedInvoiceUrl && <a className="text-brand-700 hover:underline" href={i.hostedInvoiceUrl} target="_blank" rel="noopener">öffnen</a>}</td></tr>)}</tbody></Table>
        </Card>
        <Card>
          <CardHeader title="Letzte Ereignisse" />
          <Table><tbody>{audit.map((a) => <tr key={a.id}><td className="text-xs">{formatDateTime(a.createdAt)}</td><td>{a.action}</td><td className="text-xs text-ink-400">{a.ip}</td></tr>)}</tbody></Table>
        </Card>
      </div>
    </>
  );
}
