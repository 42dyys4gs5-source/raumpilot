import { Check } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import Link from "next/link";
import { type BillingInterval, type Plan, YEARLY_MONTHS_CHARGED, yearlyPrice } from "@/lib/billing/entitlements";
import type { ActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/money";

export function PlanCards({
  plans,
  currentKey,
  action,
  hrefFor,
  ctaLabel = "Tarif wählen",
  vatNote,
  interval = "month",
}: {
  plans: Plan[];
  interval?: BillingInterval;
  currentKey?: string | null;
  action?: (s: ActionState, fd: FormData) => Promise<ActionState>;
  hrefFor?: (key: string) => string;
  ctaLabel?: string;
  vatNote: string;
}) {
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.filter((p) => p.active).map((p) => {
          const featured = p.key === "professional";
          const current = p.key === currentKey;
          return (
            <div key={p.key} className={cn("relative flex flex-col rounded-2xl border p-6 transition duration-200", featured ? "border-brand-600 bg-gradient-to-b from-brand-50/70 to-white shadow-lift ring-1 ring-brand-600" : "border-ink-200 bg-white shadow-soft hover:-translate-y-0.5 hover:shadow-lift")}>
              {featured && <span className="absolute -top-3 left-6"><Badge tone="brand" className="bg-brand-700 text-white">Für mehrere Räume</Badge></span>}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-ink-500">{p.description}</p>
              {interval === "year" ? (
                <>
                  <p className="mt-4"><span className="font-display text-4xl font-semibold tracking-tight text-ink-900">{formatMoney(yearlyPrice(p)).replace(".–", "")}</span><span className="text-sm text-ink-500"> / Jahr</span></p>
                  <p className="mt-1 text-sm text-brand-700">entspricht {formatMoney(Math.round(yearlyPrice(p) / 12))} pro Monat <span className="whitespace-nowrap">· {12 - YEARLY_MONTHS_CHARGED} Monate gratis</span></p>
                </>
              ) : (
                <p className="mt-4"><span className="font-display text-4xl font-semibold tracking-tight text-ink-900">{formatMoney(p.priceMonthly).replace(".–", "")}</span><span className="text-sm text-ink-500"> / Monat</span></p>
              )}
              <ul className="mt-6 flex-1 space-y-2.5 border-t border-ink-100 pt-6 text-sm text-ink-700">
                {p.highlights.map((h) => <li key={h} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{h}</li>)}
              </ul>
              <div className="mt-6">
                {current ? (
                  <Badge tone="green">Ihr aktueller Tarif</Badge>
                ) : action ? (
                  <ActionForm action={action} className="space-y-2">
                    <input type="hidden" name="plan" value={p.key} />
                    <input type="hidden" name="interval" value={interval} />
                    <SubmitButton className="w-full" variant={featured ? "primary" : "secondary"}>{ctaLabel}</SubmitButton>
                  </ActionForm>
                ) : hrefFor ? (
                  <ButtonLink href={hrefFor(p.key)} className="w-full" variant={featured ? "primary" : "secondary"}>{ctaLabel}</ButtonLink>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-ink-500">{vatNote}</p>
    </div>
  );
}

/** Switch between monthly and annual prices (plain links, works without JavaScript). */
export function IntervalToggle({ basePath, interval }: { basePath: string; interval: BillingInterval }) {
  const item = (iv: BillingInterval, label: React.ReactNode) => (
    <Link
      href={iv === "year" ? `${basePath}?abrechnung=jaehrlich` : basePath}
      scroll={false}
      aria-current={interval === iv ? "true" : undefined}
      className={cn("rounded-full px-4 py-2 text-sm font-medium transition", interval === iv ? "bg-white text-ink-900 shadow-soft" : "text-ink-600 hover:text-ink-900")}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-6 flex justify-center">
      <div className="inline-flex rounded-full bg-ink-100 p-1" role="group" aria-label="Abrechnungsintervall">
        {item("month", "Monatlich")}
        {item("year", <>Jährlich <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">2 Monate gratis</span></>)}
      </div>
    </div>
  );
}
