import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentBlocks } from "@/components/marketing/content-blocks";
import { getArticle, HELP_ARTICLES } from "@/content/help";
import { appUrl } from "@/lib/env";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return a ? { title: a.title, description: a.summary, alternates: { canonical: appUrl(`/hilfe/${a.slug}`) } } : {};
}

export default async function HelpArticle({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const others = HELP_ARTICLES.filter((x) => x.slug !== a.slug && x.category === a.category).slice(0, 3);
  return (
    <article className="container-page max-w-3xl py-14">
      <nav className="text-sm text-ink-500"><Link href="/hilfe" className="hover:underline">Wissensdatenbank</Link> / {a.category}</nav>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{a.title}</h1>
      <p className="mt-3 text-lg text-ink-600">{a.summary}</p>
      <div className="mt-8"><ContentBlocks blocks={a.body} /></div>
      {others.length > 0 && (
        <aside className="mt-12 border-t border-ink-200 pt-6">
          <h2 className="text-sm font-semibold text-ink-500">Weitere Artikel</h2>
          <ul className="mt-2 space-y-1">{others.map((o) => <li key={o.slug}><Link href={`/hilfe/${o.slug}`} className="text-brand-700 hover:underline">{o.title}</Link></li>)}</ul>
        </aside>
      )}
    </article>
  );
}
