import { BRAND } from "@/config/brand";
import type { schema } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { bookingUrl } from "@/lib/booking/links";
import { describePolicy } from "@/lib/booking/policy";
import { formatDateTime, formatRange } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { renderEmail, type EmailContent } from "./layout";

type Booking = typeof schema.bookings.$inferSelect;
type Room = typeof schema.rooms.$inferSelect;
type Org = typeof schema.organizations.$inferSelect;
export type BookingCtx = { booking: Booking; room: Room; org: Org };

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export function verifyEmailMail(name: string, url: string): EmailContent {
  return renderEmail({
    subject: `Bitte bestätigen Sie Ihre E-Mail-Adresse – ${BRAND.name}`,
    preheader: "Ein Klick, dann kann es losgehen.",
    title: `Willkommen bei ${BRAND.name}, ${name}`,
    blocks: [
      { p: "Bitte bestätigen Sie Ihre E-Mail-Adresse, damit wir Ihr Konto aktivieren können." },
      { button: { label: "E-Mail-Adresse bestätigen", url } },
      { note: "Der Link ist 48 Stunden gültig. Falls Sie sich nicht registriert haben, können Sie diese Nachricht ignorieren." },
    ],
  });
}

export function passwordResetMail(name: string, url: string): EmailContent {
  return renderEmail({
    subject: `Passwort zurücksetzen – ${BRAND.name}`,
    title: "Neues Passwort festlegen",
    blocks: [
      { p: `Hallo ${name}, wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.` },
      { button: { label: "Neues Passwort festlegen", url } },
      { note: "Der Link ist 60 Minuten gültig und kann nur einmal verwendet werden. Wenn Sie die Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail – Ihr Passwort bleibt unverändert." },
    ],
  });
}

export function passwordChangedMail(name: string): EmailContent {
  return renderEmail({
    subject: `Ihr Passwort wurde geändert – ${BRAND.name}`,
    title: "Passwort geändert",
    blocks: [
      { p: `Hallo ${name}, das Passwort Ihres ${BRAND.name}-Kontos wurde soeben geändert. Aus Sicherheitsgründen wurden alle anderen Sitzungen abgemeldet.` },
      { note: `Waren Sie das nicht? Setzen Sie Ihr Passwort sofort zurück und kontaktieren Sie uns unter ${BRAND.supportEmail}.` },
    ],
  });
}

export function inviteMail(orgName: string, inviter: string, url: string): EmailContent {
  return renderEmail({
    subject: `Einladung zu ${orgName} auf ${BRAND.name}`,
    title: `Sie wurden zu ${orgName} eingeladen`,
    blocks: [
      { p: `${inviter} lädt Sie ein, gemeinsam die Raumbuchungen von ${orgName} auf ${BRAND.name} zu verwalten.` },
      { button: { label: "Einladung annehmen", url } },
      { note: "Die Einladung ist 7 Tage gültig." },
    ],
  });
}

