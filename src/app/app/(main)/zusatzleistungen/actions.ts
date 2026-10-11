"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { hasFeature } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { listOrgRooms } from "@/lib/rooms/service";
import { parseMoney } from "@/lib/utils/money";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const PRICING = ["per_booking", "per_hour", "per_person", "per_unit"] as const;

export async function saveExtraAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  if (!(await hasFeature(ctx.org, "extras"))) return fail("Diese Funktion ist in Ihrem Tarif nicht enthalten.");
  const name = str(fd, "name");
  const price = parseMoney(str(fd, "price"));
  const pricing = PRICING.find((p) => p === str(fd, "pricing")) ?? "per_booking";
  if (name.length < 2 || price == null) return fail("Bitte Bezeichnung und Preis angeben.");
  const orgRoomIds = new Set((await listOrgRooms(ctx.org.id)).map((r) => r.id));
  const roomIds = fd.getAll("roomIds").map(String).filter((id) => orgRoomIds.has(id));
  const values = {
    name: name.slice(0, 100),
    description: str(fd, "description").slice(0, 300) || null,
    price,
    pricing,
    maxQuantity: pricing === "per_unit" ? Math.min(999, Math.max(1, Number(str(fd, "maxQuantity")) || 1)) : 1,
    roomIds: roomIds.length ? roomIds : null,
  };
  const id = str(fd, "extraId");
  if (id) await db.update(schema.extras).set(values).where(and(eq(schema.extras.id, id), eq(schema.extras.orgId, ctx.org.id)));
  else await db.insert(schema.extras).values({ ...values, orgId: ctx.org.id });
  revalidatePath("/app/zusatzleistungen");
  return success("Zusatzleistung gespeichert.");
}

export async function extraOpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const where = and(eq(schema.extras.id, str(fd, "extraId")), eq(schema.extras.orgId, ctx.org.id));
  const op = str(fd, "op");
  if (op === "delete") await db.delete(schema.extras).where(where);
  else await db.update(schema.extras).set({ active: op === "activate" }).where(where);
  revalidatePath("/app/zusatzleistungen");
  return success("Gespeichert.");
}
