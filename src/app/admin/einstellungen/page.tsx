import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { isLiveKey } from "@/lib/payments/stripe";
import { getOperator } from "@/lib/settings";
import { operatorAction } from "../actions";

export default async function AdminSettings() {
  await requireAdmin();
  const op = await getOperator();
  const cfg: [string, string, boolean][] = [
    ["Zahlungen", env.PAYMENTS_MODE === "stripe" ? (isLiveKey() ? "Stripe LIVE" : "Stripe Testmodus") : env.PAYMENTS_MODE, env.PAYMENTS_MODE === "stripe"],
    ["Webhook Plattform", env.STRIPE_WEBHOOK_SECRET ? "konfiguriert" : "fehlt", !!env.STRIPE_WEBHOOK_SECRET],
    ["Webhook Connect", env.STRIPE_CONNECT_WEBHOOK_SECRET ? "konfiguriert" : "fehlt", !!env.STRIPE_CONNECT_WEBHOOK_SECRET],
    ["E-Mail", env.EMAIL_MODE === "resend" ? "Resend" : "nur Protokoll", env.EMAIL_MODE === "resend"],
    ["Absender", env.EMAIL_FROM, true],
    ["Speicher", env.STORAGE_DRIVER, env.STORAGE_DRIVER === "supabase"],
    ["Bot-Schutz (Turnstile)", env.TURNSTILE_SECRET_KEY ? "aktiv" : "Honeypot & Rate-Limit", !!env.TURNSTILE_SECRET_KEY],
    ["Fehlerüberwachung (Sentry)", env.SENTRY_DSN ? "aktiv" : "nur intern", !!env.SENTRY_DSN],
    ["Admin-Warnungen", env.ADMIN_ALERT_EMAIL ?? "nicht gesetzt", !!env.ADMIN_ALERT_EMAIL],
    ["Testphase", `${env.TRIAL_DAYS} Tage`, true],
    ["Plattformgebühr Buchungen", `${(env.PLATFORM_FEE_BPS / 100).toFixed(2)} %`, true],
  ];
  return (
    <>
      <PageHeader title="Plattform-Einstellungen" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Betreiberangaben" description="Werden in Impressum, Datenschutzerklärung und AGB eingesetzt." />
          <CardBody>
            <ActionForm action={operatorAction}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Firma / Name" htmlFor="name"><Input id="name" name="name" defaultValue={op.name} /></Field>
                <Field label="Rechtsform" htmlFor="legalForm"><Input id="legalForm" name="legalForm" defaultValue={op.legalForm} placeholder="z. B. GmbH, Einzelunternehmen" /></Field>
                <Field label="Strasse" htmlFor="street"><Input id="street" name="street" defaultValue={op.street} /></Field>
                <div className="grid grid-cols-[90px_1fr] gap-2"><Field label="PLZ" htmlFor="postalCode"><Input id="postalCode" name="postalCode" defaultValue={op.postalCode} /></Field><Field label="Ort" htmlFor="city"><Input id="city" name="city" defaultValue={op.city} /></Field></div>
                <Field label="Land" htmlFor="country"><Input id="country" name="country" defaultValue={op.country} /></Field>
                <Field label="E-Mail" htmlFor="email"><Input id="email" name="email" defaultValue={op.email} /></Field>
                <Field label="Telefon" htmlFor="phone" optional><Input id="phone" name="phone" defaultValue={op.phone} /></Field>
                <Field label="Vertretungsberechtigt" htmlFor="representative"><Input id="representative" name="representative" defaultValue={op.representative} /></Field>
                <Field label="UID" htmlFor="uid"><Input id="uid" name="uid" defaultValue={op.uid} placeholder="CHE-…" /></Field>
                <Field label="MWST-Nr." htmlFor="vatNumber" optional><Input id="vatNumber" name="vatNumber" defaultValue={op.vatNumber} /></Field>
              </div>
              <Checkbox name="vatRegistered" defaultChecked={op.vatRegistered} label="Betreiberin ist MWST-pflichtig (Abo-Preise inkl. 8.1 % MWST)" />
              <SubmitButton>Speichern</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Konfiguration (Umgebungsvariablen)" description="Änderungen erfolgen in Vercel › Settings › Environment Variables." />
          <CardBody>
            <dl className="space-y-2 text-sm">{cfg.map(([k, v, ok]) => <div key={k} className="flex justify-between gap-4"><dt className="text-ink-500">{k}</dt><dd className="text-right">{ok ? <Badge tone="green">{v}</Badge> : <Badge tone="amber">{v}</Badge>}</dd></div>)}</dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