const WELCOME: Record<number, (name: string) => EmailContent> = {
  0: (name) =>
    renderEmail({
      subject: `Ihre ersten Schritte mit ${BRAND.name}`,
      title: `Schön, dass Sie da sind, ${name}`,
      blocks: [
        { p: "In drei Schritten ist Ihr Raum online buchbar:" },
        { table: [["1", "Raum mit Fotos, Preisen und Öffnungszeiten erfassen"], ["2", "Tarif wählen und Buchungsseite aktivieren"], ["3", "Link oder QR-Code teilen"]] },
        { button: { label: "Einrichtung fortsetzen", url: appUrl("/app/onboarding") } },
        { p: "Fragen? Antworten Sie einfach auf diese E-Mail – wir helfen gerne." },
      ],
    }),
  2: (name) =>
    renderEmail({
      subject: "Tipp: So überzeugt Ihre Raumseite",
      title: "Gute Fotos und klare Preise buchen sich besser",
      blocks: [
        { p: `Hallo ${name}, Mieterinnen und Mieter entscheiden in Sekunden. Diese Punkte machen den Unterschied:` },
        { table: [["Fotos", "Mindestens 4 helle Fotos im Querformat, inkl. Eingang und Ausstattung"], ["Preise", "Stunden-, Halbtages- und Tagespreis angeben – der günstigste wird automatisch berechnet"], ["Regeln", "Hausregeln und Mietbedingungen kurz und eindeutig formulieren"]] },
        { button: { label: "Raum bearbeiten", url: appUrl("/app/raeume") } },
      ],
    }),
  5: (name) =>
    renderEmail({
      subject: "Teilen Sie Ihren Buchungslink",
      title: "Wo Ihr Buchungslink am meisten bringt",
      blocks: [
        { p: `Hallo ${name}, Ihre Buchungsseite funktioniert auch ohne eigene Website. Teilen Sie den Link dort, wo Ihre Kundschaft Sie findet:` },
        { table: [["Google-Unternehmensprofil", "Als Link «Termin buchen»"], ["Instagram & WhatsApp", "Im Profil bzw. als Schnellantwort"], ["Vor Ort", "QR-Code an der Eingangstür oder auf Flyern"], ["Eigene Website", "Als Button oder eingebettetes Buchungswidget"]] },
        { button: { label: "Link & QR-Code öffnen", url: appUrl("/app/buchungsseite") } },
      ],
    }),
  10: (name) =>
    renderEmail({
      subject: "Onlinezahlung aktivieren – weniger Ausfälle",
      title: "Lassen Sie Ihre Mieter direkt online bezahlen",
      blocks: [
        { p: `Hallo ${name}, mit verbundenem Stripe-Konto bezahlen Ihre Kundinnen und Kunden bei der Buchung per Karte oder – sofern in Ihrem Stripe-Konto aktiviert – mit TWINT. Das Geld geht direkt auf Ihr Konto.` },
        { button: { label: "Zahlungen einrichten", url: appUrl("/app/einnahmen") } },
        { note: "Stripe prüft Ihre Angaben (gesetzliche Identifikation). Die Gebühren von Stripe werden Ihnen direkt von Stripe belastet." },
      ],
    }),
};
export const WELCOME_STEPS = [0, 2, 5, 10] as const;
export const welcomeMail = (step: number, name: string) => WELCOME[step]?.(name) ?? null;

/* ------------------------------------------------------------------ */
/* Subscription                                                        */
/* ------------------------------------------------------------------ */

export function subscriptionStartedMail(name: string, planName: string, trialEnd: Date | null): EmailContent {
  return renderEmail({
    subject: `Ihr ${BRAND.name}-Abo ${planName} ist aktiv`,
    title: `Abo ${planName} aktiviert`,
    blocks: [
      { p: `Hallo ${name}, vielen Dank! Ihr Tarif ${planName} ist jetzt aktiv. Ihre Buchungsseite kann veröffentlicht werden.` },
      ...(trialEnd ? [{ note: `Ihre kostenlose Testphase läuft bis ${formatDateTime(trialEnd)}. Danach wird der Monatsbeitrag automatisch belastet. Sie können jederzeit zum Ende der Laufzeit kündigen.` }] : []),
      { button: { label: "Zum Dashboard", url: appUrl("/app") } },
    ],
  });
}

export function subscriptionRenewedMail(name: string, amount: number, url: string | null): EmailContent {
  return renderEmail({
    subject: `Zahlungsbestätigung ${BRAND.name}`,
    title: "Vielen Dank für Ihre Zahlung",
    blocks: [
      { p: `Hallo ${name}, wir haben Ihre Zahlung über ${formatMoney(amount)} für Ihr ${BRAND.name}-Abo erhalten.` },
      ...(url ? [{ button: { label: "Rechnung ansehen", url } }] : []),
    ],
  });
}

