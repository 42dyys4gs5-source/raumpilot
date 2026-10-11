import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  replyTo?: string | null;
  fromName?: string | null;
  orgId?: string | null;
  bookingId?: string | null;
  attachments?: { filename: string; content: string /* base64 */; contentType?: string }[];
};

function fromAddress(fromName?: string | null): string {
  if (!fromName) return env.EMAIL_FROM;
  const addr = env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.EMAIL_FROM;
  const safe = fromName.replace(/["<>\r\n]/g, "").slice(0, 70);
  return `"${safe}" <${addr}>`;
}

/**
 * Sends an e-mail. Throws on provider failure so the job queue can retry.
 * `idempotencyKey` is forwarded to Resend to prevent duplicate deliveries on retries.
 */
export async function sendEmail(mail: OutgoingEmail, idempotencyKey: string): Promise<void> {
  if (env.EMAIL_MODE === "log") {
    await db.insert(schema.emailLog).values({
      to: mail.to,
      subject: mail.subject,
      template: mail.template,
      status: "logged",
      orgId: mail.orgId ?? null,
      bookingId: mail.bookingId ?? null,
      debugBody: mail.text,
    });
    if (env.NODE_ENV === "development") console.info(`\n📧 [${mail.template}] an ${mail.to}: ${mail.subject}\n${mail.text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify({
      from: fromAddress(mail.fromName),
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      reply_to: mail.replyTo ?? env.EMAIL_REPLY_TO ?? undefined,
      attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: a.content, content_type: a.contentType })),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  await db.insert(schema.emailLog).values({
    to: mail.to,
    subject: mail.subject,
    template: mail.template,
    status: res.ok ? "sent" : "failed",
    providerId: body.id ?? null,
    error: res.ok ? null : `${res.status} ${body.message ?? ""}`.slice(0, 500),
    orgId: mail.orgId ?? null,
    bookingId: mail.bookingId ?? null,
  });
  if (!res.ok) throw new Error(`E-Mail-Versand fehlgeschlagen (${res.status}): ${body.message ?? "unbekannt"}`);
}
