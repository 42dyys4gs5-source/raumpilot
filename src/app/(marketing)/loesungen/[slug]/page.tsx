import { ArrowRight, Check, X } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { ContentBlocks } from "@/components/marketing/content-blocks";
import { PageHero } from "@/components/marketing/page-hero";
import { getSolution, SOLUTIONS } from "@/content/solutions";
import { appUrl } from "@/lib/env";

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = getSolution((await params).slug);
  if (!s) return {};
  return { title: s.metaTitle, description: s.metaDescription, alternates: { canonical: appUrl(`/loesungen/${s.slug}`) }, openGraph: { title: s.metaTitle, description: s.metaDescription } };
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = getSolution((await params).slug);
  if (!s) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Lösungen", item: appUrl("/loesungen") }, { "@type": "ListItem", position: 2, name: s.name, item: appUrl(`/loesungen/${s.slug}`) }] },
      { "@type": "FAQPage", mainEntity: s.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
  return (
    <>
      <PageHero eyebrow={`Lösung für ${s.name}`} title={s.headline} intro={s.intro}>
        <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/registrieren" size="lg">Kostenlos testen <ArrowRight /></ButtonLink><ButtonLink href="/preise" size="lg" variant="secondary">Preise</ButtonLink></div>
      </PageHero>
      <section className="py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl bg-ink-50 p-6">
            <h2 className="text-lg font-semibold">Kennen Sie das?</h2>
            <ul className="mt-4 space-y-3">{s.pains.map((p) => <li key={p} className="flex gap-2 text-sm text-ink-700"><X className="mt-0.5 size-4 shrink-0 text-red-500" />{p}</li>)}</ul>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {s.features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-ink-200 p-5">
                <h3 className="flex items-center gap-2 font-semibold"><Check className="size-4 text-brand-600" />{f.title}</h3>
                <p className="mt-2 text-sm text-ink-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="container-page mt-14 max-w-3xl"><ContentBlocks blocks={s.body} /></div>
        <div className="container-page mt-10 max-w-3xl">
          <h2 className="text-2xl font-semibold">Fragen zu {s.name}</h2>
          <div className="mt-4 divide-y divide-ink-200 rounded-2xl border border-ink-200">
            {s.faq.map((f) => <details key={f.q} className="p-5"><summary className="cursor-pointer font-medium">{f.q}</summary><p className="mt-2 text-sm text-ink-600">{f.a}</p></details>)}
          </div>
        </div>
        <div className="mt-14 text-center"><ButtonLink href="/registrieren" size="lg">Ihren Raum jetzt online stellen <ArrowRight /></ButtonLink></div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
