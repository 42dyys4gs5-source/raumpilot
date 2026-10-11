import { DateTime } from "luxon";
import type { PriceBreakdown } from "@/lib/db/schema";
import { formatMoney, roundTo5, vatFromGross } from "@/lib/utils/money";
import { formatDuration } from "./availability";

/** Pure price calculation – fully unit-tested. Amounts in Rappen. */

export type PricingRoom = {
  timezone: string;
  hourlyPrice: number | null;
  halfDayPrice: number | null;
  halfDayHours: number;
  dayPrice: number | null;
  dayHours: number;
  depositAmount: number;
  depositMode: "none" | "on_site" | "online";
};

export type PricingRule = {
  name: string;
  weekdays: number[] | null;
  startDate: string | null; // YYYY-MM-DD, inclusive
  endDate: string | null; // inclusive
  startMinute: number | null;
  endMinute: number | null;
  adjustmentPercent: number;
};

export type PricingExtra = {
  id: string;
  name: string;
  price: number;
  pricing: "per_booking" | "per_hour" | "per_person" | "per_unit";
  maxQuantity: number;
};

export type PricingDiscount = { code: string; kind: "percent" | "fixed"; value: number; minAmount: number | null };

export type PricingInput = {
  room: PricingRoom;
  rules: PricingRule[];
  start: Date;
  end: Date;
  guests: number;
  extras: { extra: PricingExtra; quantity: number }[];
  discount: PricingDiscount | null;
  vat: { registered: boolean; rateBp: number };
};

export type PricingResult = PriceBreakdown & {
  extrasDetail: { extraId: string; name: string; pricing: string; quantity: number; unitPrice: number; total: number }[];
  discountApplied: boolean;
  discountError: string | null;
};

const SEGMENT_MIN = 5;

export function ruleMatches(rule: PricingRule, local: DateTime): boolean {
  if (rule.weekdays && rule.weekdays.length && !rule.weekdays.includes(local.weekday)) return false;
  const d = local.toISODate()!;
  if (rule.startDate && d < rule.startDate) return false;
  if (rule.endDate && d > rule.endDate) return false;
  if (rule.startMinute != null && rule.endMinute != null) {
    const m = local.hour * 60 + local.minute;
    if (rule.startMinute <= rule.endMinute) {
      if (m < rule.startMinute || m >= rule.endMinute) return false;
    } else if (m < rule.startMinute && m >= rule.endMinute) return false; // overnight rule window
  }
  return true;
}

function factorAt(rules: PricingRule[], instant: Date, zone: string): number {
  const local = DateTime.fromJSDate(instant, { zone });
  const pct = rules.filter((r) => ruleMatches(r, local)).reduce((s, r) => s + r.adjustmentPercent, 0);
  return Math.max(0, 1 + pct / 100);
}

export function hasAnyPrice(room: Pick<PricingRoom, "hourlyPrice" | "halfDayPrice" | "dayPrice">): boolean {
  return [room.hourlyPrice, room.halfDayPrice, room.dayPrice].some((p) => p != null && p > 0);
}

/** Rent for the period: cheapest of hourly, half-day and day package (each including rule adjustments). */
export function computeRent(room: PricingRoom, rules: PricingRule[], start: Date, end: Date) {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  type Candidate = { label: string; base: number; adjusted: number };
  const candidates: Candidate[] = [];

  if (room.hourlyPrice != null && room.hourlyPrice > 0) {
    let base = 0;
    let adjusted = 0;
    for (let t = start.getTime(); t < end.getTime(); t += SEGMENT_MIN * 60_000) {
      const segMin = Math.min(SEGMENT_MIN, (end.getTime() - t) / 60_000);
      const p = (room.hourlyPrice * segMin) / 60;
      base += p;
      adjusted += p * factorAt(rules, new Date(t), room.timezone);
    }
    candidates.push({ label: `Miete ${formatDuration(minutes)} à ${formatMoney(room.hourlyPrice)}/Std.`, base, adjusted });
  }
  const startFactor = factorAt(rules, start, room.timezone);
  if (room.halfDayPrice != null && room.halfDayPrice > 0 && minutes <= room.halfDayHours * 60) {
    candidates.push({ label: `Halbtagespauschale (bis ${room.halfDayHours} Std.)`, base: room.halfDayPrice, adjusted: room.halfDayPrice * startFactor });
  }
  if (room.dayPrice != null && room.dayPrice > 0) {
    if (minutes <= room.dayHours * 60) {
      candidates.push({ label: `Tagespauschale (bis ${room.dayHours} Std.)`, base: room.dayPrice, adjusted: room.dayPrice * startFactor });
    } else {
      const days = Math.ceil(minutes / 1440);
      // Average factor across the covered days keeps multi-day pricing fair with weekend/season rules.
      let f = 0;
      for (let i = 0; i < days; i++) f += factorAt(rules, new Date(start.getTime() + i * 86400_000), room.timezone);
      candidates.push({ label: `${days} × Tagespauschale`, base: room.dayPrice * days, adjusted: (room.dayPrice * f) });
    }
  }
  if (!candidates.length) return { label: "Miete", base: 0, adjusted: 0, minutes };
  const best = candidates.reduce((a, b) => (b.adjusted < a.adjusted ? b : a));
  return { label: best.label, base: roundTo5(best.base), adjusted: roundTo5(best.adjusted), minutes };
}

