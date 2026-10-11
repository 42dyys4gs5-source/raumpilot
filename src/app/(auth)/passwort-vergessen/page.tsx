import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { forgotPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Passwort vergessen", robots: { index: false } };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Passwort vergessen</h1>
      <p className="mt-1 text-sm text-ink-500">Wir senden Ihnen einen Link, mit dem Sie ein neues Passwort festlegen können.</p>
      <ActionForm action={forgotPasswordAction} className="mt-6" resetOnSuccess>
        <Field label="E-Mail-Adresse" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton className="w-full" size="lg">Link senden</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-brand-700 hover:underline">Zurück zur Anmeldung</Link></p>
    </>
  );
}