export function subscriptionPaymentFailedMail(name: string, url: string | null): EmailContent {
  return renderEmail({
    subject: `Zahlung fehlgeschlagen – bitte Zahlungsmittel prüfen`,
    title: "Ihre Abo-Zahlung ist fehlgeschlagen",
    blocks: [
      { p: `Hallo ${name}, die Belastung Ihres ${BRAND.name}-Abos war leider nicht erfolgreich. Wir versuchen es in den nächsten Tagen automatisch erneut.` },
      { p: "Bitte prüfen oder aktualisieren Sie Ihr Zahlungsmittel, damit Ihre Buchungsseite ohne Unterbruch erreichbar bleibt." },
      { button: { label: "Zahlungsmittel aktualisieren", url: url ?? appUrl("/app/abonnement") } },
    ],
  });
}

export function subscriptionCancelScheduledMail(name: string, endsAt: Date | null): EmailContent {
  return renderEmail({
    subject: `Kündigung Ihres ${BRAND.name}-Abos bestätigt`,
    title: "Kündigung bestätigt",
    blocks: [
      { p: `Hallo ${name}, wir haben Ihre Kündigung erhalten.${endsAt ? ` Ihr Abo bleibt bis ${formatDateTime(endsAt)} aktiv.` : ""}` },
      { p: "Bis dahin funktionieren Buchungsseite und Dashboard wie gewohnt. Sie können die Kündigung bis zum Laufzeitende jederzeit rückgängig machen." },
      { button: { label: "Abo verwalten", url: appUrl("/app/abonnement") } },
    ],
  });
}

