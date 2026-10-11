import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { FAQ } from "@/content/faq";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Häufige Fragen",
  description: "Antworten zu Raumvia: Doppelbuchungen, Anfragen, Stornierung, Zahlung mit TWINT, Gebühren, Abo und Datenschutz.",
  alternates: { canonical: appUrl("/faq") },
};

export default function FaqPage() {
  const groups = [...new Set(FAQ.map((f) => f.group))];
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <PageHero eyebrow="FAQ" title="Häufige Fragen" intro="Die wichtigsten Antworten auf einen Blick. Ausführliche Anleitungen finden Sie in der Wissensdatenbank." />
      <section className="py-16">
        <div className="container-page max-w-3xl space-y-10">
          {groups.map((g) => (
            <div key={g}>
              <h2 className="text-xl font-semibold">{g}</h2>
              <div className="mt-4 divide-y divide-ink-200 rounded-2xl border border-ink-200">
                {FAQ.filter((f) => f.group === g).map((f) => (
                  <details key={f.q} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span className="text-ink-400 transition group-open:rotate-45">+</span></summary><p className="mt-3 text-sm text-ink-600">{f.a}</p></details>
                ))}
              </div>
            </div>
          ))}
          <p className="text-ink-600">Weitere Fragen? <Link href="/hilfe" className="text-brand-700 underline">Wissensdatenbank</Link> oder <Link href="/kontakt" className="text-brand-700 underline">Kontakt</Link>.</p>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
