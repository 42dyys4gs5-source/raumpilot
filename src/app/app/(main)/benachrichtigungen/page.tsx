import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { requireOrg } from "@/lib/auth/guards";
import { notificationsAction } from "../einstellungen/actions";

export default async function NotificationsPage() {
  const ctx = await requireOrg("admin");
  const n = ctx.org.notificationSettings;
  const reminders = !!ctx.plan?.features.reminders;
  return (
    <>
      <PageHeader title="Benachrichtigungen" description="Welche E-Mails Sie und Ihre Kunden automatisch erhalten." />
      <Card className="max-w-3xl">
        <CardBody>
          <ActionForm action={notificationsAction}>
            <h3 className="font-semibold">An Sie</h3>
            <Field label="E-Mail für Benachrichtigungen" htmlFor="notificationEmail" hint={`Leer lassen, um ${ctx.org.contactEmail} zu verwenden.`} optional>
              <Input id="notificationEmail" name="notificationEmail" type="email" defaultValue={n.notificationEmail ?? ""} />
            </Field>
            <Checkbox name="notifyNewBooking" defaultChecked={n.notifyNewBooking} label="Neue Buchungen und Zahlungseingänge" />
            <Checkbox name="notifyCancellation" defaultChecked={n.notifyCancellation} label="Stornierungen durch Kunden" />
            <p className="text-xs text-ink-500">Buchungsanfragen und Kalenderkonflikte werden immer gemeldet, da sie eine Entscheidung erfordern.</p>
            <h3 className="pt-4 font-semibold">An Ihre Kunden</h3>
            <p className="text-sm text-ink-600">Bestätigungen, Zahlungsbelege, Stornierungen und Umbuchungen werden immer versendet.</p>
            <Checkbox name="customerReminders" defaultChecked={n.customerReminders} disabled={!reminders} label="Erinnerung vor der Buchung" description={reminders ? undefined : "Im Tarif Professional und Business enthalten."} />
            <Field label="Erinnerung … Stunden vor Mietbeginn" htmlFor="reminderHoursBefore" className="max-w-xs">
              <Input id="reminderHoursBefore" name="reminderHoursBefore" type="number" min={2} max={168} defaultValue={n.reminderHoursBefore} disabled={!reminders} />
            </Field>
            {!reminders && <><input type="hidden" name="reminderHoursBefore" value={n.reminderHoursBefore} /></>}
            <SubmitButton>Speichern</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
      <Card className="mt-6 max-w-3xl">
        <CardHeader title="Übersicht der automatischen E-Mails" />
        <CardBody>
          <ul className="grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
            {["Buchungsbestätigung mit Kalendereintrag (.ics)", "Eingangsbestätigung bei Anfragen", "Annahme oder Ablehnung einer Anfrage", "Zahlungsaufforderung nach Annahme", "Zahlungsbeleg", "Zahlungsfehler", "Stornierung inkl. Rückerstattung", "Umbuchung", "Erinnerung vor Mietbeginn", "Ablauf nicht bezahlter Reservationen"].map((x) => <li key={x} className="flex gap-2"><span className="text-brand-600">✓</span>{x}</li>)}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
