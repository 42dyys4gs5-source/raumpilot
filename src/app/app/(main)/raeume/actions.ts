"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { maxRoomsFor, roomUsage } from "@/lib/billing/entitlements";
import { POLICY_PRESETS } from "@/lib/booking/policy";
import { db, schema } from "@/lib/db";
import { ROOM_CATEGORIES } from "@/lib/db/schema";
import { AMENITIES, timeToMinutes } from "@/lib/rooms/constants";
import { createRoom, getOrgRoom, publishChecklist, RoomLimitError } from "@/lib/rooms/service";
import { audit } from "@/lib/security/audit";
import { deleteObject } from "@/lib/storage";
import { storeImage, UploadError } from "@/lib/storage/images";
import { parseMoney } from "@/lib/utils/money";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string, def = 0) => {
  const n = Number(str(fd, k));
  return Number.isFinite(n) ? Math.round(n) : def;
};

async function roomOrFail(fd: FormData) {
  const ctx = await requireOrg("admin");
  const room = await getOrgRoom(ctx.org.id, str(fd, "roomId"));
  if (!room) throw new Error("Raum nicht gefunden");
  return { ctx, room };
}

function done(roomId: string, msg = "Gespeichert.") {
  revalidatePath(`/app/raeume/${roomId}`);
  revalidatePath("/app/raeume");
  return success(msg);
}

export async function createRoomAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const name = str(fd, "name");
  const category = str(fd, "category") as (typeof ROOM_CATEGORIES)[number];
  if (name.length < 2) return fail("Bitte geben Sie einen Raumnamen an.", { name: "Erforderlich" });
  if (!ROOM_CATEGORIES.includes(category)) return fail("Bitte wählen Sie eine Kategorie.");
  const hourly = parseMoney(str(fd, "hourlyPrice"));
  let room;
  try {
    room = await createRoom(ctx.org, {
      name,
      category,
      capacity: Math.max(1, int(fd, "capacity", 10)),
      hourlyPrice: hourly,
      city: str(fd, "city") || null,
    });
  } catch (e) {
    if (e instanceof RoomLimitError) return fail(e.message);
    throw e;
  }
  await audit("room.created", { userId: ctx.user.id, orgId: ctx.org.id, data: { roomId: room.id } });
  const next = str(fd, "next");
  redirect(next === "onboarding" ? `/app/onboarding?schritt=3` : `/app/raeume/${room.id}?neu=1`);
}

const generalSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum(ROOM_CATEGORIES),
  shortDescription: z.string().max(200),
  description: z.string().max(8000),
  street: z.string().max(120),
  postalCode: z.string().max(12),
  city: z.string().max(80),
  capacity: z.number().int().min(1).max(5000),
  sizeSqm: z.number().int().min(0).max(100000).nullable(),
});

export async function updateGeneralAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, room } = await roomOrFail(fd);
  const parsed = generalSchema.safeParse({
    name: str(fd, "name"),
    category: str(fd, "category"),
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    street: str(fd, "street"),
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    capacity: int(fd, "capacity", 1),
    sizeSqm: str(fd, "sizeSqm") ? int(fd, "sizeSqm") : null,
  });
  if (!parsed.success) return fail("Bitte prüfen Sie Ihre Eingaben (Name mind. 2 Zeichen, Kapazität mind. 1).");
  const known = new Set<string>(AMENITIES);
  const amenities = [
    ...fd.getAll("amenities").map(String).filter((a) => known.has(a)),
    ...str(fd, "customAmenities").split(",").map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40),
  ].slice(0, 60);
  let locationId: string | null = str(fd, "locationId") || null;
  if (locationId) {
    const [loc] = await db.select().from(schema.locations).where(and(eq(schema.locations.id, locationId), eq(schema.locations.orgId, ctx.org.id)));
    if (!loc) locationId = null;
  }
  await db
    .update(schema.rooms)
    .set({ ...parsed.data, amenities, locationId, updatedAt: new Date() })
    .where(and(eq(schema.rooms.id, room.id), eq(schema.rooms.orgId, ctx.org.id)));
  return done(room.id);
}

export async function uploadPhotosAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, room } = await roomOrFail(fd);
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return fail("Bitte wählen Sie mindestens ein Foto aus.");
  const [{ n }] = await db.select({ n: count() }).from(schema.roomPhotos).where(eq(schema.roomPhotos.roomId, room.id));
  if (n + files.length > 20) return fail("Pro Raum sind höchstens 20 Fotos möglich.");
  let sort = n;
  try {
    for (const file of files.slice(0, 10)) {
      const img = await storeImage(file, `orgs/${ctx.org.id}/rooms/${room.id}`);
      await db.insert(schema.roomPhotos).values({ roomId: room.id, orgId: ctx.org.id, ...img, alt: room.name, sort: sort++ });
    }
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    throw e;
  }
  return done(room.id, files.length === 1 ? "Foto hochgeladen." : `${files.length} Fotos hochgeladen.`);
}

