import type { MetadataRoute } from "next";
import { appUrl, isProd } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  // Non-production deployments (previews) must not be indexed.
  if (!isProd || process.env.VERCEL_ENV === "preview") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/api", "/buchung", "/embed", "/dev", "/konto", "/login", "/email-bestaetigen", "/passwort-zuruecksetzen", "/einladung"] }],
    sitemap: appUrl("/sitemap.xml"),
    host: appUrl(),
  };
}