export function subscriptionEndedMail(name: string): EmailContent {
  return renderEmail({
    subject: `Ihr ${BRAND.name}-Abo ist beendet`,
    title: "Ihr Abo ist beendet",
    blocks: [
      { p: `Hallo ${name}, Ihr Abo ist ausgelaufen. Ihre Buchungsseiten sind nicht mehr öffentlich buchbar. Bestehende Buchungen und Daten bleiben erhalten.` },
      { p: "Sie können jederzeit wieder einen Tarif wählen. Ihre Daten können Sie in den Einstellungen exportieren oder löschen." },
      { button: { label: "Tarif wählen", url: appUrl("/app/abonnement") } },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Bookings – customer                                                 */
/* ------------------------------------------------------------------ */

function bookingTable(c: BookingCtx): [string, string][] {
  const b = c.booking;
  const address = [c.room.street, [c.room.postalCode, c.room.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Buchungsnummer", b.reference],
    ["Raum", c.room.name],
    ["Zeit", formatRange(b.startsAt, b.endsAt, c.room.timezone)],
    ["Personen", String(b.guests)],
  ];
  if (address) rows.push(["Adresse", address]);
  if (b.totalAmount > 0) rows.push(["Total", formatMoney(b.totalAmount, b.currency)]);
  return rows;
}

function priceTable(c: BookingCtx): [string, string][] {
  const rows: [string, string][] = c.booking.priceBreakdown.lines.map((l) => [l.label, formatMoney(l.amount, c.booking.currency)]);
  rows.push(["Total", formatMoney(c.booking.totalAmount, c.booking.currency)]);
  if (c.booking.priceBreakdown.vatAmount > 0) {
    rows.push([`inkl. MWST ${(c.booking.priceBreakdown.vatRateBp / 100).toFixed(1)} %`, formatMoney(c.booking.priceBreakdown.vatAmount)]);
  }
  return rows;
}

const tenantMail = (c: BookingCtx, o: Omit<Parameters<typeof renderEmail>[0], "brandName" | "accentColor" | "footer">) =>
  renderEmail({
    ...o,
    brandName: c.org.name,
    accentColor: c.org.brandColor ?? undefined,
    footer: `${c.org.name}${c.org.contactEmail ? ` · ${c.org.contactEmail}` : ""}${c.org.phone ? ` · ${c.org.phone}` : ""} — Buchung abgewickelt über ${BRAND.name}. Antworten auf diese E-Mail gehen direkt an ${c.org.name}.`,
  });

function paymentInfo(c: BookingCtx): { p: string } | { note: string } | null {
  const b = c.booking;
  if (b.totalAmount === 0) return null;
  if (b.paymentStatus === "paid") return { p: `Die Zahlung über ${formatMoney(b.amountPaid, b.currency)} ist eingegangen.` };
  if (b.paymentMode === "offline")
    return { note: c.room.offlinePaymentNote?.trim() || `Die Bezahlung erfolgt direkt an ${c.org.name} (z. B. per Rechnung oder vor Ort).` };
  return null;
}

export function bookingConfirmedMail(c: BookingCtx): EmailContent {
  const info = paymentInfo(c);
  const deposit = c.room.depositMode === "on_site" && c.room.depositAmount > 0
    ? [{ note: `Bitte beachten: Vor Ort ist eine Kaution von ${formatMoney(c.room.depositAmount)} zu hinterlegen.` }]
    : [];
  return tenantMail(c, {
    subject: `Buchung bestätigt: ${c.room.name}, ${formatRange(c.booking.startsAt, c.booking.endsAt, c.room.timezone)}`,
    preheader: `Buchung ${c.booking.reference} ist bestätigt.`,
    title: "Ihre Buchung ist bestätigt",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, vielen Dank für Ihre Buchung bei ${c.org.name}.` },
      { table: bookingTable(c) },
      ...(info ? [info] : []),
      ...deposit,
      { button: { label: "Buchung ansehen oder verwalten", url: bookingUrl(c.booking.id) } },
      { heading: "Stornierungsbedingungen" },
      { p: describePolicy(c.room.cancellationPolicy) },
      ...(c.room.houseRules ? [{ heading: "Hausregeln" }, { p: c.room.houseRules }] : []),
    ],
  });
}

export function bookingRequestReceivedMail(c: BookingCtx): EmailContent {
  return tenantMail(c, {
    subject: `Anfrage erhalten: ${c.room.name}`,
    title: "Ihre Anfrage ist eingegangen",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, ${c.org.name} hat Ihre Buchungsanfrage erhalten und meldet sich in Kürze. Der Termin ist bis zur Entscheidung für Sie vorgemerkt.` },
      { table: bookingTable(c) },
      { note: "Dies ist noch keine verbindliche Bestätigung. Sie erhalten eine weitere E-Mail, sobald die Anfrage angenommen oder abgelehnt wurde." },
      { button: { label: "Anfrage ansehen", url: bookingUrl(c.booking.id) } },
    ],
  });
}

export function bookingAwaitingPaymentMail(c: BookingCtx): EmailContent {
  return tenantMail(c, {
    subject: `Anfrage angenommen – bitte bezahlen: ${c.room.name}`,
    title: "Ihre Anfrage wurde angenommen",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, gute Nachrichten: ${c.org.name} hat Ihre Anfrage angenommen. Bitte schliessen Sie die Buchung mit der Zahlung ab.` },
      { table: priceTable(c) },
      { button: { label: "Jetzt bezahlen", url: bookingUrl(c.booking.id, "/bezahlen") } },
      ...(c.booking.paymentDueAt ? [{ note: `Bitte bezahlen Sie bis ${formatDateTime(c.booking.paymentDueAt, c.room.timezone)}. Danach wird der Termin wieder freigegeben.` }] : []),
    ],
  });
}

export function bookingDeclinedMail(c: BookingCtx): EmailContent {
  return tenantMail(c, {
    subject: `Anfrage nicht möglich: ${c.room.name}`,
    title: "Ihre Anfrage konnte leider nicht angenommen werden",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, ${c.org.name} kann Ihre Anfrage für ${formatRange(c.booking.startsAt, c.booking.endsAt, c.room.timezone)} leider nicht annehmen.` },
      ...(c.booking.cancellationReason ? [{ note: c.booking.cancellationReason }] : []),
      { button: { label: "Anderen Termin wählen", url: appUrl(`/r/${c.room.slug}`) } },
    ],
  });
}

export function bookingCancelledMail(c: BookingCtx, refund: number): EmailContent {
  const by = c.booking.cancelledBy;
  return tenantMail(c, {
    subject: `Buchung storniert: ${c.room.name} (${c.booking.reference})`,
    title: "Ihre Buchung wurde storniert",
    blocks: [
      { p: by === "customer" ? `Hallo ${c.booking.customerName}, wir bestätigen die Stornierung Ihrer Buchung.` : `Hallo ${c.booking.customerName}, ${c.org.name} musste Ihre Buchung leider stornieren.` },
      { table: bookingTable(c) },
      ...(c.booking.cancellationReason ? [{ note: `Grund: ${c.booking.cancellationReason}` }] : []),
      ...(refund > 0 ? [{ p: `Wir erstatten Ihnen ${formatMoney(refund, c.booking.currency)} auf Ihr ursprüngliches Zahlungsmittel zurück. Je nach Bank dauert die Gutschrift 5–10 Bankarbeitstage.` }] : []),
    ],
  });
}

export function bookingExpiredMail(c: BookingCtx): EmailContent {
  return tenantMail(c, {
    subject: `Reservation abgelaufen: ${c.room.name}`,
    title: "Ihre Reservation ist abgelaufen",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, die Zahlung für Ihre Reservation ${c.booking.reference} ist nicht rechtzeitig eingegangen. Der Termin wurde wieder freigegeben.` },
      { button: { label: "Erneut buchen", url: appUrl(`/r/${c.room.slug}`) } },
    ],
  });
}

export function bookingRescheduledMail(c: BookingCtx, previous: { startsAt: Date; endsAt: Date }): EmailContent {
  return tenantMail(c, {
    subject: `Buchung verschoben: ${c.room.name} (${c.booking.reference})`,
    title: "Ihre Buchung wurde verschoben",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, Ihre Buchung wurde auf einen neuen Termin verschoben.` },
      { table: [["Bisher", formatRange(previous.startsAt, previous.endsAt, c.room.timezone)], ["Neu", formatRange(c.booking.startsAt, c.booking.endsAt, c.room.timezone)]] },
      { button: { label: "Buchung ansehen", url: bookingUrl(c.booking.id) } },
    ],
  });
}

