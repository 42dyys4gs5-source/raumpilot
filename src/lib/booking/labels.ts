import type { BookingStatus, PaymentStatus } from "@/lib/db/schema";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Anfrage offen",
  awaiting_payment: "Angenommen – Zahlung ausstehend",
  pending_payment: "Zahlung läuft",
  confirmed: "Bestätigt",
  cancelled: "Storniert",
  declined: "Abgelehnt",
  expired: "Abgelaufen",
};

export const STATUS_TONE: Record<BookingStatus, "green" | "amber" | "red" | "neutral" | "blue"> = {
  requested: "amber",
  awaiting_payment: "blue",
  pending_payment: "blue",
  confirmed: "green",
  cancelled: "red",
  declined: "red",
  expired: "neutral",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  none: "–",
  pending: "Ausstehend",
  paid: "Online bezahlt",
  partially_refunded: "Teilweise erstattet",
  refunded: "Erstattet",
  failed: "Fehlgeschlagen",
  offline_due: "Offen (Rechnung/vor Ort)",
  offline_paid: "Bezahlt (Rechnung/vor Ort)",
};
