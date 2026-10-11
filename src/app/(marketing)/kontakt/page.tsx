import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Turnstile } from "@/components/ui/turnstile";
import { env } from "@/lib/env";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { BotFields, Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { PageHero } from "@/components/marketing/page-hero";
import { BRAND } from "@/config/brand";
import { appUrl } from "@/lib/env";
import { contactAction } from "./actions";

export const metadata: Metadata = { title: "Kontakt", description: "Fragen zu Raumvia? Schreiben Sie uns.", alternates: { canonical: appUrl("/kontakt") } };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Kontakt" title="Wir helfen gerne weiter" intro="Fragen zu Funktionen, Tarifen oder zur Einrichtung? Schreiben Sie uns – wir antworten persönlich." />
      <section className="py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4 text-ink-600">
            <p className="flex items-center gap-2"><Mail className="size-5 text-brand-700" /><a href={`mailto:${BRAND.salesEmail}`} className="hover:underline">{BRAND.salesEmail}</a></p>
            <p>Bestehende Kundinnen und Kunden erreichen den Support direkt im Dashboard unter «Hilfe & Support».</p>
            <p>Viele Antworten finden Sie auch in den <Link href="/faq" className="text-brand-700 underline">häufigen Fragen</Link> und in der <Link href="/hilfe" className="text-brand-700 underline">Wissensdatenbank</Link>.</p>
          </div>
          <div className="rounded-2xl border border-ink-200 p-6 shadow-soft">
            <ActionForm action={contactAction} resetOnSuccess>
              <BotFields />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="name"><Input id="name" name="name" autoComplete="name" required /></Field>
                <Field label="E-Mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
              </div>
              <Field label="Betreff" htmlFor="subject" optional><Input id="subject" name="subject" /></Field>
              <Field label="Nachricht" htmlFor="message"><Textarea id="message" name="message" rows={6} required /></Field>
              <Checkbox name="privacy" required label={<>Ich bin einverstanden, dass meine Angaben zur Beantwortung gespeichert werden (<Link href="/rechtliches/datenschutz" className="underline">Datenschutz</Link>).</>} />
        <Turnstile siteKey={env.TURNSTILE_SITE_KEY} />
              <SubmitButton>Nachricht senden</SubmitButton>
            </ActionForm>
          </div>
        </div>
      </section>
    </>
  );
}
