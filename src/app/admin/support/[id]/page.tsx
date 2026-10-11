import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";
import { ticketReplyAction } from "../../actions";

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [t] = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, id));
  if (!t) notFound();
  const msgs = await db.select().from(schema.supportMessages).where(eq(schema.supportMessages.ticketId, id)).orderBy(asc(schema.supportMessages.createdAt));
  return (
    <>
      <PageHeader title={t.subject} description={`${t.name} <${t.email}> · ${t.category} · ${t.status}`} />
      <div className="max-w-3xl space-y-4">
        {msgs.map((m) => <Card key={m.id} className={m.author === "admin" ? "bg-brand-50" : ""}><CardBody><p className="mb-2 text-xs text-ink-500">{m.author === "admin" ? "Support" : t.name} · {formatDateTime(m.createdAt)}</p><p className="whitespace-pre-line text-sm">{m.body}</p></CardBody></Card>)}
        <Card><CardBody>
          <ActionForm action={ticketReplyAction} resetOnSuccess>
            <input type="hidden" name="ticketId" value={t.id} />
            <Textarea name="body" rows={6} aria-label="Antwort" placeholder="Antwort (wird per E-Mail versendet)" />
            <div className="flex gap-2"><SubmitButton>Antwort senden</SubmitButton></div>
          </ActionForm>
          <ActionForm action={ticketReplyAction} className="mt-2"><input type="hidden" name="ticketId" value={t.id} /><input type="hidden" name="op" value="close" /><SubmitButton variant="ghost">Ticket schliessen</SubmitButton></ActionForm>
        </CardBody></Card>
        <p className="text-xs text-ink-500">Hinweis: Rückerstattungen, Kontoänderungen oder rechtliche Zusicherungen werden nie automatisch ausgeführt; prüfen Sie Anliegen manuell.</p>
      </div>
    </>
  );
}
