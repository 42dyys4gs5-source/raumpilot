import { Check } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import type { Plan } from "@/lib/billing/entitlements";
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
}: {
  plans: Plan[];
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
            <div key={p.key} className={cn("relative flex flex-col rounded-2xl border bg-white p-6", featured ? "border-brand-600 shadow-lift ring-1 ring-brand-600" : "border-ink-200 shadow-soft")}>
              {featured && <span className="absolute -top-3 left-6"><Badge tone="brand" className="bg-brand-700 text-white">Beliebt</Badge></span>}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-ink-500">{p.description}</p>
              <p className="mt-4"><span className="font-display text-4xl font-semibold text-ink-900">{formatMoney(p.priceMonthly).replace(".–", "")}</span><span className="text-sm text-ink-500"> / Monat</span></p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.highlights.map((h) => <li key={h} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{h}</li>)}
              </ul>
              <div className="mt-6">
                {current ? (
                  <Badge tone="green">Ihr aktueller Tarif</Badge>
                ) : action ? (
                  <ActionForm action={action} className="space-y-2">
                    <input type="hidden" name="plan" value={p.key} />
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
