import type { Metadata } from "next";
import QRCode from "qrcode";
import { Logo } from "@/components/brand/logo";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { requireUser } from "@/lib/auth/guards";
import { otpauthUrl } from "@/lib/auth/totp";
import { decrypt } from "@/lib/security/crypto";
import { confirmTotpAction, startTotpAction } from "@/app/app/(main)/einstellungen/actions";

export const metadata: Metadata = { title: "Zwei-Faktor-Authentifizierung einrichten", robots: { index: false } };

export default async function MfaSetupPage() {
  const s = await requireUser();
  const secret = s.user.totpSecretEnc && !s.user.totpEnabledAt ? decrypt(s.user.totpSecretEnc) : null;
  const qr = secret ? await QRCode.toDataURL(otpauthUrl(secret, s.user.email), { margin: 1, width: 220 }) : null;
  return (
    <div className="min-h-dvh bg-ink-50 py-10">
      <div className="container-page max-w-lg">
        <Logo className="mb-6" href={s.user.isPlatformAdmin ? "/admin" : "/app"} />
        <Card>
          <CardBody className="space-y-4">
            <h1 className="text-2xl font-semibold">Zwei-Faktor-Authentifizierung</h1>
            {s.user.isPlatformAdmin && !s.user.totpEnabledAt && <Alert tone="warning">Für den Administrationsbereich ist die Zwei-Faktor-Authentifizierung zwingend.</Alert>}
            {s.user.totpEnabledAt ? (
              <Alert tone="success">Die Zwei-Faktor-Authentifizierung ist bereits aktiv.</Alert>
            ) : !secret ? (
              <>
                <p className="text-sm text-ink-600">Sie benötigen eine Authenticator-App, z. B. Google Authenticator, Microsoft Authenticator, 1Password oder Bitwarden.</p>
                <ActionForm action={startTotpAction}><SubmitButton>Einrichtung starten</SubmitButton></ActionForm>
              </>
            ) : (
              <>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
                  <li>Scannen Sie den QR-Code mit Ihrer Authenticator-App.</li>
                  <li>Geben Sie den angezeigten 6-stelligen Code ein.</li>
                </ol>
                <img src={qr!} alt="QR-Code für die Authenticator-App" className="mx-auto size-56 rounded-lg ring-1 ring-ink-200" />
                <p className="break-all text-center font-mono text-xs text-ink-500">Manuell: {secret.match(/.{1,4}/g)?.join(" ")}</p>
                <ActionForm action={confirmTotpAction}>
                  <Field label="Code" htmlFor="code"><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className="text-center text-lg tracking-[0.4em]" /></Field>
                  <SubmitButton className="w-full">Aktivieren</SubmitButton>
                </ActionForm>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
