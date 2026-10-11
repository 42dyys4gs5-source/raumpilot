import { desc, eq } from "drizzle-orm";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { FeatureLocked } from "@/components/dashboard/feature-gate";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { addCodeAction, codeOpAction } from "./actions";

export default async function CodesPage() {
  const ctx = await requireOrg("admin");
  if (!ctx.plan?.features.discountCodes) return (<><PageHeader title="Gutscheine & Rabattcodes" /><FeatureLocked feature="discountCodes" /></>);
  const codes = await db.select().from(schema.discountCodes).where(eq(schema.discountCodes.orgId, ctx.org.id)).orderBy(desc(schema.discountCodes.createdAt));
  return (
    <>
      <PageHeader title="Gutscheine & Rabattcodes" description="Codes geben Kunden einen Rabatt auf Miete und Zusatzleistungen (nicht auf die Kaution)." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          {codes.length === 0 ? <CardBody><p className="text-sm text-ink-500">Noch keine Codes.</p></CardBody> : (
            <Table>
              <thead><tr><th>Code</th><th>Rabatt</th><th>Gültig</th><th>Eingelöst</th><th /></tr></thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-medium">{c.code} {!c.active && <Badge>inaktiv</Badge>}</td>
                    <td>{c.kind === "percent" ? `${c.value} %` : formatMoney(c.value)}{c.minAmount ? <div className="text-xs text-ink-400">ab {formatMoney(c.minAmount)}</div> : null}</td>
                    <td className="text-xs">{c.validFrom ? formatDate(c.validFrom) : "sofort"} – {c.validUntil ? formatDate(c.validUntil) : "unbegrenzt"}</td>
                    <td>{c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                    <td className="flex justify-end gap-1">
                      <ActionForm action={codeOpAction} className="space-y-0" successMessage={false}><input type="hidden" name="codeId" value={c.id} /><input type="hidden" name="op" value={c.active ? "deactivate" : "activate"} /><SubmitButton size="sm" variant="ghost">{c.active ? "Deaktivieren" : "Aktivieren"}</SubmitButton></ActionForm>
                      <ActionForm action={codeOpAction} className="space-y-0" successMessage={false} confirm="Code löschen?"><input type="hidden" name="codeId" value={c.id} /><input type="hidden" name="op" value="delete" /><SubmitButton size="sm" variant="danger-ghost">Löschen</SubmitButton></ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Neuer Code" />
          <CardBody>
            <ActionForm action={addCodeAction} resetOnSuccess>
              <Field label="Code" htmlFor="code"><Input id="code" name="code" className="uppercase" placeholder="SOMMER25" required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Art" htmlFor="kind"><Select id="kind" name="kind"><option value="percent">Prozent</option><option value="fixed">Betrag CHF</option></Select></Field>
                <Field label="Wert" htmlFor="value"><Input id="value" name="value" inputMode="decimal" required /></Field>
                <Field label="Gültig ab" htmlFor="validFrom" optional><Input id="validFrom" name="validFrom" type="date" /></Field>
                <Field label="Gültig bis" htmlFor="validUntil" optional><Input id="validUntil" name="validUntil" type="date" /></Field>
                <Field label="Max. Einlösungen" htmlFor="maxRedemptions" optional><Input id="maxRedemptions" name="maxRedemptions" type="number" min={1} /></Field>
                <Field label="Mindestbetrag CHF" htmlFor="minAmount" optional><Input id="minAmount" name="minAmount" inputMode="decimal" /></Field>
              </div>
              <SubmitButton>Code erstellen</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
