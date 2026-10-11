import { Activity, AlertTriangle, Building2, CreditCard, LayoutDashboard, LifeBuoy, LogOut, Mail, Settings, Shield, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/logo";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/vermieter", label: "Vermieter", icon: Building2 },
  { href: "/admin/abos", label: "Abos & Rechnungen", icon: CreditCard },
  { href: "/admin/tarife", label: "Tarife", icon: Tags },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/emails", label: "E-Mails", icon: Mail },
  { href: "/admin/fehler", label: "Fehler", icon: AlertTriangle },
  { href: "/admin/sicherheit", label: "Sicherheit", icon: Shield },
  { href: "/admin/system", label: "System & Jobs", icon: Activity },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-800 bg-ink-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Logo href="/admin" inverted className="text-base" />
          <span className="rounded bg-accent-500 px-1.5 py-0.5 text-xs font-semibold text-ink-900">Admin</span>
          <span className="ml-auto hidden text-sm text-ink-300 sm:block">{s.user.email}</span>
          <form action={logoutAction}><button className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-white"><LogOut className="size-4" /> Abmelden</button></form>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Admin-Navigation">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ink-200 hover:bg-white/10 hover:text-white"><n.icon className="size-4" />{n.label}</Link>)}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
