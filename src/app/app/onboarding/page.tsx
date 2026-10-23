import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PlanCards } from "@/components/billing/plan-cards";
import { NewRoomForm } from "@/components/dashboard/new-room-form";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert, Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { getOrgContext, requireUser } from "@/lib/auth/guards";
import { listPlans } from "@/lib/billing/entitlements";
import { paymentsEnabled } from "@/lib/env";
import { listOrgRooms } from "@/lib/rooms/service";
import { vatNote } from "@/lib/settings";
import { cn } from "@/lib/utils/cn";
import { subscribeAction } from "../(main)/abonnement/actions";
import { finishOnboardingAction, onboardingProfileAction } from "./actions";
import { recordFunnelEvent } from "@/lib/admin/funnel";

export const metadata: Metadata = { title: "Einrichtung", robots: { index: false } };

const STEPS = ["Ihre Angaben", "Erster Raum", "Tarif", "Veröffentlichen"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ schritt?: string }> }) {
  await requireUser();
  const ctx = await getOrgContext();
  const rooms = ctx ? await listOrgRooms(ctx.org.id) : [];
  const sp = await searchParams;
  let step = Number(sp.schritt ?? 0) || (!ctx ? 1 : rooms.length === 0 ? 1 : !ctx.plan ? 3 : 4);
  if (step > 1 && !ctx) step = 1;
  step = Math.max(1, Math.min(STEPS.length, step));
  if (step === 3 && ctx) await recordFunnelEvent("funnel.plan_selection_opened", ctx.org.id);
  const [plans, note] = await Promise.all([listPlans(), vatNote()]);

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo href="/app" />
          {ctx && <Link href="/app" className="text-sm text-ink-500 hover:underline">Später fortsetzen</Link>}
        </div>
      </header>
      <main className="container-page max-w-4xl py-8">
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label={`Fortschritt: Schritt ${step} von ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <div className={cn("h-1.5 overflow-hidden rounded-full bg-ink-200", i + 1 <= step && "bg-brand-100")}>
                <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", i + 1 < step ? "w-full bg-brand-600" : i + 1 === step ? "w-2/3 bg-brand-600" : "w-0")} />
              </div>
              <span className={cn("mt-2 hidden text-xs sm:block", i + 1 === step ? "font-semibold text-brand-800" : "text-ink-400")} aria-current={i + 1 === step ? "step" : undefined}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mb-5 text-sm font-medium text-ink-600 sm:hidden">Schritt {step} von {STEPS.length} <span aria-hidden="true" className="mx-1 text-ink-300">·</span><span className="text-ink-900">{STEPS[step - 1]}</span></p>

        {step === 1 && (
          <Card>
            <CardBody>
              <h1 className="text-2xl font-semibold">Willkommen! Wie heisst Ihr Angebot?</h1>
              <p className="mt-1 text-sm text-ink-500">Diese Angaben erscheinen auf Ihrer Buchungsseite. Sie können sie jederzeit ändern.</p>
              <ActionForm action={onboardingProfileAction} className="mt-6">
                <Field label="Name (Firma oder Angebot)" htmlFor="name"><Input id="name" name="name" defaultValue={ctx?.org.name ?? ""} required /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Telefon für Mieter" htmlFor="phone" optional><Input id="phone" name="phone" type="tel" defaultValue={ctx?.org.phone ?? ""} /></Field>
                  <Field label="Website" htmlFor="website" optional><Input id="website" name="website" type="url" placeholder="https://" defaultValue={ctx?.org.website ?? ""} /></Field>
                </div>
                <Field label="Kurzvorstellung" htmlFor="about" hint="2–3 Sätze über Sie und Ihre Räume." optional><Textarea id="about" name="about" rows={3} defaultValue={ctx?.org.about ?? ""} /></Field>
                <SubmitButton>Weiter</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}

        {step === 2 && ctx && (
          <Card>
            <CardBody>
              <h1 className="text-2xl font-semibold">Erfassen Sie Ihren ersten Raum</h1>
              <p className="mt-1 text-sm text-ink-500">Starten Sie mit den Grunddaten. Fotos, weitere Preise und Regeln ergänzen Sie danach in Ruhe.</p>
              <div className="mt-6">
                {rooms.length > 0 ? (
                  <div className="space-y-4">
                    <Alert tone="success">Sie haben bereits «{rooms[0].name}» erfasst.</Alert>
                    <ButtonLink href="/app/onboarding?schritt=3">Weiter</ButtonLink>
                  </div>
                ) : (
                  <NewRoomForm next="onboarding" defaultCity={ctx.org.city} />
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {step === 3 && ctx && (
          <div>
            <h1 className="text-2xl font-semibold">Wählen Sie Ihren Tarif</h1>
            <p className="mb-6 mt-1 text-sm text-ink-500">Monatlich kündbar. Sie können jederzeit wechseln.</p>
            {ctx.plan ? (
              <div className="space-y-4"><Alert tone="success">Ihr Tarif {ctx.plan.name} ist aktiv.</Alert><ButtonLink href="/app/onboarding?schritt=4">Weiter</ButtonLink></div>
            ) : (
              <>
                {!paymentsEnabled && <Alert tone="info" className="mb-4">Die Online-Abrechnung ist auf dieser Installation noch nicht aktiviert. Kontaktieren Sie uns für eine Freischaltung.</Alert>}
                <PlanCards plans={plans} action={subscribeAction} vatNote={note} />
                <p className="mt-6 text-center text-sm"><Link href="/app/onboarding?schritt=4" className="text-ink-500 underline">Ohne Tarif fortfahren (Raum bleibt im Entwurf)</Link></p>
              </>
            )}
          </div>
        )}

        {step === 4 && ctx && (
          <Card>
            <CardBody>
              <CheckCircle2 className="size-10 text-emerald-600" />
              <h1 className="mt-3 text-2xl font-semibold">Fast geschafft</h1>
              <p className="mt-1 text-ink-600">Sehen Sie zuerst Ihre private Buchungsseiten-Vorschau an. Fotos, Zeiten und weitere Regeln können Sie anschliessend in Ruhe ergänzen.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {rooms[0] && <ButtonLink href={`/app/raeume/${rooms[0].id}/vorschau`}>Private Vorschau ansehen</ButtonLink>}
                {rooms[0] && <ButtonLink href={`/app/raeume/${rooms[0].id}`} variant="secondary">Buchungsseite fertig einrichten</ButtonLink>}
                {rooms[0] && <ButtonLink href={`/app/raeume/${rooms[0].id}?tab=fotos`}>Fotos hinzufügen</ButtonLink>}
                {rooms[0] && <ButtonLink href={`/app/raeume/${rooms[0].id}?tab=veroeffentlichen`} variant="ghost">Veröffentlichen</ButtonLink>}
                <ButtonLink href="/app/buchungsseite" variant="secondary">Link & QR-Code</ButtonLink>
                <ButtonLink href="/app/einnahmen" variant="ghost">Onlinezahlung einrichten</ButtonLink>
              </div>
              <form action={finishOnboardingAction} className="mt-8 border-t border-ink-100 pt-6">
                <button className="text-sm font-medium text-brand-700 hover:underline">Einrichtung abschliessen und zum Dashboard</button>
              </form>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}
