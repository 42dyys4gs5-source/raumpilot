import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <Logo className="justify-center" />
        <p className="mt-10 font-display text-6xl font-bold text-brand-200">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Seite nicht gefunden</h1>
        <p className="mt-2 text-ink-600">Die Seite existiert nicht (mehr) oder der Link ist unvollständig.</p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand-700 hover:underline">Zur Startseite</Link>
      </div>
    </div>
  );
}