export function computePrice(input: PricingInput): PricingResult {
  const { room, start, end } = input;
  const rent = computeRent(room, input.rules, start, end);
  const hours = rent.minutes / 60;
  const lines: PriceBreakdown["lines"] = [{ label: rent.label, amount: rent.base, kind: "rent" }];
  const adjustment = rent.adjusted - rent.base;
  if (adjustment !== 0) {
    lines.push({ label: adjustment > 0 ? "Zuschlag (Wochenende/Saison)" : "Ermässigung (Saison/Randzeit)", amount: adjustment, kind: "adjustment" });
  }

  const extrasDetail: PricingResult["extrasDetail"] = [];
  for (const { extra, quantity } of input.extras) {
    let qty = Math.max(0, Math.min(Math.floor(quantity), extra.maxQuantity));
    if (extra.pricing === "per_person") qty = qty > 0 ? Math.max(1, input.guests) : 0;
    if (!qty) continue;
    const multiplier = extra.pricing === "per_hour" ? hours : 1;
    const total = roundTo5(extra.price * qty * multiplier);
    extrasDetail.push({ extraId: extra.id, name: extra.name, pricing: extra.pricing, quantity: qty, unitPrice: extra.price, total });
    const suffix = extra.pricing === "per_person" ? ` (${qty} Pers.)` : extra.pricing === "per_hour" ? ` (${formatDuration(rent.minutes)})` : qty > 1 ? ` × ${qty}` : "";
    lines.push({ label: extra.name + suffix, amount: total, kind: "extra" });
  }
  const extrasAmount = extrasDetail.reduce((s, e) => s + e.total, 0);
  const subtotal = rent.adjusted + extrasAmount;

  let discountAmount = 0;
  let discountError: string | null = null;
  if (input.discount) {
    const d = input.discount;
    if (d.minAmount != null && subtotal < d.minAmount) {
      discountError = `Dieser Code gilt ab einem Betrag von ${formatMoney(d.minAmount)}.`;
    } else {
      discountAmount = d.kind === "percent" ? roundTo5((subtotal * Math.min(100, d.value)) / 100) : Math.min(d.value, subtotal);
      lines.push({ label: `Rabattcode ${d.code}`, amount: -discountAmount, kind: "discount" });
    }
  }

  const depositAmount = room.depositMode === "online" ? room.depositAmount : 0;
  if (depositAmount > 0) lines.push({ label: "Kaution (rückerstattbar)", amount: depositAmount, kind: "deposit" });

  const taxable = subtotal - discountAmount;
  const totalAmount = taxable + depositAmount;
  return {
    lines,
    rentAmount: rent.adjusted,
    extrasAmount,
    discountAmount,
    depositAmount,
    totalAmount,
    vatAmount: input.vat.registered ? vatFromGross(taxable, input.vat.rateBp) : 0,
    vatRateBp: input.vat.registered ? input.vat.rateBp : 0,
    pricesIncludeVat: true,
    durationMinutes: rent.minutes,
    extrasDetail,
    discountApplied: discountAmount > 0,
    discountError,
  };
}
