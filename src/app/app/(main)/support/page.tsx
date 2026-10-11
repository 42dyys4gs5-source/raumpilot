import { asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { HELP_ARTICLES } from "@/content/help";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";
import { ticketAction } from "./actions";

export default async function SupportPage() {
  const ctx = await requireOrg();
  const tickets = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.orgId, ctx.org.id)).orderBy(desc(schema.supportTickets.createdAt)).limit(20);
  const messages = tickets.length ? await db.select().from(schema.supportMessages).where(inArray(schema.supportMessages.ticketId, tickets.map((t) => t.id))).orderBy(asc(schema.supportMessages.createdAt)) : [];
  return (
    <>
      <PageHeader title="Hilfe & Support" description={ctx.plan?.features.prioritySupport ? "Ihr Tarif enthält priorisierten Support." : "Wir antworten in der Regel innert 1–2 Arbeitstagen."} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Häufige Themen" />
            <CardBody>
              <ul className="grid gap-2 sm:grid-cols-2">
                {HELP_ARTICLES.map((a) => <li key={a.slug}><Link href={`/hilfe/${a.slug}`} className="text-sm text-brand-700 hover:underline" target="_blank">{a.title}</Link></li>)}
              </ul>
            </CardBody>
          </Card>
          {tickets.length > 0 && (
            <Card>
              <CardHeader title="Ihre Anfragen" />
              <CardBody className="space-y-4">
                {tickets.map((t) => (
                  <details key={t.id} className="rounded-xl border border-ink-200 p-4">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm"><span className="font-medium">{t.subject}</span><Badge tone={t.status === "open" ? "amber" : t.status === "answered" ? "green" : "neutral"}>{t.status === "open" ? "offen" : t.status === "answered" ? "beantwortet" : "geschlossen"}</Badge><span className="text-ink-400">{formatDateTime(t.createdAt)}</span></summary>
                    <div className="mt-3 space-y-3">
                      {messages.filter((m) => m.ticketId === t.id).map((m) => (
                        <div key={m.id} className={m.author === "admin" ? "rounded-lg bg-brand-50 p-3 text-sm" : "rounded-lg bg-ink-50 p-3 text-sm"}>
                          <p className="mb-1 text-xs text-ink-500">{m.author === "admin" ? "Raumvia Support" : "Sie"} · {formatDateTime(m.createdAt)}</p>
                          <p className="whitespace-pre-line">{m.body}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
        <Card>
          <CardHeader title="Anfrage senden" />
          <CardBody>
            <ActionForm action={ticketAction} resetOnSuccess>
              <Field label="Thema" htmlFor="category"><Select id="category" name="category"><option value="support">Frage zur Nutzung</option><option value="billing">Abo & Rechnung</option><option value="privacy">Datenschutz</option></Select></Field>
              <Field label="Betreff" htmlFor="subject"><Input id="subject" name="subject" required /></Field>
              <Field label="Beschreibung" htmlFor="body"><Textarea id="body" name="body" rows={6} required /></Field>
              <SubmitButton>Senden</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
