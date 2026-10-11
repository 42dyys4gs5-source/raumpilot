import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : "";

function csp(frameAncestors: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`.trim(),
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
    "frame-src https://challenges.cloudflare.com",
    `frame-ancestors ${frameAncestors}`,
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com https://connect.stripe.com",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const common = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["sharp"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [
      { source: "/((?!embed/).*)", headers: [...common, { key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: csp("'none'") }] },
      // Booking widget may be embedded on landlord websites.
      { source: "/embed/:path*", headers: [...common, { key: "Content-Security-Policy", value: csp("*") }] },
      { source: "/widget.js", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
    ];
  },
};

export default nextConfig;
