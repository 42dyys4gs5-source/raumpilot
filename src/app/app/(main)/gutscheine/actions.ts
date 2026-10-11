"use server";

import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { hasFeature } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { parseMoney } from "@/lib/utils/money";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function addCodeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  if (!(await hasFeature(ctx.org, "discountCodes"))) return fail("Diese Funktion ist in Ihrem Tarif nicht enthalten.");
  const code = str(fd, "code").toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return fail("Der Code darf 3–30 Zeichen (A–Z, 0–9, - und _) enthalten.");
  const kind = str(fd, "kind") === "fixed" ? "fixed" : "percent";
  const value = kind === "percent" ? Number(str(fd, "value")) : parseMoney(str(fd, "value"));
  if (!value || value <= 0 || (kind === "percent" && (value > 100 || !Number.isInteger(value)))) return fail("Bitte einen gültigen Wert angeben (Prozent 1–100 oder Betrag).");
  const zone = ctx.org.timezone;
  const from = str(fd, "validFrom") ? DateTime.fromISO(str(fd, "validFrom"), { zone }).startOf("day").toJSDate() : null;
  const until = str(fd, "validUntil") ? DateTime.fromISO(str(fd, "validUntil"), { zone }).endOf("day").toJSDate() : null;
  const max = str(fd, "maxRedemptions") ? Math.max(1, Number(str(fd, "maxRedemptions"))) : null;
  try {
    await db.insert(schema.discountCodes).values({ orgId: ctx.org.id, code, kind, value, validFrom: from, validUntil: until, maxRedemptions: max, minAmount: parseMoney(str(fd, "minAmount")) });
  } catch {
    return fail("Diesen Code gibt es bereits.");
  }
  revalidatePath("/app/gutscheine");
  return success(`Code ${code} erstellt.`);
}

export async function codeOpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const where = and(eq(schema.discountCodes.id, str(fd, "codeId")), eq(schema.discountCodes.orgId, ctx.org.id));
  const op = str(fd, "op");
  if (op === "delete") await db.delete(schema.discountCodes).where(where);
  else await db.update(schema.discountCodes).set({ active: op === "activate" }).where(where);
  revalidatePath("/app/gutscheine");
  return success("Gespeichert.");
}
