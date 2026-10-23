import { and, eq, inArray } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/guides";
import { HELP_ARTICLES } from "@/content/help";
import { LEGAL_DOCS } from "@/content/legal";
import { SOLUTIONS } from "@/content/solutions";
import { ACCESS_STATUSES } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["/", "/funktionen", "/preise", "/so-funktionierts", "/demo", "/faq", "/kontakt", "/loesungen", "/raeume", "/hilfe", "/ratgeber", "/registrieren"].map((p) => ({
    url: appUrl(p),
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1 : 0.7,
  }));
  let rooms: { slug: string; updatedAt: Date }[] = [];
  let orgs: { slug: string }[] = [];
  try {
    rooms = await db
      .select({ slug: schema.rooms.slug, updatedAt: schema.rooms.updatedAt })
      .from(schema.rooms)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.rooms.orgId))
      .where(and(eq(schema.rooms.status, "published"), inArray(schema.organizations.subscriptionStatus, [...ACCESS_STATUSES])));
    orgs = await db
      .selectDistinct({ slug: schema.organizations.slug })
      .from(schema.organizations)
      .innerJoin(schema.rooms, eq(schema.rooms.orgId, schema.organizations.id))
      .where(and(eq(schema.rooms.status, "published"), inArray(schema.organizations.subscriptionStatus, [...ACCESS_STATUSES])));
  } catch {
    /* database unavailable – static entries only */
  }
  return [
    ...statics,
    ...SOLUTIONS.map((s) => ({ url: appUrl(`/loesungen/${s.slug}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...GUIDES.map((g) => ({ url: appUrl(`/ratgeber/${g.slug}`), lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...HELP_ARTICLES.map((a) => ({ url: appUrl(`/hilfe/${a.slug}`), changeFrequency: "monthly" as const, priority: 0.5 })),
    ...LEGAL_DOCS.map((d) => ({ url: appUrl(`/rechtliches/${d.slug}`), changeFrequency: "yearly" as const, priority: 0.2 })),
    ...rooms.map((r) => ({ url: appUrl(`/r/${r.slug}`), lastModified: r.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...orgs.map((o) => ({ url: appUrl(`/v/${o.slug}`), changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
