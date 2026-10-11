import { count, inArray } from "drizzle-orm";
import { DoorOpen, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { requireOrg } from "@/lib/auth/guards";
import { maxRoomsFor, roomUsage } from "@/lib/billing/entitlements";
import { db, schema } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/rooms/constants";
import { listOrgRooms } from "@/lib/rooms/service";
import { publicUrl } from "@/lib/storage";
import { formatMoney } from "@/lib/utils/money";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ archiv?: string }> }) {
  const ctx = await requireOrg();
  const { archiv } = await searchParams;
  const rooms = await listOrgRooms(ctx.org.id, { includeArchived: !!archiv });
  const [used, max] = await Promise.all([roomUsage(ctx.org.id), maxRoomsFor(ctx.org)]);
  const ids = rooms.map((r) => r.id);
  const covers = ids.length
    ? await db.select().from(schema.roomPhotos).where(inArray(schema.roomPhotos.roomId, ids)).orderBy(schema.roomPhotos.sort)
    : [];
  const bookingCounts = ids.length
    ? await db.select({ roomId: schema.bookings.roomId, n: count() }).from(schema.bookings).where(inArray(schema.bookings.roomId, ids)).groupBy(schema.bookings.roomId)
    : [];
  const statusBadge = (s: string) =>
    s === "published" ? <Badge tone="green">Online</Badge> : s === "archived" ? <Badge>Archiviert</Badge> : <Badge tone="amber">Entwurf</Badge>;

  return (
    <>
      <PageHeader
        title="Meine Räume"
        description={`${used} von ${max} ${max === 1 ? "Raum" : "Räumen"} in Ihrem Tarif genutzt.`}
        actions={
          <>
            <ButtonLink href={archiv ? "/app/raeume" : "/app/raeume?archiv=1"} variant="ghost">{archiv ? "Ohne Archiv" : "Archiv anzeigen"}</ButtonLink>
            {ctx.role !== "staff" && used < max && <ButtonLink href="/app/raeume/neu"><Plus /> Raum erfassen</ButtonLink>}
          </>
        }
      />
      {rooms.length === 0 ? (
        <EmptyState icon={<DoorOpen />} title="Noch kein Raum erfasst" action={<ButtonLink href="/app/raeume/neu"><Plus /> Ersten Raum erfassen</ButtonLink>}>
          Erfassen Sie Ihren Raum mit Fotos, Preisen und Öffnungszeiten. Danach erhalten Sie Ihre eigene Buchungsseite.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => {
            const cover = covers.find((c) => c.roomId === r.id);
            const n = bookingCounts.find((b) => b.roomId === r.id)?.n ?? 0;
            return (
              <Card key={r.id} className="overflow-hidden transition hover:shadow-lift">
                <Link href={`/app/raeume/${r.id}`} className="block">
                  <div className="aspect-[4/3] bg-ink-100">
                    {cover ? <img src={publicUrl(cover.thumbPath)!} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-ink-400"><DoorOpen className="size-10" /></div>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold">{r.name}</h2>
                      {statusBadge(r.status)}
                    </div>
                    <p className="mt-1 text-sm text-ink-500">{CATEGORY_LABELS[r.category]} · bis {r.capacity} Personen{r.city ? ` · ${r.city}` : ""}</p>
                    <p className="mt-2 text-sm text-ink-700">
                      {r.hourlyPrice ? `${formatMoney(r.hourlyPrice)}/Std.` : r.dayPrice ? `${formatMoney(r.dayPrice)}/Tag` : "Noch kein Preis"} · {n} Buchungen
                    </p>
                  </div>
                </Link>
                {r.status === "published" && (
                  <div className="border-t border-ink-100 px-4 py-2.5">
                    <Link href={`/r/${r.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">Öffentliche Seite <ExternalLink className="size-3.5" /></Link>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