export function bookingReminderMail(c: BookingCtx): EmailContent {
  return tenantMail(c, {
    subject: `Erinnerung: ${c.room.name}, ${formatRange(c.booking.startsAt, c.booking.endsAt, c.room.timezone)}`,
    title: "Bald ist es so weit",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, wir erinnern Sie an Ihre Buchung bei ${c.org.name}.` },
      { table: bookingTable(c) },
      ...(c.room.houseRules ? [{ heading: "Hausregeln" }, { p: c.room.houseRules }] : []),
      { button: { label: "Buchung ansehen", url: bookingUrl(c.booking.id) } },
    ],
  });
}

export function paymentReceiptMail(c: BookingCtx): EmailContent {
  return tenantMail(c, {
    subject: `Zahlungsbeleg ${c.booking.reference} – ${c.org.name}`,
    title: "Zahlungsbeleg",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, vielen Dank für Ihre Zahlung.` },
      { table: priceTable(c) },
      {
        note: `Zahlungsempfänger: ${c.org.legalName || c.org.name}${c.org.street ? `, ${c.org.street}, ${c.org.postalCode ?? ""} ${c.org.city ?? ""}` : ""}${c.org.vatRegistered && c.org.vatNumber ? `, MWST-Nr. ${c.org.vatNumber}` : ""}. Die Zahlung wurde über Stripe abgewickelt.`,
      },
      { button: { label: "Beleg online ansehen", url: bookingUrl(c.booking.id, "/beleg") } },
    ],
  });
}

