import type { Metadata } from "next";
import Link from "next/link";
import { Turnstile } from "@/components/ui/turnstile";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { BotFields, Checkbox, Field, Input, Select } from "@/components/ui/form";
import { env } from "@/lib/env";
import { registerAction } from "../actions";

export const metadata: Metadata = {
  title: "Kostenlos registrieren",
  description: "Erstellen Sie Ihr Raumvia-Konto und machen Sie Ihren Raum in wenigen Minuten online buchbar.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ tarif?: string }> }) {
  const { tarif } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Konto erstellen</h1>
      <p className="mt-1 text-sm text-ink-500">
        {env.TRIAL_DAYS > 0 ? `${env.TRIAL_DAYS} Tage kostenlos testen. ` : ""}Bereits registriert?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">Anmelden</Link>
      </p>
      <ActionForm action={registerAction} className="mt-6">
        <BotFields />
        <input type="hidden" name="plan" value={tarif ?? ""} />
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
        <Field label="Telefon" htmlFor="phone" optional>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <fieldset className="space-y-4 rounded-xl border border-ink-200 p-4">
          <legend className="px-1 text-sm font-medium text-ink-700">Rechnungsadresse</legend>
          <Field label="Strasse und Nr." htmlFor="street">
            <Input id="street" name="street" autoComplete="street-address" required />
            <FieldError name="street" />
          </Field>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="PLZ" htmlFor="postalCode">
              <Input id="postalCode" name="postalCode" autoComplete="postal-code" required />
            </Field>
            <Field label="Ort" htmlFor="city">
              <Input id="city" name="city" autoComplete="address-level2" required />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Land" htmlFor="country">
              <Select id="country" name="country" defaultValue="CH">
                <option value="CH">Schweiz</option>
                <option value="LI">Liechtenstein</option>
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="FR">Frankreich</option>
                <option value="IT">Italien</option>
              </Select>
            </Field>
            <Field label="UID / MWST-Nr." htmlFor="vatNumber" optional>
              <Input id="vatNumber" name="vatNumber" placeholder="CHE-123.456.789 MWST" />
            </Field>
          </div>
        </fieldset>
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
