import { Alert, Card, CardBody, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { NewRoomForm } from "@/components/dashboard/new-room-form";
import { requireOrg } from "@/lib/auth/guards";
import { maxRoomsFor, roomUsage } from "@/lib/billing/entitlements";

export default async function NewRoomPage() {
  const ctx = await requireOrg("admin");
  const [used, max] = await Promise.all([roomUsage(ctx.org.id), maxRoomsFor(ctx.org)]);
  return (
    <>
      <PageHeader title="Neuen Raum erfassen" description="Beginnen Sie mit den Grunddaten – alles Weitere ergänzen Sie im nächsten Schritt." />
      {used >= max ? (
        <Alert tone="warning" title="Raumlimit erreicht">
          Ihr Tarif erlaubt {max} {max === 1 ? "Raum" : "Räume"}. <ButtonLink href="/app/abonnement" variant="link">Tarif wechseln</ButtonLink>
        </Alert>
      ) : (
        <Card className="max-w-2xl"><CardBody><NewRoomForm defaultCity={ctx.org.city} /></CardBody></Card>
      )}
    </>
  );
}