export function paymentFailedMail(c: BookingCtx): EmailContent {
  return tenantMail(c, {
    subject: `Zahlung nicht erfolgreich: ${c.room.name}`,
    title: "Die Zahlung ist fehlgeschlagen",
    blocks: [
      { p: `Hallo ${c.booking.customerName}, Ihre Zahlung für die Buchung ${c.booking.reference} konnte leider nicht abgeschlossen werden. Der Termin wurde nicht verbindlich gebucht.` },
      { button: { label: "Erneut versuchen", url: appUrl(`/r/${c.room.slug}`) } },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Bookings – landlord                                                 */
/* ------------------------------------------------------------------ */

function landlordTable(c: BookingCtx): [string, string][] {
  const b = c.booking;
  return [
    ...bookingTable(c),
    ["Kunde", [b.customerName, b.customerCompany].filter(Boolean).join(", ")],
    ["E-Mail", b.customerEmail],
    ...(b.customerPhone ? ([["Telefon", b.customerPhone]] as [string, string][]) : []),
    ...(b.customerMessage ? ([["Nachricht", b.customerMessage]] as [string, string][]) : []),
  ];
}

export function landlordNewBookingMail(c: BookingCtx): EmailContent {
  const isRequest = c.booking.status === "requested";
  return renderEmail({
    subject: `${isRequest ? "Neue Anfrage" : "Neue Buchung"}: ${c.room.name}, ${formatRange(c.booking.startsAt, c.booking.endsAt, c.room.timezone)}`,
    title: isRequest ? "Neue Buchungsanfrage – bitte entscheiden" : "Neue Buchung eingegangen",
    blocks: [
      { table: landlordTable(c) },
      ...(isRequest && c.booking.requestExpiresAt
        ? [{ note: `Bitte nehmen Sie die Anfrage bis ${formatDateTime(c.booking.requestExpiresAt, c.room.timezone)} an oder lehnen Sie sie ab. Danach verfällt sie automatisch.` }]
        : []),
      { button: { label: isRequest ? "Anfrage beantworten" : "Buchung öffnen", url: appUrl(`/app/buchungen/${c.booking.id}`) } },
    ],
  });
}

export function landlordCancelledMail(c: BookingCtx, refund: number): EmailContent {
  return renderEmail({
    subject: `Stornierung: ${c.room.name}, ${formatRange(c.booking.startsAt, c.booking.endsAt, c.room.timezone)}`,
    title: "Eine Buchung wurde storniert",
    blocks: [
      { table: landlordTable(c) },
      { p: refund > 0 ? `Gemäss Stornierungsbedingungen wurden ${formatMoney(refund)} rückerstattet.` : "Es erfolgt keine Rückerstattung." },
      { button: { label: "Buchung öffnen", url: appUrl(`/app/buchungen/${c.booking.id}`) } },
    ],
  });
}

export function landlordPaidMail(c: BookingCtx): EmailContent {
  return renderEmail({
    subject: `Zahlung eingegangen: ${c.booking.reference} (${formatMoney(c.booking.amountPaid)})`,
    title: "Zahlung eingegangen",
    blocks: [{ table: landlordTable(c) }, { button: { label: "Buchung öffnen", url: appUrl(`/app/buchungen/${c.booking.id}`) } }],
  });
}

export function landlordConflictMail(orgName: string, roomName: string, details: string[]): EmailContent {
  return renderEmail({
    subject: `Kalenderkonflikt bei ${roomName}`,
    title: "Externer Termin überschneidet sich mit einer Buchung",
    blocks: [
      { p: `Beim Abgleich Ihres externen Kalenders für ${roomName} (${orgName}) haben wir Überschneidungen mit bestätigten Buchungen gefunden. Die Buchungen bleiben bestehen – bitte prüfen Sie die Termine.` },
      { table: details.map((d, i) => [`Konflikt ${i + 1}`, d] as [string, string]) },
      { button: { label: "Kalender öffnen", url: appUrl("/app/kalender") } },
    ],
  });
}

export function adminAlertMail(title: string, lines: [string, string][]): EmailContent {
  return renderEmail({ subject: `[${BRAND.name} Admin] ${title}`, title, blocks: [{ table: lines }, { button: { label: "Admin öffnen", url: appUrl("/admin") } }] });
}
