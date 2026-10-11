import { and, asc, eq, gte } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { CopyField } from "@/components/ui/copy-field";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { listOrgRooms } from "@/lib/rooms/service";
import { formatDateTime, todayISO } from "@/lib/utils/dates";
import { addBlockAction, addFeedAction, deleteBlockAction, feedAction } from "./actions";

export default async function AvailabilityPage() {
  const ctx = await requireOrg("admin");
  const rooms = await listOrgRooms(ctx.org.id);
  const [blocks, feeds] = await Promise.all([
    db.select().from(schema.roomBlocks).where(and(eq(schema.roomBlocks.orgId, ctx.org.id), gte(schema.roomBlocks.endsAt, new Date()))).orderBy(asc(schema.roomBlocks.startsAt)),
    db.select().from(schema.calendarFeeds).where(eq(schema.calendarFeeds.orgId, ctx.org.id)),
  ]);
  const manual = blocks.filter((b) => b.source !== "ical");
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const tz = ctx.org.timezone;

  return (
    <>
      <PageHeader title="Verfügbarkeit" description="Sperren Sie einzelne Zeiten, Ferien oder ganze Tage und verbinden Sie externe Kalender. Öffnungszeiten legen Sie pro Raum fest." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Zeit sperren" />
          <CardBody>
            <ActionForm action={addBlockAction} resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Raum" htmlFor="roomId">
                  <Select id="roomId" name="roomId"><option value="all">Alle Räume</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
                </Field>
                <Field label="Art" htmlFor="type">
                  <Select id="type" name="type"><option value="manual">Sperrzeit</option><option value="holiday">Ferien / Betriebsschliessung</option></Select>
                </Field>
                <Field label="Von (Datum)" htmlFor="fromDate"><Input id="fromDate" name="fromDate" type="date" defaultValue={todayISO(tz)} required /></Field>
                <Field label="Zeit" htmlFor="fromTime"><Input id="fromTime" name="fromTime" type="time" defaultValue="08:00" /></Field>
                <Field label="Bis (Datum)" htmlFor="toDate"><Input id="toDate" name="toDate" type="date" defaultValue={todayISO(tz)} /></Field>
                <Field label="Zeit" htmlFor="toTime"><Input id="toTime" name="toTime" type="time" defaultValue="12:00" /></Field>
              </div>
              <Checkbox name="allDay" label="Ganztägig (Zeiten ignorieren)" />
              <Field label="Grund (intern)" htmlFor="reason" optional><Input id="reason" name="reason" placeholder="z. B. Renovation, Eigenbedarf" /></Field>
              <SubmitButton>Sperren</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Externen Kalender importieren" description="Termine aus Google Kalender, Outlook, Airbnb oder anderen Systemen blockieren automatisch den Raum (Abgleich alle 30 Minuten)." />
          <CardBody>
            {rooms.length === 0 ? <p className="text-sm text-ink-500">Bitte zuerst einen Raum erfassen.</p> : (
              <ActionForm action={addFeedAction} resetOnSuccess>
                <Field label="Raum" htmlFor="froom"><Select id="froom" name="roomId">{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
                <Field label="Bezeichnung" htmlFor="fname" optional><Input id="fname" name="name" placeholder="z. B. Google Kalender Vereinsanlässe" /></Field>
                <Field label="iCal-Adresse (https:// oder webcal://)" htmlFor="furl" hint="Google: Kalendereinstellungen › «Privatadresse im iCal-Format». Outlook: Kalender freigeben › ICS-Link.">
                  <Input id="furl" name="url" type="url" required placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
                </Field>
                <SubmitButton>Kalender verbinden</SubmitButton>
              </ActionForm>
            )}
          </CardBody>
        </Card>
      </div>

      {feeds.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Verbundene Kalender" />
          <Table>
            <thead><tr><th>Name</th><th>Raum</th><th>Letzter Abgleich</th><th>Termine</th><th /></tr></thead>
            <tbody>
              {feeds.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}{f.lastError && <div className="text-xs text-red-600">{f.lastError}</div>}</td>
                  <td>{roomName.get(f.roomId)}</td>
                  <td className="text-xs">{f.lastSyncedAt ? formatDateTime(f.lastSyncedAt, tz) : "–"}</td>
                  <td>{f.lastEventCount ?? "–"}</td>
                  <td className="flex justify-end gap-1">
                    <ActionForm action={feedAction} className="space-y-0"><input type="hidden" name="feedId" value={f.id} /><input type="hidden" name="op" value="sync" /><SubmitButton size="sm" variant="ghost">Jetzt abgleichen</SubmitButton></ActionForm>
                    <ActionForm action={feedAction} className="space-y-0" confirm="Kalender entfernen?"><input type="hidden" name="feedId" value={f.id} /><input type="hidden" name="op" value="delete" /><SubmitButton size="sm" variant="danger-ghost">Entfernen</SubmitButton></ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Aktuelle Sperrzeiten" />
        {manual.length === 0 ? <CardBody><p className="text-sm text-ink-500">Keine künftigen Sperrzeiten.</p></CardBody> : (
          <Table>
            <thead><tr><th>Zeitraum</th><th>Raum</th><th>Art</th><th>Grund</th><th /></tr></thead>
            <tbody>
              {manual.map((b) => (
                <tr key={b.id}>
                  <td className="text-sm">{formatDateTime(b.startsAt, tz)} – {formatDateTime(b.endsAt, tz)}</td>
                  <td>{b.roomId ? roomName.get(b.roomId) : "Alle Räume"}</td>
                  <td>{b.source === "holiday" ? "Ferien" : "Sperrzeit"}</td>
                  <td>{b.reason ?? "–"}</td>
                  <td className="text-right"><ActionForm action={deleteBlockAction} className="space-y-0"><input type="hidden" name="blockId" value={b.id} /><SubmitButton size="sm" variant="danger-ghost"><Trash2 /><span className="sr-only">Entfernen</span></SubmitButton></ActionForm></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Kalender-Export" description="Abonnieren Sie diese Links in Google Kalender (Andere Kalender › Per URL), Outlook oder Apple Kalender. Die Links sind geheim – teilen Sie sie nicht öffentlich." />
        <CardBody className="space-y-4">
          {rooms.map((r) => <CopyField key={r.id} label={r.name} value={appUrl(`/api/ical/${r.icalToken}`)} />)}
          <Alert tone="info">Direkte Zwei-Wege-Synchronisation mit Google- und Microsoft-Konten (OAuth) ist vorbereitet, aber noch nicht aktiviert. Bis dahin funktioniert der Abgleich zuverlässig über iCal-Import und -Export.</Alert>
        </CardBody>
      </Card>
    </>
  );
}
