"use server";

import { and, eq, gt, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, success, type ActionState } from "@/lib/actions/types";
import { requireOrg } from "@/lib/auth/guards";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/security/audit";

export async function customerNoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("staff");
  const id = String(fd.get("customerId") ?? "");
  await db
    .update(schema.customers)
    .set({ notes: String(fd.get("notes") ?? "").slice(0, 4000) || null, phone: String(fd.get("phone") ?? "").trim() || null, company: String(fd.get("company") ?? "").trim() || null, updatedAt: new Date() })
    .where(and(eq(schema.customers.id, id), eq(schema.customers.orgId, ctx.org.id)));
  revalidatePath(`/app/kunden/${id}`);
  return success("Gespeichert.");
}

/** Right to erasure: anonymise the customer's bookings and delete the customer record. */
export async function deleteCustomerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOrg("admin");
  const id = String(fd.get("customerId") ?? "");
  const [c] = await db.select().from(schema.customers).where(and(eq(schema.customers.id, id), eq(schema.customers.orgId, ctx.org.id)));
  if (!c) return fail("Kunde nicht gefunden.");
  const upcoming = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.customerId, id), gt(schema.bookings.endsAt, new Date()), inArray(schema.bookings.status, ["confirmed", "requested", "awaiting_payment", "pending_payment"])))
    .limit(1);
  if (upcoming.length) return fail("Dieser Kunde hat noch aktive künftige Buchungen. Bitte stornieren Sie diese zuerst.");
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({ customerName: "Gelöschte Person", customerEmail: `geloescht-${id.slice(0, 8)}@invalid.raumvia`, customerPhone: null, customerCompany: null, customerMessage: null, customerId: null })
      .where(and(eq(schema.bookings.customerId, id), eq(schema.bookings.orgId, ctx.org.id)));
    await tx.delete(schema.customers).where(eq(schema.customers.id, id));
  });
  await audit("customer.erased", { userId: ctx.user.id, orgId: ctx.org.id, severity: "warning", data: { customerId: id } });
  redirect("/app/kunden?geloescht=1");
}
