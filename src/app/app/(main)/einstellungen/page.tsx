import { and, eq, gt, isNull } from "drizzle-orm";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { listUserOrgs, requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import {
  changePasswordAction,
  deleteAccountAction,
  disableTotpAction,
  inviteAction,
  locationAction,
  memberAction,
  profileAction,
  switchOrgAction,
} from "./actions";

const TABS = [
  { key: "profil", label: "Firma & Steuern" },
  { key: "team", label: "Team" },
  { key: "standorte", label: "Standorte" },
  { key: "sicherheit", label: "Sicherheit" },
  { key: "daten", label: "Daten & Konto" },
];

const ROLE = { owner: "Inhaber/in", admin: "Administrator/in", staff: "Mitarbeiter/in" } as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; mfa?: string }> }) {
  const ctx = await requireOrg();
  const { tab = "profil", mfa } = await searchParams;
  const o = ctx.org;
  const canAdmin = ctx.role !== "staff";
  return (
    <>
      <PageHeader title="Einstellungen" />
      <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-ink-200 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link key={t.key} href={`/app/einstellungen?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium", tab === t.key ? "border-brand-700 text-brand-800" : "border-transparent text-ink-500 hover:text-ink-800")}>{t.label}</Link>
        ))}
      </nav>

      {tab === "profil" && (
        <Card>
          <CardBody>
            {!canAdmin ? <p className="text-sm text-ink-500">Nur Administratoren können diese Angaben ändern.</p> : (
              <ActionForm action={profileAction}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Anzeigename" htmlFor="name"><Input id="name" name="name" defaultValue={o.name} required /></Field>
                  <Field label="Rechtlicher Name (für Belege)" htmlFor="legalName" optional><Input id="legalName" name="legalName" defaultValue={o.legalName ?? ""} /></Field>
                  <Field label="Kontakt-E-Mail für Mieter" htmlFor="contactEmail"><Input id="contactEmail" name="contactEmail" type="email" defaultValue={o.contactEmail} required /></Field>
                  <Field label="Telefon" htmlFor="phone" optional><Input id="phone" name="phone" defaultValue={o.phone ?? ""} /></Field>
                  <Field label="Website" htmlFor="website" optional><Input id="website" name="website" type="url" defaultValue={o.website ?? ""} /></Field>
                </div>
                <h3 className="pt-2 font-semibold">Adresse (Rechnungsadresse)</h3>
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1.5fr_1fr]">
                  <Field label="Strasse" htmlFor="street"><Input id="street" name="street" defaultValue={o.street ?? ""} /></Field>
                  <Field label="PLZ" htmlFor="postalCode"><Input id="postalCode" name="postalCode" defaultValue={o.postalCode ?? ""} /></Field>
                  <Field label="Ort" htmlFor="city"><Input id="city" name="city" defaultValue={o.city ?? ""} /></Field>
                  <Field label="Land" htmlFor="country"><Select id="country" name="country" defaultValue={o.country}>{["CH", "LI", "DE", "AT", "FR", "IT"].map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                </div>
                <h3 className="pt-2 font-semibold">Mehrwertsteuer</h3>
                <Checkbox name="vatRegistered" defaultChecked={o.vatRegistered} label="Ich bin MWST-pflichtig" description="Dann weisen Belege die enthaltene MWST aus. Ob Ihre Raumvermietung steuerbar ist, klären Sie bitte mit Ihrer Treuhand (Raumvermietung ist teilweise von der Steuer ausgenommen)." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="UID / MWST-Nummer" htmlFor="vatNumber" optional><Input id="vatNumber" name="vatNumber" defaultValue={o.vatNumber ?? ""} placeholder="CHE-123.456.789 MWST" /></Field>
                  <Field label="MWST-Satz in %" htmlFor="vatRate"><Input id="vatRate" name="vatRate" inputMode="decimal" defaultValue={(o.vatRateBp / 100).toFixed(1)} /></Field>
                </div>
                <SubmitButton>Speichern</SubmitButton>
              </ActionForm>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "team" && <TeamTab ctx={ctx} />}
      {tab === "standorte" && <LocationsTab ctx={ctx} />}

      {tab === "sicherheit" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Passwort ändern" />
            <CardBody>
              <ActionForm action={changePasswordAction} resetOnSuccess>
                <Field label="Aktuelles Passwort" htmlFor="current"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
                <Field label="Neues Passwort" htmlFor="password" hint="Mindestens 10 Zeichen, zwei Zeichenarten."><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
                <SubmitButton>Passwort ändern</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Zwei-Faktor-Authentifizierung" description="Schützt Ihr Konto zusätzlich mit einem Code aus einer Authenticator-App." action={ctx.user.totpEnabledAt ? <Badge tone="green">Aktiv</Badge> : <Badge>Inaktiv</Badge>} />
            <CardBody>
              {mfa && <Alert tone="success" className="mb-4">Zwei-Faktor-Authentifizierung aktiviert.</Alert>}
              {ctx.user.totpEnabledAt ? (
                <ActionForm action={disableTotpAction}>
                  <Field label="Aktueller Code zum Deaktivieren" htmlFor="code"><Input id="code" name="code" inputMode="numeric" maxLength={7} /></Field>
                  <SubmitButton variant="danger-ghost">Deaktivieren</SubmitButton>
                </ActionForm>
              ) : <ButtonLink href="/konto/mfa">Einrichten</ButtonLink>}
            </CardBody>
          </Card>
          <OrgSwitcher userId={ctx.user.id} activeId={o.id} />
        </div>
      )}

      {tab === "daten" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Datenexport" description="Alle Daten Ihres Kontos (Räume, Buchungen, Kunden, Zahlungen) als JSON-Datei – z. B. für Ihre Buchhaltung oder einen Wechsel." />
            <CardBody className="flex flex-wrap gap-2">
              {ctx.role === "owner" ? <a href="/api/export/account" className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-ink-200 hover:bg-ink-50">Export herunterladen</a> : <p className="text-sm text-ink-500">Nur für die Kontoinhaberin bzw. den Kontoinhaber.</p>}
              {canAdmin && <a href="/api/export/payments" className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-brand-700 hover:underline">Zahlungen als CSV</a>}
            </CardBody>
          </Card>
          {ctx.role === "owner" && (
            <Card className="border-red-200">
              <CardHeader title="Konto löschen" description="Löscht Ihr Konto, alle Räume, Buchungen, Kunden und Fotos unwiderruflich und beendet Ihr Abo sofort. Exportieren Sie Ihre Daten vorher – Sie sind gesetzlich zur Aufbewahrung Ihrer Geschäftsunterlagen verpflichtet." />
              <CardBody>
                <ActionForm action={deleteAccountAction} confirm="Wirklich alles unwiderruflich löschen?">
                  <Field label={`Zur Bestätigung «${o.name}» eingeben`} htmlFor="confirm"><Input id="confirm" name="confirm" autoComplete="off" required /></Field>
                  <Field label="Passwort" htmlFor="dpw"><Input id="dpw" name="password" type="password" autoComplete="current-password" required /></Field>
                  <SubmitButton variant="danger">Konto endgültig löschen</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

async function TeamTab({ ctx }: { ctx: Awaited<ReturnType<typeof requireOrg>> }) {
  const members = await db
    .select({ m: schema.memberships, u: schema.users })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.orgId, ctx.org.id));
  const invites = await db.select().from(schema.invitations).where(and(eq(schema.invitations.orgId, ctx.org.id), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())));
  const allowed = !!ctx.plan?.features.team;
  const canAdmin = ctx.role !== "staff";
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Teammitglieder" description={allowed ? `${members.length + invites.length} von ${ctx.plan!.maxMembers} Plätzen belegt.` : "Teamzugänge sind im Tarif Business enthalten."} />
        <Table>
          <thead><tr><th>Name</th><th>Rolle</th><th /></tr></thead>
          <tbody>
            {members.map(({ m, u }) => (
              <tr key={u.id}>
                <td>{u.name}<div className="text-xs text-ink-400">{u.email}</div></td>
                <td>{ROLE[m.role]}</td>
                <td className="flex justify-end gap-1">
                  {canAdmin && m.role !== "owner" && u.id !== ctx.user.id && (
                    <>
                      <ActionForm action={memberAction} className="space-y-0" successMessage={false}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="op" value={m.role === "admin" ? "make-staff" : "make-admin"} /><SubmitButton size="sm" variant="ghost">{m.role === "admin" ? "Zu Mitarbeiter/in" : "Zu Administrator/in"}</SubmitButton></ActionForm>
                      <ActionForm action={memberAction} className="space-y-0" successMessage={false} confirm="Zugang entfernen?"><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="op" value="remove" /><SubmitButton size="sm" variant="danger-ghost">Entfernen</SubmitButton></ActionForm>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {invites.map((i) => (
              <tr key={i.id}>
                <td className="text-ink-500">{i.email}<div className="text-xs">eingeladen, gültig bis {formatDate(i.expiresAt)}</div></td>
                <td>{ROLE[i.role]}</td>
                <td className="text-right">{canAdmin && <ActionForm action={memberAction} className="space-y-0" successMessage={false}><input type="hidden" name="inviteId" value={i.id} /><input type="hidden" name="op" value="revoke-invite" /><SubmitButton size="sm" variant="danger-ghost">Zurückziehen</SubmitButton></ActionForm>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {allowed && canAdmin && (
        <Card>
          <CardHeader title="Person einladen" description="Mitarbeitende sehen und bearbeiten Buchungen und Kunden. Administratoren verwalten zusätzlich Räume und Einstellungen. Abo und Kontolöschung bleiben der Inhaberin bzw. dem Inhaber vorbehalten." />
          <CardBody>
            <ActionForm action={inviteAction} resetOnSuccess className="grid gap-4 space-y-0 sm:grid-cols-[1fr_200px_auto] sm:items-end">
              <Field label="E-Mail" htmlFor="iemail"><Input id="iemail" name="email" type="email" required /></Field>
              <Field label="Rolle" htmlFor="irole"><Select id="irole" name="role"><option value="staff">Mitarbeiter/in</option><option value="admin">Administrator/in</option></Select></Field>
              <SubmitButton>Einladen</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

async function LocationsTab({ ctx }: { ctx: Awaited<ReturnType<typeof requireOrg>> }) {
  const locations = await db.select().from(schema.locations).where(eq(schema.locations.orgId, ctx.org.id));
  const max = ctx.plan?.maxLocations ?? 1;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Standorte" description={max > 1 ? `Gruppieren Sie Ihre Räume nach Standort (${locations.length} von ${max}).` : "Mehrere Standorte sind im Tarif Business enthalten. Räume haben unabhängig davon immer eine eigene Adresse."} />
        {locations.length > 0 && (
          <Table>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.name}</td>
                  <td>{[l.street, [l.postalCode, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</td>
                  <td className="text-right"><ActionForm action={locationAction} className="space-y-0" confirm="Standort entfernen? Räume bleiben bestehen."><input type="hidden" name="locationId" value={l.id} /><input type="hidden" name="op" value="delete" /><SubmitButton size="sm" variant="danger-ghost">Entfernen</SubmitButton></ActionForm></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {max > 1 && ctx.role !== "staff" && (
        <Card>
          <CardHeader title="Standort hinzufügen" />
          <CardBody>
            <ActionForm action={locationAction} resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Name" htmlFor="lname"><Input id="lname" name="name" required /></Field>
                <Field label="Strasse" htmlFor="lstreet"><Input id="lstreet" name="street" /></Field>
                <Field label="PLZ" htmlFor="lplz"><Input id="lplz" name="postalCode" /></Field>
                <Field label="Ort" htmlFor="lcity"><Input id="lcity" name="city" /></Field>
              </div>
              <SubmitButton>Hinzufügen</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

async function OrgSwitcher({ userId, activeId }: { userId: string; activeId: string }) {
  const orgs = await listUserOrgs(userId);
  if (orgs.length < 2) return null;
  return (
    <Card>
      <CardHeader title="Konto wechseln" description="Sie haben Zugang zu mehreren Vermieterkonten." />
      <CardBody className="space-y-2">
        {orgs.map((o) => (
          <form key={o.id} action={switchOrgAction}>
            <input type="hidden" name="orgId" value={o.id} />
            <button disabled={o.id === activeId} className="w-full rounded-lg px-3 py-2 text-left text-sm ring-1 ring-ink-200 hover:bg-ink-50 disabled:bg-brand-50">{o.name} <span className="text-ink-400">({ROLE[o.role]})</span></button>
          </form>
        ))}
      </CardBody>
    </Card>
  );
}