export async function photoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, room } = await roomOrFail(fd);
  const photoId = str(fd, "photoId");
  const op = str(fd, "op");
  const photos = await db.select().from(schema.roomPhotos).where(and(eq(schema.roomPhotos.roomId, room.id), eq(schema.roomPhotos.orgId, ctx.org.id))).orderBy(asc(schema.roomPhotos.sort));
  const idx = photos.findIndex((p) => p.id === photoId);
  if (idx < 0) return fail("Foto nicht gefunden.");
  if (op === "delete") {
    await db.delete(schema.roomPhotos).where(eq(schema.roomPhotos.id, photoId));
    await deleteObject(photos[idx].path);
    await deleteObject(photos[idx].thumbPath);
  } else if (op === "alt") {
    await db.update(schema.roomPhotos).set({ alt: str(fd, "alt").slice(0, 200) || null }).where(eq(schema.roomPhotos.id, photoId));
  } else {
    const order = [...photos];
    const [p] = order.splice(idx, 1);
    const target = op === "cover" ? 0 : op === "up" ? Math.max(0, idx - 1) : Math.min(order.length, idx + 1);
    order.splice(target, 0, p);
    for (let i = 0; i < order.length; i++) await db.update(schema.roomPhotos).set({ sort: i }).where(eq(schema.roomPhotos.id, order[i].id));
  }
  return done(room.id, op === "delete" ? "Foto gelöscht." : "Gespeichert.");
}

export async function updatePricesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, room } = await roomOrFail(fd);
  const hourly = parseMoney(str(fd, "hourlyPrice"));
  const half = parseMoney(str(fd, "halfDayPrice"));
  const day = parseMoney(str(fd, "dayPrice"));
  const deposit = parseMoney(str(fd, "depositAmount")) ?? 0;
  for (const [k, v] of Object.entries({ hourlyPrice: str(fd, "hourlyPrice"), halfDayPrice: str(fd, "halfDayPrice"), dayPrice: str(fd, "dayPrice") })) {
    if (v && parseMoney(v) == null) return fail("Bitte geben Sie Preise als Zahl an, z. B. 80 oder 80.50.", { [k]: "Ungültig" });
  }
  if (!hourly && !half && !day) return fail("Bitte geben Sie mindestens einen Preis an.");
  const paymentMode = str(fd, "paymentMode") === "online" ? "online" : "offline";
  if (paymentMode === "online" && !ctx.org.stripeChargesEnabled) {
    return fail("Für Onlinezahlungen verbinden Sie zuerst Ihr Stripe-Konto unter «Zahlungen & Einnahmen».");
  }
  const depositMode = (["none", "on_site", "online"] as const).find((m) => m === str(fd, "depositMode")) ?? "none";
  if (depositMode === "online" && paymentMode !== "online") return fail("Eine Online-Kaution setzt Onlinezahlung voraus.");
  await db
    .update(schema.rooms)
    .set({
      hourlyPrice: hourly,
      halfDayPrice: half,
      halfDayHours: Math.min(12, Math.max(2, int(fd, "halfDayHours", 5))),
      dayPrice: day,
      dayHours: Math.min(24, Math.max(4, int(fd, "dayHours", 12))),
      depositAmount: depositMode === "none" ? 0 : deposit,
      depositMode,
      bookingMode: str(fd, "bookingMode") === "request" ? "request" : "instant",
      paymentMode,
      offlinePaymentNote: str(fd, "offlinePaymentNote").slice(0, 600) || null,
      requestExpiryHours: Math.min(168, Math.max(4, int(fd, "requestExpiryHours", 48))),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.rooms.id, room.id), eq(schema.rooms.orgId, ctx.org.id)));
  return done(room.id);
}

export async function updateTimesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, room } = await roomOrFail(fd);
  const windows: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (let d = 1; d <= 7; d++) {
    if (fd.get(`open_${d}`) !== "on") continue;
    for (const slot of [1, 2]) {
      const s = str(fd, `start_${d}_${slot}`);
      const e = str(fd, `end_${d}_${slot}`);
      if (!s && !e) continue;
      const sm = timeToMinutes(s);
      let em = timeToMinutes(e);
      if (sm == null || em == null) return fail(`Ungültige Zeit am Wochentag ${d}. Format HH:MM.`);
      if (sm >= 1440) return fail("Startzeit muss vor 24:00 liegen.");
      if (em <= sm) em += 1440; // runs past midnight
      windows.push({ weekday: d, startMinute: sm, endMinute: em });
    }
  }
  const min = int(fd, "minDurationMinutes", 60);
  const max = int(fd, "maxDurationMinutes", 720);
  if (min < 15 || max < min || max > 14 * 1440) return fail("Bitte prüfen Sie Mindest- und Maximaldauer.");
  const interval = [15, 30, 60].includes(int(fd, "slotIntervalMinutes", 30)) ? int(fd, "slotIntervalMinutes", 30) : 30;
  await db.transaction(async (tx) => {
    await tx.delete(schema.roomOpeningHours).where(eq(schema.roomOpeningHours.roomId, room.id));
    if (windows.length) await tx.insert(schema.roomOpeningHours).values(windows.map((w) => ({ ...w, roomId: room.id })));
    await tx
      .update(schema.rooms)
      .set({
        minDurationMinutes: min,
        maxDurationMinutes: max,
        slotIntervalMinutes: interval,
        leadTimeMinutes: Math.min(60 * 24 * 60, Math.max(0, int(fd, "leadTimeHours", 2) * 60)),
        maxAdvanceDays: Math.min(730, Math.max(1, int(fd, "maxAdvanceDays", 365))),
        bufferBeforeMinutes: Math.min(720, Math.max(0, int(fd, "bufferBeforeMinutes", 0))),
        bufferAfterMinutes: Math.min(720, Math.max(0, int(fd, "bufferAfterMinutes", 0))),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.rooms.id, room.id), eq(schema.rooms.orgId, ctx.org.id)));
  });
  return done(room.id);
}

