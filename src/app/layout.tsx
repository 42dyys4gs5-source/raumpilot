import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/config/brand";
import { env } from "@/lib/env";
import "./globals.css";

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});
const jakarta = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: `${BRAND.name} – Online-Buchungssoftware für Raumvermietung`, template: `%s | ${BRAND.name}` },
  description:
    "Raumvia ist die Schweizer Buchungssoftware für Event-, Party-, Seminar- und Proberäume, Fotostudios und Sitzungszimmer: eigene Buchungsseite, Kalender, Onlinezahlung und automatische Bestätigungen.",
  applicationName: BRAND.name,
  openGraph: { type: "website", locale: "de_CH", siteName: BRAND.name },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: BRAND.primary, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

