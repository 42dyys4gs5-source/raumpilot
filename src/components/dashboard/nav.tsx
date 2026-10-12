"use client";

import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarOff,
  CreditCard,
  DoorOpen,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Menu,
  MoreHorizontal,
  PackagePlus,
  Settings,
  Tag,
  Ticket,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export const NAV = [
  { href: "/app", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/app/raeume", label: "Meine Räume", icon: DoorOpen },
  { href: "/app/kalender", label: "Buchungskalender", icon: CalendarDays },
  { href: "/app/buchungen", label: "Buchungen", icon: ListChecks },
  { href: "/app/kunden", label: "Kunden", icon: Users },
  { href: "/app/einnahmen", label: "Zahlungen & Einnahmen", icon: BarChart3 },
  { href: "/app/preise", label: "Preise", icon: Tag },
  { href: "/app/zusatzleistungen", label: "Zusatzleistungen", icon: PackagePlus },
  { href: "/app/verfuegbarkeit", label: "Verfügbarkeit", icon: CalendarOff },
  { href: "/app/gutscheine", label: "Gutscheine", icon: Ticket },
  { href: "/app/buchungsseite", label: "Buchungsseite & QR-Code", icon: Globe },
  { href: "/app/benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { href: "/app/einstellungen", label: "Einstellungen", icon: Settings },
  { href: "/app/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/app/support", label: "Hilfe & Support", icon: LifeBuoy },
];

function Links({ onNavigate, badges }: { onNavigate?: () => void; badges?: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Hauptmenü" className="space-y-0.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        const badge = badges?.[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-brand-700" : "text-ink-400")} />
            <span className="flex-1">{item.label}</span>
            {badge ? <span className="rounded-full bg-accent-500 px-1.5 text-xs font-semibold text-ink-900">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNav({ badges }: { badges?: Record<string, number> }) {
  return <Links badges={badges} />;
}

const TABS = [
  { ...NAV[0], short: "Übersicht" },
  { ...NAV[2], short: "Kalender" },
  { ...NAV[3], short: "Buchungen" },
  { ...NAV[1], short: "Räume" },
];

function isActive(pathname: string, item: (typeof NAV)[number]) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

export function MobileNav({ badges, header, footer }: { badges?: Record<string, number>; header: React.ReactNode; footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = NAV.find((item) => isActive(pathname, item));
  return (
    <>
      <button type="button" className="-ml-1 rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Menü öffnen" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu className="size-6" />
      </button>
      {current && <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{current.label}</span>}
      {/* Rendered into <body> so no ancestor (e.g. one with backdrop-filter) can clip the fixed overlay. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85%] flex-col bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              {header}
              <button type="button" className="rounded-lg p-2 hover:bg-ink-100" aria-label="Menü schliessen" onClick={() => setOpen(false)}>
                <X className="size-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [&_a]:py-3 [&_a]:text-base">
              <Links badges={badges} onNavigate={() => setOpen(false)} />
            </div>
            {footer && <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </div>
        </div>,
        document.body,
      )}
      <nav aria-label="Schnellzugriff" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          {TABS.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            const badge = badges?.[item.href];
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-700" : "text-ink-500")}>
                <Icon className="size-5" />
                {item.short}
                {badge ? <span className="absolute right-1/4 top-1 rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-ink-900">{badge}</span> : null}
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-500">
            <MoreHorizontal className="size-5" />
            Mehr
          </button>
        </div>
      </nav>
    </>
  );
}
