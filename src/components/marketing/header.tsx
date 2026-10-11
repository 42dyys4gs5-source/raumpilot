"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const SOLUTIONS = [
  ["eventraeume", "Eventräume"],
  ["partyraeume", "Partyräume"],
  ["sitzungszimmer", "Sitzungszimmer"],
  ["seminarraeume", "Seminarräume"],
  ["fotostudios", "Fotostudios"],
  ["proberaeume", "Proberäume"],
  ["tanzstudios", "Tanz- & Yogastudios"],
] as const;

const LINKS = [
  { href: "/funktionen", label: "Funktionen" },
  { href: "/preise", label: "Preise" },
  { href: "/so-funktionierts", label: "So funktioniert's" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingHeader({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("sticky top-0 z-40 transition-all", scrolled ? "border-b border-ink-200/70 bg-white/85 backdrop-blur-md" : "bg-transparent")}>
      <div className="container-page flex h-16 items-center gap-8">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
          <div className="group relative">
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-900" aria-haspopup="true">
              Lösungen <ChevronDown className="size-4 transition group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full w-64 translate-y-1 rounded-xl border border-ink-200 bg-white p-2 opacity-0 shadow-lift transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {SOLUTIONS.map(([slug, label]) => <Link key={slug} href={`/loesungen/${slug}`} className="block rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">{label}</Link>)}
              <Link href="/loesungen" className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">Alle Branchen</Link>
            </div>
          </div>
          {LINKS.map((l) => <Link key={l.href} href={l.href} className={cn("rounded-lg px-3 py-2 text-sm font-medium hover:text-ink-900", pathname === l.href ? "text-ink-900" : "text-ink-700")}>{l.label}</Link>)}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {loggedIn ? <ButtonLink href="/app">Zum Dashboard</ButtonLink> : (
            <>
              <ButtonLink href="/login" variant="ghost">Anmelden</ButtonLink>
              <ButtonLink href="/registrieren">Kostenlos testen</ButtonLink>
            </>
          )}
        </div>
        <button className="ml-auto rounded-lg p-2 lg:hidden" aria-label={open ? "Menü schliessen" : "Menü öffnen"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-ink-200 bg-white lg:hidden">
          <nav className="container-page space-y-1 py-4" aria-label="Mobile Navigation">
            <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Lösungen</p>
            {SOLUTIONS.map(([slug, label]) => <Link key={slug} href={`/loesungen/${slug}`} className="block rounded-lg px-3 py-2 text-ink-700 hover:bg-ink-50">{label}</Link>)}
            <div className="my-2 border-t border-ink-100" />
            {LINKS.map((l) => <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 font-medium text-ink-800 hover:bg-ink-50">{l.label}</Link>)}
            <div className="grid grid-cols-2 gap-2 pt-3">
              {loggedIn ? <ButtonLink href="/app" className="col-span-2">Zum Dashboard</ButtonLink> : (
                <>
                  <ButtonLink href="/login" variant="secondary">Anmelden</ButtonLink>
                  <ButtonLink href="/registrieren">Kostenlos testen</ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
