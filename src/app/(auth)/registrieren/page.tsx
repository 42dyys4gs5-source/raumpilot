import type { Metadata } from "next";
import Link from "next/link";
import { Turnstile } from "@/components/ui/turnstile";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { BotFields, Checkbox, Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/card";
import { RegistrationStartedTracker } from "@/components/marketing/registration-started-tracker";
import { findReferrer } from "@/lib/billing/referrals";
import { env } from "@/lib/env";
import { registerAction } from "../actions";

export const metadata: Metadata = {
  title: "Kostenlos registrieren",
  description: "Erstellen Sie Ihr Raumvia-Konto und machen Sie Ihren Raum in wenigen Minuten online buchbar.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ tarif?: string; ref?: string }> }) {
  const { tarif, ref } = await searchParams;
  const referrer = await findReferrer(ref).catch(() => null);
  return (
    <>
      <RegistrationStartedTracker />
      <h1 className="text-2xl font-semibold sm:text-3xl">Schön, dass Sie starten.</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">
        {env.TRIAL_DAYS > 0 ? `${env.TRIAL_DAYS} Tage kostenlos testen. ` : ""}Erstellen Sie Ihr Konto und richten Sie danach Ihren ersten Raum ein. Bereits registriert?{" "}
        <Link href="/login" className="font-semibold text-brand-700 underline-offset-4 hover:underline">Anmelden</Link>
      </p>
      {referrer && (
        <Alert tone="success" className="mt-4" title={`Empfohlen von ${referrer.name}`}>
          Nach Ihrer ersten bezahlten Abo-Rechnung erhalten Sie einen Monat Ihres Tarifs gutgeschrieben.
        </Alert>
      )}
      <ActionForm action={registerAction} className="mt-6">
        <BotFields />
        <input type="hidden" name="plan" value={tarif ?? ""} />
        {referrer && <input type="hidden" name="ref" value={ref ?? ""} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ihr Name" htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required />
            <FieldError name="name" />
          </Field>
          <Field label="Firma / Angebotsname" htmlFor="company" hint="Erscheint auf Ihrer Buchungsseite.">
            <Input id="company" name="company" autoComplete="organization" required />
            <FieldError name="company" />
          </Field>
        </div>
        <Field label="E-Mail-Adresse" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError name="email" />
        </Field>
        <Field label="Passwort" htmlFor="password" hint="Mindestens 10 Zeichen, mindestens zwei Zeichenarten.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <FieldError name="password" />
        </Field>
        <p className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm leading-relaxed text-brand-900"><strong className="font-semibold">Erst einrichten, dann entscheiden.</strong><br />Rechnungsadresse und MWST-Angaben brauchen wir erst bei der Tarifwahl. Ihren Raum können Sie vorher privat ansehen.</p>
        <Checkbox
          name="terms"
          required
          label={
            <>
              Ich akzeptiere die <Link href="/rechtliches/nutzungsbedingungen" className="text-brand-700 underline" target="_blank">Nutzungsbedingungen</Link> und habe die{" "}
              <Link href="/rechtliches/datenschutz" className="text-brand-700 underline" target="_blank">Datenschutzerklärung</Link> gelesen.
            </>
          }
        />
        <FieldError name="terms" />
        <Turnstile siteKey={env.TURNSTILE_SITE_KEY} />
        <SubmitButton className="w-full" size="lg" pendingText="Konto wird erstellt …">Konto erstellen</SubmitButton>
        <p className="text-center text-xs text-ink-500">Den Tarif wählen Sie nach der Einrichtung Ihres ersten Raums.</p>
      </ActionForm>
    </>
  );
}
