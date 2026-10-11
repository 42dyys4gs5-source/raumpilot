import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/card";
import { ContentBlocks } from "@/components/marketing/content-blocks";
import { getLegalDoc } from "@/content/legal";
import { appUrl } from "@/lib/env";
import { getOperator } from "@/lib/settings";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getLegalDoc((await params).slug);
  return d ? { title: d.title, description: d.description, alternates: { canonical: appUrl(`/rechtliches/${d.slug}`) } } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = getLegalDoc((await params).slug);
  if (!d) notFound();
  const op = await getOperator();
  return (
    <article className="container-page max-w-3xl py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{d.title}</h1>
      <Alert tone="warning" className="mt-6" title="Entwurf – rechtliche Prüfung erforderlich">
        Dieser Text ist eine sorgfältig erstellte Vorlage, aber keine Rechtsberatung. Er muss vor dem produktiven Einsatz von einer Fachperson geprüft und an die tatsächlichen Verhältnisse angepasst werden.
      </Alert>
      <div className="mt-8"><ContentBlocks blocks={d.body(op)} /></div>
      <p className="mt-10 text-sm text-ink-500">Fassung: Entwurf Oktober 2026</p>
    </article>
  );
}
