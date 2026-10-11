import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { getSession } from "@/lib/auth/session";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && (!s.user.totpEnabledAt || s.session.mfaVerifiedAt)) redirect(s.user.isPlatformAdmin ? "/admin" : "/app");
  return (
    <>
      <h1 className="text-2xl font-semibold">Anmelden</h1>
      <p className="mt-1 text-sm text-ink-500">
        Noch kein Konto? <Link href="/registrieren" className="font-medium text-brand-700 hover:underline">Jetzt registrieren</Link>
      </p>
      <div className="mt-6 space-y-3">
        {sp.abgemeldet && <Alert tone="success">Sie wurden abgemeldet.</Alert>}
        {sp.passwort && <Alert tone="success">Ihr Passwort wurde geändert. Bitte melden Sie sich an.</Alert>}
        {sp.bestaetigt && <Alert tone="success">Ihre E-Mail-Adresse ist bestätigt. Bitte melden Sie sich an.</Alert>}
      </div>
      <ActionForm action={loginAction} className="mt-6">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label="E-Mail-Adresse" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Passwort" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end text-sm">
          <Link href="/passwort-vergessen" className="text-brand-700 hover:underline">Passwort vergessen?</Link>
        </div>
        <SubmitButton className="w-full" size="lg">Anmelden</SubmitButton>
      </ActionForm>
    </>
  );
}
