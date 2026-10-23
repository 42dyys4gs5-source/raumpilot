import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { BookingDemo } from "@/components/marketing/booking-demo";
import { appUrl } from "@/lib/env";
export const metadata: Metadata = {
  title: "Interaktive Demo – Raumvermietung ausprobieren",
  description: "Probieren Sie Raumvia ohne Anmeldung aus: Termin auswählen, Beispielpreis berechnen und die Vermieteransicht entdecken. Keine echte Buchung oder Zahlung.",
  alternates: { canonical: appUrl("/demo") },
};
export default function DemoPage() {
  return <><PageHero eyebrow="Interaktive Demo" title="So einfach kann Raumvermietung sein." intro="Schlüpfen Sie in die Rolle Ihrer Gäste. Wählen Sie einen Termin und sehen Sie danach, was bei Ihnen als Vermieter ankommt." /><section className="container-page pb-16"><BookingDemo /></section></>;
}
