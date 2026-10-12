import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
      <div className="mt-6"><ContentBlocks blocks={d.body(op)} /></div>
      <p className="mt-10 text-sm text-ink-500">Fassung: Oktober 2026</p>
    </article>
  );
}
