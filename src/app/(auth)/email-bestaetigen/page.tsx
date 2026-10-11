import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { getSession } from "@/lib/auth/session";
import { logoutAction, resendVerificationAction } from "../actions";

export const metadata: Metadata = { title: "E-Mail bestätigen", robots: { index: false } };

export default async function VerifyNoticePage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.user.emailVerifiedAt) redirect("/app/onboarding");
  return (
    <>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700"><MailCheck className="size-6" /></div>
      <h1 className="text-2xl font-semibold">Bitte bestätigen Sie Ihre E-Mail-Adresse</h1>
      <p className="mt-2 text-ink-600">
        Wir haben eine E-Mail an <strong>{s.user.email}</strong> gesendet. Klicken Sie auf den Link darin, um Ihr Konto zu aktivieren. Prüfen Sie gegebenenfalls Ihren Spam-Ordner.
      </p>
      <ActionForm action={resendVerificationAction} className="mt-6">
        <SubmitButton variant="secondary">E-Mail erneut senden</SubmitButton>
      </ActionForm>
      <form action={logoutAction} className="mt-6">
        <button className="text-sm text-ink-500 hover:underline">Mit anderem Konto anmelden</button>
      </form>
    </>
  );
}
