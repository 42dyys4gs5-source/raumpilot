import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Card, CardBody, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { requireOrg } from "@/lib/auth/guards";
import { listOrgRooms } from "@/lib/rooms/service";
import { todayISO } from "@/lib/utils/dates";
import { manualBookingAction } from "../actions";

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ raum?: string; datum?: string }> }) {
  const ctx = await requireOrg("staff");
  const sp = await searchParams;
  const rooms = await listOrgRooms(ctx.org.id);
  return (
    <>
      <PageHeader title="Buchung erfassen" description="Für telefonische oder persönliche Reservationen. Der Preis wird nach Ihren Raumpreisen berechnet." />
      {rooms.length === 0 ? (
        <Alert tone="info">Bitte erfassen Sie zuerst einen Raum.</Alert>
      ) : (
        <Card className="max-w-2xl">
          <CardBody>
            <ActionForm action={manualBookingAction}>
              <Field label="Raum" htmlFor="roomId">
                <Select id="roomId" name="roomId" defaultValue={sp.raum ?? rooms[0].id}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Datum" htmlFor="date"><Input id="date" name="date" type="date" defaultValue={sp.datum ?? todayISO()} required /></Field>
                <Field label="Beginn" htmlFor="start"><Input id="start" name="start" type="time" defaultValue="10:00" required /></Field>
                <Field label="Ende" htmlFor="end" hint="Vor Beginn = Folgetag"><Input id="end" name="end" type="time" defaultValue="12:00" required /></Field>
              </div>
              <Field label="Enddatum bei mehrtägigen Buchungen" htmlFor="endDate" optional><Input id="endDate" name="endDate" type="date" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name Kunde" htmlFor="name"><Input id="name" name="name" required /></Field>
                <Field label="E-Mail Kunde" htmlFor="email"><Input id="email" name="email" type="email" required /></Field>
                <Field label="Telefon" htmlFor="phone" optional><Input id="phone" name="phone" type="tel" /></Field>
                <Field label="Firma" htmlFor="company" optional><Input id="company" name="company" /></Field>
                <Field label="Personen" htmlFor="guests"><Input id="guests" name="guests" type="number" min={1} defaultValue={1} /></Field>
              </div>
              <Field label="Interne Notiz" htmlFor="internalNote" optional><Textarea id="internalNote" name="internalNote" rows={2} /></Field>
              <div className="space-y-2">
                <Checkbox name="notifyCustomer" defaultChecked label="Buchungsbestätigung an den Kunden senden" />
                <Checkbox name="markPaid" label="Bereits bezahlt" />
                <Checkbox name="ignoreRules" label="Öffnungszeiten, Vorlaufzeit und Mindestdauer ignorieren" description="Überschneidungen mit anderen Buchungen werden trotzdem verhindert." />
              </div>
              <SubmitButton>Buchung speichern</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </>
  );
}
