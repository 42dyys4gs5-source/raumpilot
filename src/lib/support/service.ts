import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { adminAlertMail } from "@/lib/email/templates";
import { renderEmail } from "@/lib/email/layout";
import { enqueueEmail } from "@/lib/jobs/queue";
import { BRAND } from "@/config/brand";

export async function createTicket(t: {
  orgId?: string | null;
  userId?: string | null;
  category: "support" | "sales" | "billing" | "privacy";
  name: string;
  email: string;
  subject: string;
  body: string;
  priority?: "normal" | "high";
}) {
  return db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(schema.supportTickets)
      .values({ orgId: t.orgId ?? null, userId: t.userId ?? null, category: t.category, name: t.name, email: t.email, subject: t.subject, priority: t.priority ?? "normal" })
      .returning();
    await tx.insert(schema.supportMessages).values({ ticketId: ticket.id, author: "customer", body: t.body });
    await enqueueEmail(tx, {
      to: t.email,
      ...renderEmail({
        subject: `Ihre Anfrage bei ${BRAND.name}: ${t.subject}`,
        title: "Wir haben Ihre Nachricht erhalten",
        blocks: [{ p: `Hallo ${t.name}, vielen Dank für Ihre Nachricht. Wir melden uns in der Regel innert 1–2 Arbeitstagen${t.priority === "high" ? " (priorisiert)" : ""}.` }, { note: t.body.slice(0, 1500) }],
      }),
      template: "support.received",
    });
    if (env.ADMIN_ALERT_EMAIL) {
      await enqueueEmail(tx, { to: env.ADMIN_ALERT_EMAIL, ...adminAlertMail(`Neue ${t.category === "sales" ? "Kontaktanfrage" : "Supportanfrage"}${t.priority === "high" ? " (priorisiert)" : ""}`, [["Von", `${t.name} <${t.email}>`], ["Betreff", t.subject]]), template: "admin.alert", replyTo: t.email }, `mail:ticket:${ticket.id}`);
    }
    return ticket;
  });
}
