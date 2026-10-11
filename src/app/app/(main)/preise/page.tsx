import { eq } from "drizzle-orm";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { FeatureLocked } from "@/components/dashboard/feature-gate";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { WEEKDAYS, minutesToTime } from "@/lib/rooms/constants";
import { listOrgRooms } from "@/lib/rooms/service";
import { formatMoney } from "@/lib/utils/money";
import { addRuleAction, ruleAction } from "./actions";

export default async function PricesPage() {
  const ctx = await requireOrg("admin");
  const rooms = await listOrgRooms(ctx.org.id);
  const rules = await db.select().from(schema.priceRules).where(eq(schema.priceRules.orgId, ctx.org.id));
  const allowed = !!ctx.plan?.features.priceRules;
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  return (
    <>
      <PageHeader title="Preise" description="Grundpreise legen Sie pro Raum fest. Mit Preisregeln passen Sie Preise für Wochenenden, Saisons oder Randzeiten automatisch an." />
      <Card className="mb-6">
        <CardHeader title="Grundpreise Ihrer Räume" />
        <Table>
          <thead><tr><th>Raum</th><th>Stunde</th><th>Halbtag</th><th>Tag</th><th /></tr></thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>{r.hourlyPrice ? formatMoney(r.hourlyPrice) : "–"}</td>
                <td>{r.halfDayPrice ? formatMoney(r.halfDayPrice) : "–"}</td>
                <td>{r.dayPrice ? formatMoney(r.dayPrice) : "–"}</td>
                <td className="text-right"><Link className="text-brand-700 hover:underline" href={`/app/raeume/${r.id}?tab=preise`}>Bearbeiten</Link></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {!allowed ? <FeatureLocked feature="priceRules" /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader title="Preisregeln" description="Zu- und Abschläge in Prozent. Treffen mehrere Regeln zu, werden sie addiert." />
            {rules.length === 0 ? <CardBody><p className="text-sm text-ink-500">Noch keine Regeln. Beispiel: «Wochenende +20 %» für Samstag und Sonntag.</p></CardBody> : (
              <Table>
                <thead><tr><th>Regel</th><th>Gilt für</th><th>Anpassung</th><th /></tr></thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.name} {!r.active && <Badge>inaktiv</Badge>}</td>
                      <td className="text-xs text-ink-600">
                        {r.roomId ? roomName.get(r.roomId) : "Alle Räume"}
                        {r.weekdays?.length ? ` · ${r.weekdays.map((d) => WEEKDAYS[d - 1].short).join(", ")}` : ""}
                        {r.startDate || r.endDate ? ` · ${r.startDate ?? "…"} bis ${r.endDate ?? "…"}` : ""}
                        {r.startMinute != null && r.endMinute != null ? ` · ${minutesToTime(r.startMinute)}–${minutesToTime(r.endMinute)}` : ""}
                      </td>
                      <td className="tabular-nums">{r.adjustmentPercent > 0 ? "+" : ""}{r.adjustmentPercent} %</td>
                      <td className="flex justify-end gap-1">
                        <ActionForm action={ruleAction} className="space-y-0" successMessage={false}><input type="hidden" name="ruleId" value={r.id} /><input type="hidden" name="op" value={r.active ? "deactivate" : "activate"} /><SubmitButton size="sm" variant="ghost">{r.active ? "Deaktivieren" : "Aktivieren"}</SubmitButton></ActionForm>
                        <ActionForm action={ruleAction} className="space-y-0" successMessage={false} confirm="Regel löschen?"><input type="hidden" name="ruleId" value={r.id} /><input type="hidden" name="op" value="delete" /><SubmitButton size="sm" variant="danger-ghost">Löschen</SubmitButton></ActionForm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title="Neue Regel" />
            <CardBody>
              <ActionForm action={addRuleAction} resetOnSuccess>
                <Field label="Bezeichnung" htmlFor="name"><Input id="name" name="name" placeholder="z. B. Wochenendzuschlag" required /></Field>
                <Field label="Anpassung in %" htmlFor="adjustmentPercent" hint="Positiv = Zuschlag, negativ = Rabatt"><Input id="adjustmentPercent" name="adjustmentPercent" type="number" min={-90} max={300} required /></Field>
                <Field label="Raum" htmlFor="roomId"><Select id="roomId" name="roomId"><option value="">Alle Räume</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Wochentage</legend>
                  <div className="grid grid-cols-4 gap-2">{WEEKDAYS.map((d) => <Checkbox key={d.n} name="weekdays" value={d.n} label={d.short} />)}</div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Von Datum" htmlFor="startDate" optional><Input id="startDate" name="startDate" type="date" /></Field>
                  <Field label="Bis Datum" htmlFor="endDate" optional><Input id="endDate" name="endDate" type="date" /></Field>
                  <Field label="Ab Uhrzeit" htmlFor="startTime" optional><Input id="startTime" name="startTime" type="time" /></Field>
                  <Field label="Bis Uhrzeit" htmlFor="endTime" optional><Input id="endTime" name="endTime" type="time" /></Field>
                </div>
                <SubmitButton>Regel hinzufügen</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
