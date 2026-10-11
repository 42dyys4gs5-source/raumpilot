import { describe, expect, it } from "vitest";
import { wallTime } from "@/lib/booking/availability";
import { computePrice, type PricingInput, type PricingRoom } from "@/lib/booking/pricing";
import { computeRefund } from "@/lib/booking/policy";

const Z = "Europe/Zurich";
const baseRoom: PricingRoom = { timezone: Z, hourlyPrice: 5000, halfDayPrice: 18000, halfDayHours: 5, dayPrice: 30000, dayHours: 12, depositAmount: 0, depositMode: "none" };
const input = (o: Partial<PricingInput> = {}): PricingInput => ({
  room: baseRoom,
  rules: [],
  start: wallTime("2026-02-03", 10 * 60, Z), // Tuesday
  end: wallTime("2026-02-03", 12 * 60, Z),
  guests: 10,
  extras: [],
  discount: null,
  vat: { registered: false, rateBp: 810 },
  ...o,
});

describe("computePrice", () => {
  it("charges hourly for short bookings", () => {
    expect(computePrice(input()).totalAmount).toBe(10000);
  });
  it("uses the cheaper half-day package", () => {
    const r = computePrice(input({ end: wallTime("2026-02-03", 15 * 60, Z) })); // 5h -> 250 vs 180
    expect(r.totalAmount).toBe(18000);
    expect(r.lines[0].label).toContain("Halbtag");
  });
  it("uses day package and multi-day packages", () => {
    expect(computePrice(input({ end: wallTime("2026-02-03", 20 * 60, Z) })).totalAmount).toBe(30000);
    expect(computePrice(input({ end: wallTime("2026-02-05", 10 * 60, Z) })).totalAmount).toBe(60000);
  });
  it("applies weekend surcharge as transparent adjustment line", () => {
    const r = computePrice(
      input({
        start: wallTime("2026-02-07", 10 * 60, Z), // Saturday
        end: wallTime("2026-02-07", 12 * 60, Z),
        rules: [{ name: "Wochenende", weekdays: [6, 7], startDate: null, endDate: null, startMinute: null, endMinute: null, adjustmentPercent: 20 }],
      }),
    );
    expect(r.totalAmount).toBe(12000);
    expect(r.lines.find((l) => l.kind === "adjustment")?.amount).toBe(2000);
  });
  it("prices only the weekend part of an overnight Friday booking", () => {
    const r = computePrice(
      input({
        room: { ...baseRoom, halfDayPrice: null, dayPrice: null },
        start: wallTime("2026-02-06", 22 * 60, Z), // Fri 22:00
        end: wallTime("2026-02-06", 26 * 60, Z), // Sat 02:00
        rules: [{ name: "WE", weekdays: [6, 7], startDate: null, endDate: null, startMinute: null, endMinute: null, adjustmentPercent: 50 }],
      }),
    );
    expect(r.totalAmount).toBe(20000 + 5000); // 2h Saturday at +50%
  });
  it("adds extras, discount, deposit and VAT", () => {
    const r = computePrice(
      input({
        room: { ...baseRoom, depositAmount: 20000, depositMode: "online" },
        extras: [
          { extra: { id: "a", name: "Beamer", price: 3000, pricing: "per_booking", maxQuantity: 1 }, quantity: 1 },
          { extra: { id: "b", name: "Apéro", price: 1250, pricing: "per_person", maxQuantity: 1 }, quantity: 1 },
          { extra: { id: "c", name: "Technik", price: 1000, pricing: "per_hour", maxQuantity: 1 }, quantity: 1 },
        ],
        discount: { code: "WILLKOMMEN", kind: "percent", value: 10, minAmount: null },
        vat: { registered: true, rateBp: 810 },
      }),
    );
    // rent 100 + beamer 30 + apéro 125 + technik 20 = 275; -10% = 27.50 → 247.50 ; + deposit 200
    expect(r.extrasAmount).toBe(17500);
    expect(r.discountAmount).toBe(2750);
    expect(r.totalAmount).toBe(24750 + 20000);
    expect(r.vatAmount).toBe(Math.round((24750 * 810) / 10810));
  });
  it("rejects discount below minimum amount", () => {
    const r = computePrice(input({ discount: { code: "X", kind: "fixed", value: 5000, minAmount: 50000 } }));
    expect(r.discountApplied).toBe(false);
    expect(r.discountError).toBeTruthy();
  });
});

describe("computeRefund", () => {
  const policy = { freeUntilHours: 72, partialRefundPercent: 50, partialUntilHours: 24 };
  const startsAt = new Date("2026-05-10T10:00:00Z");
  const base = { policy, startsAt, amountPaid: 30000, amountRefunded: 0, depositAmount: 10000 };
  it("full refund before free deadline", () => {
    expect(computeRefund({ ...base, now: new Date("2026-05-01T00:00:00Z"), cancelledBy: "customer" }).refund).toBe(30000);
  });
  it("partial refund + full deposit in partial window", () => {
    expect(computeRefund({ ...base, now: new Date("2026-05-08T12:00:00Z"), cancelledBy: "customer" }).refund).toBe(10000 + 10000);
  });
  it("only deposit when late", () => {
    expect(computeRefund({ ...base, now: new Date("2026-05-10T00:00:00Z"), cancelledBy: "customer" }).refund).toBe(10000);
  });
  it("landlord cancellation refunds everything", () => {
    expect(computeRefund({ ...base, now: new Date("2026-05-10T09:00:00Z"), cancelledBy: "landlord" }).refund).toBe(30000);
  });
});
