import type { CancellationPolicy } from "@/lib/db/schema";
import { roundTo5 } from "@/lib/utils/money";

export const POLICY_PRESETS: Record<string, { label: string; policy: CancellationPolicy; description: string }> = {
  flexibel: {
    label: "Flexibel",
    policy: { freeUntilHours: 24, partialRefundPercent: 0, partialUntilHours: 0 },
    description: "Kostenlose Stornierung bis 24 Stunden vor Mietbeginn.",
  },
  moderat: {
    label: "Moderat",
    policy: { freeUntilHours: 72, partialRefundPercent: 50, partialUntilHours: 24 },
    description: "Kostenlos bis 3 Tage vorher, 50 % Rückerstattung bis 24 Stunden vorher.",
  },
  streng: {
    label: "Streng",
    policy: { freeUntilHours: 336, partialRefundPercent: 50, partialUntilHours: 168 },
    description: "Kostenlos bis 14 Tage vorher, 50 % Rückerstattung bis 7 Tage vorher.",
  },
};

export function describePolicy(p: CancellationPolicy): string {
  const fmt = (h: number) => (h % 24 === 0 && h >= 48 ? `${h / 24} Tage` : `${h} Stunden`);
  const parts = [`Kostenlose Stornierung bis ${fmt(p.freeUntilHours)} vor Mietbeginn.`];
  if (p.partialRefundPercent > 0 && p.partialUntilHours < p.freeUntilHours) {
    parts.push(`Danach bis ${fmt(p.partialUntilHours)} vor Mietbeginn ${p.partialRefundPercent} % Rückerstattung.`);
  }
  parts.push("Später erfolgt keine Rückerstattung des Mietpreises. Eine online bezahlte Kaution wird immer vollständig zurückerstattet.");
  return parts.join(" ");
}

/**
 * Refund for a cancellation.
 * - Landlord / system cancellations: everything paid is refunded.
 * - Customer cancellations: refund per policy on the rent part; online deposit is always refunded.
 */
export function computeRefund(opts: {
  policy: CancellationPolicy;
  startsAt: Date;
  now: Date;
  amountPaid: number;
  amountRefunded: number;
  depositAmount: number;
  cancelledBy: "customer" | "landlord" | "system";
}): { refund: number; percent: number } {
  const refundable = opts.amountPaid - opts.amountRefunded;
  if (refundable <= 0) return { refund: 0, percent: 0 };
  if (opts.cancelledBy !== "customer") return { refund: refundable, percent: 100 };
  const hoursBefore = (opts.startsAt.getTime() - opts.now.getTime()) / 3600_000;
  let percent = 0;
  if (hoursBefore >= opts.policy.freeUntilHours) percent = 100;
  else if (opts.policy.partialRefundPercent > 0 && hoursBefore >= opts.policy.partialUntilHours) percent = opts.policy.partialRefundPercent;
  const deposit = Math.min(opts.depositAmount, opts.amountPaid);
  const rentPaid = opts.amountPaid - deposit;
  const refund = Math.min(refundable, roundTo5((rentPaid * percent) / 100) + deposit);
  return { refund, percent };
}

/** Customers may self-reschedule only while free cancellation still applies. */
export function canCustomerReschedule(policy: CancellationPolicy, startsAt: Date, now: Date): boolean {
  return (startsAt.getTime() - now.getTime()) / 3600_000 >= policy.freeUntilHours;
}
