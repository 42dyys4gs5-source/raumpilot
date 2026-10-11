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
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
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

export function MobileNav({ badges, header }: { badges?: Record<string, number>; header: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <button type="button" className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Menü öffnen" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85%] flex-col overflow-y-auto bg-white p-4 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              {header}
              <button type="button" className="rounded-lg p-2 hover:bg-ink-100" aria-label="Menü schliessen" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <Links badges={badges} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
