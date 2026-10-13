import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { ContentBlocks } from "@/components/marketing/content-blocks";
import { BRAND } from "@/config/brand";
import { getGuide, GUIDES } from "@/content/guides";
import { getSolution } from "@/content/solutions";
import { appUrl } from "@/lib/env";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  return {
    title: g.metaTitle,
    description: g.description,
    alternates: { canonical: appUrl(`/ratgeber/${g.slug}`) },
    openGraph: { title: g.metaTitle, description: g.description, type: "article" },
  };
}

const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const solutions = g.solutions.map(getSolution).filter((s) => !!s);
  const others = GUIDES.filter((x) => x.slug !== g.slug && (x.category === g.category || x.solutions.some((s) => g.solutions.includes(s)))).slice(0, 3);
  const url = appUrl(`/ratgeber/${g.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: g.title, description: g.description, datePublished: g.updated, dateModified: g.updated, inLanguage: "de-CH", mainEntityOfPage: url, author: { "@type": "Organization", name: BRAND.name, url: appUrl("/") }, publisher: { "@type": "Organization", name: BRAND.name, url: appUrl("/") } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ratgeber", item: appUrl("/ratgeber") }, { "@type": "ListItem", position: 2, name: g.title, item: url }] },
      ...(g.faq.length ? [{ "@type": "FAQPage", mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
    ],
  };
  return (
    <article className="container-page max-w-3xl py-14">
      <nav className="text-sm text-ink-500"><Link href="/ratgeber" className="hover:underline">Ratgeber</Link> / {g.category}</nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{g.title}</h1>
      <p className="mt-3 text-sm text-ink-500">Aktualisiert am {dateFmt.format(new Date(g.updated))} · {g.readMinutes} Min. Lesezeit</p>
      <p className="mt-5 text-lg leading-relaxed text-ink-700">{g.intro}</p>
      <div className="mt-8"><ContentBlocks blocks={g.body} /></div>

      {g.faq.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Häufige Fragen</h2>
          <div className="mt-4 divide-y divide-ink-200 rounded-2xl border border-ink-200">
            {g.faq.map((f) => <details key={f.q} className="p-5"><summary className="cursor-pointer font-medium">{f.q}</summary><p className="mt-2 text-sm text-ink-600">{f.a}</p></details>)}
          </div>
        </section>
      )}

      <aside className="mt-12 rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100">
        <h2 className="text-lg font-semibold text-ink-900">Ihren Raum online buchbar machen</h2>
        <p className="mt-2 text-sm text-ink-700">Mit {BRAND.name} sehen Interessierte freie Termine und Preise sofort, buchen verbindlich und bezahlen online – ohne Doppelbuchungen und ohne E-Mail-Pingpong.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/registrieren">Kostenlos testen <ArrowRight /></ButtonLink>
          {solutions[0] && <ButtonLink href={`/loesungen/${solutions[0].slug}`} variant="secondary">Lösung für {solutions[0].name}</ButtonLink>}
        </div>
      </aside>

      {others.length > 0 && (
        <aside className="mt-12 border-t border-ink-200 pt-6">
          <h2 className="text-sm font-semibold text-ink-500">Weitere Ratgeber</h2>
          <ul className="mt-2 space-y-1">{others.map((o) => <li key={o.slug}><Link href={`/ratgeber/${o.slug}`} className="text-brand-700 hover:underline">{o.title}</Link></li>)}</ul>
        </aside>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </article>
  );
}
