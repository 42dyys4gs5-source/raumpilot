import { desc, isNull } from "drizzle-orm";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/dates";
import { errorAdminAction } from "../actions";

export default async function ErrorsAdmin() {
  await requireAdmin();
  const rows = await db.select().from(schema.errorLog).where(isNull(schema.errorLog.resolvedAt)).orderBy(desc(schema.errorLog.createdAt)).limit(100);
  return (
    <>
      <PageHeader title="Technische Fehler" description="Ungelöste Fehler. Mit SENTRY_DSN werden Fehler zusätzlich an Sentry gemeldet." actions={rows.length ? <ActionForm action={errorAdminAction}><input type="hidden" name="op" value="resolve-all" /><SubmitButton variant="secondary">Alle als erledigt markieren</SubmitButton></ActionForm> : null} />
      {rows.length === 0 ? <p className="text-sm text-ink-500">Keine offenen Fehler. 🎉</p> : (
        <div className="space-y-3">
          {rows.map((e) => (
            <Card key={e.id}><CardBody>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-xs text-ink-500">{formatDateTime(e.createdAt)} · {e.source}</p><p className="mt-1 font-medium">{e.message}</p></div>
                <ActionForm action={errorAdminAction} className="space-y-0"><input type="hidden" name="id" value={e.id} /><SubmitButton size="sm" variant="ghost">Erledigt</SubmitButton></ActionForm>
              </div>
              {(e.stack || e.context) && <details className="mt-2"><summary className="cursor-pointer text-xs text-brand-700">Details</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-ink-900 p-3 text-[11px] text-ink-100">{JSON.stringify(e.context, null, 2)}{"\n"}{e.stack}</pre></details>}
            </CardBody></Card>
          ))}
        </div>
      )}
    </>
  );
}
