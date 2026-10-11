import { asc, eq } from "drizzle-orm";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { FeatureLocked } from "@/components/dashboard/feature-gate";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { listOrgRooms } from "@/lib/rooms/service";
import { formatMoney, toInputValue } from "@/lib/utils/money";
import { extraOpAction, saveExtraAction } from "./actions";

const LABEL = { per_booking: "pauschal pro Buchung", per_hour: "pro Stunde", per_person: "pro Person", per_unit: "pro Stück" } as const;

function ExtraForm({ rooms, extra }: { rooms: { id: string; name: string }[]; extra?: typeof schema.extras.$inferSelect }) {
  return (
    <ActionForm action={saveExtraAction} resetOnSuccess={!extra}>
      {extra && <input type="hidden" name="extraId" value={extra.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bezeichnung" htmlFor={`n-${extra?.id ?? "new"}`}><Input id={`n-${extra?.id ?? "new"}`} name="name" defaultValue={extra?.name} placeholder="z. B. Beamer, Apéro-Paket, Endreinigung" required /></Field>
        <Field label="Beschreibung" htmlFor={`d-${extra?.id ?? "new"}`} optional><Input id={`d-${extra?.id ?? "new"}`} name="description" defaultValue={extra?.description ?? ""} /></Field>
        <Field label="Preis (CHF)" htmlFor={`p-${extra?.id ?? "new"}`}><Input id={`p-${extra?.id ?? "new"}`} name="price" inputMode="decimal" defaultValue={toInputValue(extra?.price)} required /></Field>
        <Field label="Berechnung" htmlFor={`c-${extra?.id ?? "new"}`}>
          <Select id={`c-${extra?.id ?? "new"}`} name="pricing" defaultValue={extra?.pricing ?? "per_booking"}>{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="Max. Anzahl (nur «pro Stück»)" htmlFor={`m-${extra?.id ?? "new"}`}><Input id={`m-${extra?.id ?? "new"}`} name="maxQuantity" type="number" min={1} defaultValue={extra?.maxQuantity ?? 1} /></Field>
      </div>
      {rooms.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Verfügbar für (leer = alle Räume)</legend>
          <div className="flex flex-wrap gap-4">{rooms.map((r) => <Checkbox key={r.id} name="roomIds" value={r.id} label={r.name} defaultChecked={extra?.roomIds?.includes(r.id)} />)}</div>
        </fieldset>
      )}
      <SubmitButton variant={extra ? "secondary" : "primary"}>{extra ? "Speichern" : "Hinzufügen"}</SubmitButton>
    </ActionForm>
  );
}

export default async function ExtrasPage() {
  const ctx = await requireOrg("admin");
  if (!ctx.plan?.features.extras) return (<><PageHeader title="Zusatzleistungen" /><FeatureLocked feature="extras" /></>);
  const rooms = (await listOrgRooms(ctx.org.id)).map((r) => ({ id: r.id, name: r.name }));
  const extras = await db.select().from(schema.extras).where(eq(schema.extras.orgId, ctx.org.id)).orderBy(asc(schema.extras.sort), asc(schema.extras.createdAt));
  return (
    <>
      <PageHeader title="Zusatzleistungen" description="Optionale Leistungen, die Kunden bei der Buchung dazubuchen können – z. B. Technik, Catering, Reinigung." />
      <Card className="mb-6"><CardHeader title="Neue Zusatzleistung" /><CardBody><ExtraForm rooms={rooms} /></CardBody></Card>
      <div className="space-y-4">
        {extras.map((x) => (
          <Card key={x.id}>
            <CardHeader title={<span className="flex items-center gap-2">{x.name} {!x.active && <Badge>inaktiv</Badge>}</span>} description={`${formatMoney(x.price)} ${LABEL[x.pricing]}`} action={
              <div className="flex gap-1">
                <ActionForm action={extraOpAction} className="space-y-0" successMessage={false}><input type="hidden" name="extraId" value={x.id} /><input type="hidden" name="op" value={x.active ? "deactivate" : "activate"} /><SubmitButton size="sm" variant="ghost">{x.active ? "Deaktivieren" : "Aktivieren"}</SubmitButton></ActionForm>
                <ActionForm action={extraOpAction} className="space-y-0" successMessage={false} confirm="Zusatzleistung löschen? Bestehende Buchungen bleiben unverändert."><input type="hidden" name="extraId" value={x.id} /><input type="hidden" name="op" value="delete" /><SubmitButton size="sm" variant="danger-ghost">Löschen</SubmitButton></ActionForm>
              </div>
            } />
            <CardBody><details><summary className="cursor-pointer text-sm text-brand-700">Bearbeiten</summary><div className="mt-4"><ExtraForm rooms={rooms} extra={x} /></div></details></CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
