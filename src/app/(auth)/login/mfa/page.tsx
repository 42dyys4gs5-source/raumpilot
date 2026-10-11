import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { getSession } from "@/lib/auth/session";
import { logoutAction, mfaAction } from "../../actions";

export const metadata: Metadata = { title: "Zwei-Faktor-Bestätigung", robots: { index: false } };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.user.totpEnabledAt) redirect(s.user.isPlatformAdmin ? "/konto/mfa" : "/app");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Bestätigungscode</h1>
      <p className="mt-1 text-sm text-ink-500">Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.</p>
      <ActionForm action={mfaAction} className="mt-6">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Code" htmlFor="code">
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className="text-center text-lg tracking-[0.4em]" />
        </Field>
        <SubmitButton className="w-full" size="lg">Bestätigen</SubmitButton>
      </ActionForm>
      <form action={logoutAction} className="mt-4 text-center">
        <button className="text-sm text-ink-500 hover:underline">Abbrechen und abmelden</button>
      </form>
    </>
  );
}
