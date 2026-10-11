"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { hasFeature } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/security/audit";
import { deleteObject } from "@/lib/storage";
import { storeImage, UploadError } from "@/lib/storage/images";
import { RESERVED_SLUGS } from "@/lib/utils/slug";

export async function pageSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  if (slug !== ctx.org.slug) {
    if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(slug) || RESERVED_SLUGS.has(slug)) return fail("Ungültige Adresse (3–60 Zeichen, Kleinbuchstaben, Ziffern, Bindestriche).");
    const [t] = await db.select({ id: schema.organizations.id }).from(schema.organizations).where(eq(schema.organizations.slug, slug));
    if (t) return fail("Diese Adresse ist bereits vergeben.");
  }
  await db
    .update(schema.organizations)
    .set({ slug, about: String(fd.get("about") ?? "").slice(0, 2000) || null, directoryOptIn: fd.get("directoryOptIn") === "on", updatedAt: new Date() })
    .where(eq(schema.organizations.id, ctx.org.id));
  await audit("org.page_updated", { userId: ctx.user.id, orgId: ctx.org.id, data: { directoryOptIn: fd.get("directoryOptIn") === "on" } });
  revalidatePath("/app/buchungsseite");
  return success("Gespeichert.");
}

export async function brandingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  if (!(await hasFeature(ctx.org, "branding"))) return fail("Individuelle Gestaltung ist im Tarif Business enthalten.");
  const color = String(fd.get("brandColor") ?? "").trim();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return fail("Bitte eine Farbe im Format #RRGGBB angeben.");
  let logoPath = ctx.org.logoPath;
  const file = fd.get("logo");
  if (file instanceof File && file.size > 0) {
    try {
      const img = await storeImage(file, `orgs/${ctx.org.id}/brand`, { maxWidth: 600, thumbWidth: 200 });
      if (logoPath) await deleteObject(logoPath);
      logoPath = img.path;
    } catch (e) {
      if (e instanceof UploadError) return fail(e.message);
      throw e;
    }
  }
  if (fd.get("removeLogo") === "on" && logoPath) {
    await deleteObject(logoPath);
    logoPath = null;
  }
  await db.update(schema.organizations).set({ brandColor: color || null, logoPath, updatedAt: new Date() }).where(eq(schema.organizations.id, ctx.org.id));
  revalidatePath("/app/buchungsseite");
  return success("Gestaltung gespeichert.");
}
