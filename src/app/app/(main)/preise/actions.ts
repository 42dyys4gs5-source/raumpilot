"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { hasFeature } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { getOrgRoom } from "@/lib/rooms/service";
import { timeToMinutes } from "@/lib/rooms/constants";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function addRuleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  if (!(await hasFeature(ctx.org, "priceRules"))) return fail("Diese Funktion ist in Ihrem Tarif nicht enthalten.");
  const name = str(fd, "name");
  const pct = Number(str(fd, "adjustmentPercent"));
  if (name.length < 2) return fail("Bitte geben Sie eine Bezeichnung an.");
  if (!Number.isInteger(pct) || pct < -90 || pct > 300 || pct === 0) return fail("Die Anpassung muss zwischen –90 % und +300 % liegen (nicht 0).");
  let roomId: string | null = null;
  if (str(fd, "roomId")) {
    const r = await getOrgRoom(ctx.org.id, str(fd, "roomId"));
    if (!r) return fail("Raum nicht gefunden.");
    roomId = r.id;
  }
  const weekdays = fd.getAll("weekdays").map(Number).filter((n) => n >= 1 && n <= 7);
  const startDate = str(fd, "startDate") || null;
  const endDate = str(fd, "endDate") || null;
  if (startDate && endDate && endDate < startDate) return fail("Das Enddatum liegt vor dem Startdatum.");
  const sm = str(fd, "startTime") ? timeToMinutes(str(fd, "startTime")) : null;
  const em = str(fd, "endTime") ? timeToMinutes(str(fd, "endTime")) : null;
  if ((sm == null) !== (em == null)) return fail("Bitte Start- und Endzeit angeben oder beide leer lassen.");
  if (!weekdays.length && !startDate && !endDate && sm == null) return fail("Bitte schränken Sie die Regel ein (Wochentage, Zeitraum oder Uhrzeit).");
  await db.insert(schema.priceRules).values({ orgId: ctx.org.id, roomId, name, weekdays: weekdays.length ? weekdays : null, startDate, endDate, startMinute: sm, endMinute: em, adjustmentPercent: pct });
  revalidatePath("/app/preise");
  return success("Preisregel gespeichert.");
}

export async function ruleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const id = str(fd, "ruleId");
  const where = and(eq(schema.priceRules.id, id), eq(schema.priceRules.orgId, ctx.org.id));
  if (str(fd, "op") === "delete") await db.delete(schema.priceRules).where(where);
  else await db.update(schema.priceRules).set({ active: str(fd, "op") === "activate" }).where(where);
  revalidatePath("/app/preise");
  return success("Gespeichert.");
}
