import { CalendarCheck2, CreditCard, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,540px)]">
      <aside className="relative hidden overflow-hidden bg-brand-900 p-12 text-brand-50 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-brand-700/40 blur-3xl" />
        <Logo inverted />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">Ihr Raum. Online buchbar. Ohne Telefon-Pingpong.</h2>
          <ul className="mt-8 space-y-4 text-brand-100">
            <li className="flex gap-3"><CalendarCheck2 className="mt-0.5 size-5 shrink-0 text-accent-400" />Echtzeit-Verfügbarkeit ohne Doppelbuchungen</li>
            <li className="flex gap-3"><CreditCard className="mt-0.5 size-5 shrink-0 text-accent-400" />Onlinezahlung direkt auf Ihr Konto</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-400" />Entwickelt in der Schweiz, datensparsam</li>
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">Buchungssoftware für Event-, Seminar-, Probe- und Partyräume, Studios und Sitzungszimmer.</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
