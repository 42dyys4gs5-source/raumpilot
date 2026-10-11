import { and, count, eq } from "drizzle-orm";
import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/logo";
import { MobileNav, SidebarNav } from "@/components/dashboard/nav";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();
  const [req] = await db
    .select({ n: count() })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.orgId, ctx.org.id), eq(schema.bookings.status, "requested")));
  const badges = { "/app/buchungen": req.n };
  const status = ctx.org.subscriptionStatus;

  const banner = ctx.org.suspendedAt ? (
    <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
      Ihr Konto ist gesperrt{ctx.org.suspendedReason ? `: ${ctx.org.suspendedReason}` : ""}. Bitte kontaktieren Sie den Support.
    </div>
  ) : !ctx.plan ? (
    <div className="bg-accent-100 px-4 py-2 text-center text-sm text-ink-900">
      {status === "none" ? "Wählen Sie einen Tarif, um Ihre Buchungsseite zu veröffentlichen." : "Ihr Abo ist nicht aktiv – Ihre Buchungsseiten sind nicht buchbar."}{" "}
      <Link href="/app/abonnement" className="font-semibold underline">Tarif wählen</Link>
    </div>
  ) : status === "past_due" ? (
    <div className="bg-amber-500 px-4 py-2 text-center text-sm text-ink-900">
      Die letzte Abo-Zahlung ist fehlgeschlagen. <Link href="/app/abonnement" className="font-semibold underline">Zahlungsmittel aktualisieren</Link>
    </div>
  ) : null;

  const userBox = (
    <div className="border-t border-ink-100 pt-4">
      <p className="truncate text-sm font-medium text-ink-900">{ctx.org.name}</p>
      <p className="truncate text-xs text-ink-500">{ctx.user.email}</p>
      <div className="mt-3 flex items-center gap-2">
        <Link href={`/v/${ctx.org.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
          Buchungsseite <ExternalLink className="size-3" />
        </Link>
        <form action={logoutAction} className="ml-auto">
          <button className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900"><LogOut className="size-3" /> Abmelden</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink-50">
      {banner}
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-200 bg-white px-3 py-5 lg:flex">
          <div className="px-3 pb-5"><Logo href="/app" /></div>
          <div className="flex-1 overflow-y-auto"><SidebarNav badges={badges} /></div>
          <div className="px-3">{userBox}</div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
            <MobileNav badges={badges} header={<Logo href="/app" />} />
            <Logo href="/app" />
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
