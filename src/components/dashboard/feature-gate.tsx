import { Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { FEATURE_LABELS } from "@/config/plans";
import type { PlanFeatures } from "@/lib/db/schema";

export function FeatureLocked({ feature }: { feature: keyof PlanFeatures }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-accent-100 text-accent-600"><Lock className="size-5" /></div>
      <h2 className="font-semibold">{FEATURE_LABELS[feature]} sind in Ihrem Tarif nicht enthalten</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">Wechseln Sie auf Professional oder Business, um diese Funktion zu nutzen.</p>
      <ButtonLink href="/app/abonnement" className="mt-5">Tarife ansehen</ButtonLink>
    </div>
  );
}
