import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { CopyField } from "@/components/ui/copy-field";
import { requireOrg } from "@/lib/auth/guards";
import { appUrl } from "@/lib/env";
import { listOrgRooms } from "@/lib/rooms/service";
import { publicUrl } from "@/lib/storage";
import { brandingAction, pageSettingsAction } from "./actions";

export default async function BookingPageSettings() {
  const ctx = await requireOrg("admin");
  const rooms = (await listOrgRooms(ctx.org.id)).filter((r) => r.status === "published");
  const orgUrl = appUrl(`/v/${ctx.org.slug}`);
  const branding = !!ctx.plan?.features.branding;
  return (
    <>
      <PageHeader title="Buchungsseite & QR-Code" description="Teilen Sie Ihre Buchungsseite auf Ihrer Website, bei Google, Instagram, WhatsApp oder vor Ort per QR-Code." actions={<Link href={orgUrl} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">Seite öffnen <ExternalLink className="size-3.5" /></Link>} />
      {rooms.length === 0 && <Alert tone="warning" className="mb-6">Noch kein Raum veröffentlicht. Ihre Seite zeigt erst nach der Veröffentlichung buchbare Räume.</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ihre Übersichtsseite" description="Zeigt alle veröffentlichten Räume." />
          <CardBody className="space-y-4">
            <CopyField label="Link" value={orgUrl} />
            <div className="flex items-center gap-4">
              <img src="/api/qr?inline=1" alt="QR-Code Ihrer Buchungsseite" className="size-32 rounded-lg ring-1 ring-ink-200" />
              <div className="flex flex-col gap-2 text-sm">
                <a href="/api/qr?format=png" className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Download className="size-4" /> PNG (Druck)</a>
                <a href="/api/qr?format=svg" className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Download className="size-4" /> SVG (Vektor)</a>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Einstellungen" />
          <CardBody>
            <ActionForm action={pageSettingsAction}>
              <Field label="Adresse" htmlFor="slug" hint="Achtung: Bereits geteilte Links und QR-Codes funktionieren nach einer Änderung nicht mehr.">
                <div className="flex items-center gap-2"><span className="text-sm text-ink-500">/v/</span><Input id="slug" name="slug" defaultValue={ctx.org.slug} /></div>
              </Field>
              <Field label="Vorstellungstext" htmlFor="about" optional><Textarea id="about" name="about" rows={3} defaultValue={ctx.org.about ?? ""} /></Field>
              <Checkbox name="directoryOptIn" defaultChecked={ctx.org.directoryOptIn} label="Im öffentlichen Raumverzeichnis von Raumvia anzeigen" description="Ihre veröffentlichten Räume erscheinen unter raumvia.ch/raeume und können dort gefunden werden. Jederzeit widerrufbar." />
              <SubmitButton>Speichern</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>

      {rooms.map((r) => (
        <Card key={r.id} className="mt-6">
          <CardHeader title={r.name} />
          <CardBody className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <CopyField label="Buchungslink" value={appUrl(`/r/${r.slug}`)} />
              <CopyField label="Website-Widget (HTML einfügen)" multiline value={`<div data-raumvia-room="${r.slug}"></div>\n<script src="${appUrl("/widget.js")}" async></script>`} />
              <CopyField label="Alternativ: einfacher Button-Link" multiline value={`<a href="${appUrl(`/r/${r.slug}`)}" style="display:inline-block;padding:12px 20px;background:#0f5c4d;color:#fff;border-radius:8px;text-decoration:none;font-family:sans-serif">Jetzt online buchen</a>`} />
            </div>
            <div className="flex flex-col items-center gap-2 text-sm">
              <img src={`/api/qr?inline=1&room=${r.id}`} alt={`QR-Code ${r.name}`} className="size-36 rounded-lg ring-1 ring-ink-200" loading="lazy" />
              <a href={`/api/qr?format=png&room=${r.id}`} className="text-brand-700 hover:underline">PNG</a>
              <a href={`/api/qr?format=svg&room=${r.id}`} className="text-brand-700 hover:underline">SVG</a>
            </div>
          </CardBody>
        </Card>
      ))}

      <Card className="mt-6">
        <CardHeader title="Individuelle Gestaltung" description={branding ? "Ihr Logo und Ihre Markenfarbe auf Buchungsseite, Widget und E-Mails – ohne Raumvia-Hinweis." : "Im Tarif Business: eigenes Logo und Markenfarbe, ohne Raumvia-Hinweis."} />
        <CardBody>
          {branding ? (
            <ActionForm action={brandingAction}>
              {ctx.org.logoPath && <img src={publicUrl(ctx.org.logoPath)!} alt="Aktuelles Logo" className="h-14 w-auto" />}
              <Field label="Logo (PNG, JPG, WebP)" htmlFor="logo" optional><input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" /></Field>
              {ctx.org.logoPath && <Checkbox name="removeLogo" label="Logo entfernen" />}
              <Field label="Markenfarbe" htmlFor="brandColor" hint="Für Buttons und E-Mails. Format #RRGGBB."><Input id="brandColor" name="brandColor" defaultValue={ctx.org.brandColor ?? ""} placeholder="#0f5c4d" className="max-w-40" /></Field>
              <SubmitButton>Speichern</SubmitButton>
            </ActionForm>
          ) : <Link href="/app/abonnement" className="text-sm font-medium text-brand-700 hover:underline">Tarife vergleichen</Link>}
        </CardBody>
      </Card>
    </>
  );
}
