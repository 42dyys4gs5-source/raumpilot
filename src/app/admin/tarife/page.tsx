import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { FEATURE_LABELS } from "@/config/plans";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import type { PlanFeatures } from "@/lib/db/schema";
import { toInputValue } from "@/lib/utils/money";
import { planAdminAction } from "../actions";

export default async function PlansAdmin() {
  await requireAdmin();
  const plans = await db.select().from(schema.plans).orderBy(schema.plans.sort);
  return (
    <>
      <PageHeader title="Tarife" description="Preise, Limiten und Funktionen pro Tarif. Die Funktionsbegrenzung wird serverseitig durchgesetzt." />
      <Alert tone="info" className="mb-6">Legen Sie in Stripe pro Tarif ein Produkt mit monatlichem Preis in CHF an und tragen Sie hier die Preis-ID (price_…) ein. Ändern Sie einen Preis, erstellen Sie in Stripe einen neuen Preis und ersetzen Sie die ID; bestehende Abos behalten ihren Preis, bis Sie sie in Stripe migrieren.</Alert>
      {plans.length === 0 && <ActionForm action={planAdminAction}><input type="hidden" name="op" value="seed" /><SubmitButton>Standardtarife anlegen</SubmitButton></ActionForm>}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.key}>
            <CardHeader title={`${p.name} (${p.key})`} />
            <CardBody>
              <ActionForm action={planAdminAction}>
                <input type="hidden" name="key" value={p.key} />
                <Field label="Name" htmlFor={`n${p.key}`}><Input id={`n${p.key}`} name="name" defaultValue={p.name} /></Field>
                <Field label="Beschreibung" htmlFor={`d${p.key}`}><Input id={`d${p.key}`} name="description" defaultValue={p.description} /></Field>
                <Field label="Preis/Monat (CHF)" htmlFor={`p${p.key}`}><Input id={`p${p.key}`} name="priceMonthly" defaultValue={toInputValue(p.priceMonthly)} /></Field>
                <Field label="Stripe-Preis-ID (monatlich)" htmlFor={`s${p.key}`}><Input id={`s${p.key}`} name="stripePriceId" defaultValue={p.stripePriceId ?? ""} placeholder="price_…" /></Field>
                <Field label="Stripe-Preis-ID (jährlich, 10 × Monatspreis)" htmlFor={`sy${p.key}`} hint="Leer lassen, wenn kein Jahresabo angeboten wird."><Input id={`sy${p.key}`} name="stripePriceIdYearly" defaultValue={p.stripePriceIdYearly ?? ""} placeholder="price_…" /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Räume" htmlFor={`r${p.key}`}><Input id={`r${p.key}`} name="maxRooms" type="number" defaultValue={p.maxRooms} /></Field>
                  <Field label="Standorte" htmlFor={`l${p.key}`}><Input id={`l${p.key}`} name="maxLocations" type="number" defaultValue={p.maxLocations} /></Field>
                  <Field label="Benutzer" htmlFor={`m${p.key}`}><Input id={`m${p.key}`} name="maxMembers" type="number" defaultValue={p.maxMembers} /></Field>
                </div>
                <fieldset className="space-y-1.5">{(Object.keys(FEATURE_LABELS) as (keyof PlanFeatures)[]).map((k) => <Checkbox key={k} name={`f_${k}`} defaultChecked={p.features[k]} label={FEATURE_LABELS[k]} />)}</fieldset>
                <Field label="Leistungen (eine pro Zeile)" htmlFor={`h${p.key}`}><Textarea id={`h${p.key}`} name="highlights" rows={6} defaultValue={p.highlights.join("\n")} /></Field>
                <Checkbox name="active" defaultChecked={p.active} label="Tarif aktiv (buchbar)" />
                <SubmitButton>Speichern</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