export async function updateRulesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, room } = await roomOrFail(fd);
  const preset = str(fd, "policyPreset");
  let policy = POLICY_PRESETS[preset]?.policy;
  if (!policy) {
    const free = int(fd, "freeUntilHours", 72);
    const pct = int(fd, "partialRefundPercent", 0);
    const until = int(fd, "partialUntilHours", 0);
    if (free < 0 || pct < 0 || pct > 100 || until < 0 || until > free) return fail("Bitte prüfen Sie die Stornierungsfristen (Teilrückerstattung muss nach der kostenlosen Frist liegen).");
    policy = { freeUntilHours: free, partialRefundPercent: pct, partialUntilHours: until };
  }
  await db
    .update(schema.rooms)
    .set({
      rentalTerms: str(fd, "rentalTerms").slice(0, 8000) || null,
      houseRules: str(fd, "houseRules").slice(0, 8000) || null,
      cancellationPolicy: policy,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.rooms.id, room.id), eq(schema.rooms.orgId, ctx.org.id)));
  return done(room.id);
}

export async function publishAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { ctx, room } = await roomOrFail(fd);
  const op = str(fd, "op");
  if (op === "publish") {
    const check = await publishChecklist(ctx.org, room);
    if (!check.ok) return fail("Bitte erledigen Sie zuerst alle Pflichtpunkte der Checkliste.");
    const [{ n: live }] = await db.select({ n: count() }).from(schema.rooms).where(and(eq(schema.rooms.orgId, ctx.org.id), eq(schema.rooms.status, "published")));
    if (live >= (ctx.plan?.maxRooms ?? 0)) return fail("Ihr Tarif erlaubt keine weiteren veröffentlichten Räume.");
    await db.update(schema.rooms).set({ status: "published", publishedAt: room.publishedAt ?? new Date(), updatedAt: new Date() }).where(eq(schema.rooms.id, room.id));
    await audit("room.published", { userId: ctx.user.id, orgId: ctx.org.id, data: { roomId: room.id } });
    revalidatePath(`/r/${room.slug}`);
    redirect(`/app/raeume/${room.id}?tab=veroeffentlichen&status=online`);
  }
  if (op === "unpublish") {
    await db.update(schema.rooms).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.rooms.id, room.id));
    revalidatePath(`/r/${room.slug}`);
    redirect(`/app/raeume/${room.id}?tab=veroeffentlichen&status=offline`);
  }
  if (op === "archive") {
    await db.update(schema.rooms).set({ status: "archived", updatedAt: new Date() }).where(eq(schema.rooms.id, room.id));
    revalidatePath(`/r/${room.slug}`);
    redirect("/app/raeume?archiviert=1");
  }
  if (op === "restore") {
    const used = await roomUsage(ctx.org.id);
    if (used >= (await maxRoomsFor(ctx.org))) return fail("Ihr Tarif erlaubt keine weiteren aktiven Räume.");
    await db.update(schema.rooms).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.rooms.id, room.id));
    return done(room.id, "Raum wiederhergestellt (als Entwurf).");
  }
  if (op === "slug") {
    const slug = str(fd, "slug").toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(slug)) return fail("Die Adresse darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten (3–60 Zeichen).");
    const [taken] = await db.select({ id: schema.rooms.id }).from(schema.rooms).where(eq(schema.rooms.slug, slug));
    if (taken && taken.id !== room.id) return fail("Diese Adresse ist bereits vergeben.");
    await db.update(schema.rooms).set({ slug, updatedAt: new Date() }).where(eq(schema.rooms.id, room.id));
    revalidatePath(`/r/${room.slug}`);
    return done(room.id, "Adresse geändert. Bitte aktualisieren Sie geteilte Links und QR-Codes.");
  }
  return fail("Unbekannte Aktion.");
}
