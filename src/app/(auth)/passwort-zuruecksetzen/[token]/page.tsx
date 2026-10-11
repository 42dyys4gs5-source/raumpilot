import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { peekToken } from "@/lib/auth/tokens";
import { resetPasswordAction } from "../../actions";

export const metadata: Metadata = { title: "Neues Passwort", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await peekToken(token, "password_reset");
  return (
    <>
      <h1 className="text-2xl font-semibold">Neues Passwort festlegen</h1>
      {!valid ? (
        <Alert tone="error" className="mt-6" title="Link ungültig oder abgelaufen">
          <Link href="/passwort-vergessen" className="underline">Neuen Link anfordern</Link>
        </Alert>
      ) : (
        <ActionForm action={resetPasswordAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <Field label="Neues Passwort" htmlFor="password" hint="Mindestens 10 Zeichen, mindestens zwei Zeichenarten.">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
            <FieldError name="password" />
          </Field>
          <Field label="Passwort wiederholen" htmlFor="password2">
            <Input id="password2" name="password2" type="password" autoComplete="new-password" required />
            <FieldError name="password2" />
          </Field>
          <SubmitButton className="w-full" size="lg">Passwort speichern</SubmitButton>
        </ActionForm>
      )}
    </>
  );
}
