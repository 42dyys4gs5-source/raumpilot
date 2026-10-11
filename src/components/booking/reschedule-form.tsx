"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import type { ActionState } from "@/lib/actions/types";

export function RescheduleForm({ token, roomId, duration, timezone, action }: { token: string; roomId: string; duration: number; timezone: string; action: (s: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [start, setStart] = useState("");
  const fmt = useMemo(() => new Intl.DateTimeFormat("de-CH", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }), [timezone]);
  useEffect(() => {
    if (!date) return;
    setSlots(null);
    setStart("");
    fetch(`/api/availability?room=${roomId}&date=${date}&duration=${duration}`).then((r) => r.json()).then((d) => setSlots(d.slots ?? []));
  }, [date, roomId, duration]);
  return (
    <ActionForm action={action}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="start" value={start} />
      <label className="block text-sm font-medium">
        Neues Datum
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg px-3 ring-1 ring-ink-200 ring-inset" />
      </label>
      {date && slots === null && <p className="text-sm text-ink-500">Lade freie Zeiten …</p>}
      {slots && slots.length === 0 && <p className="text-sm text-amber-800">An diesem Tag ist kein passender Termin frei.</p>}
      {slots && slots.length > 0 && (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Neue Startzeit">
          {slots.map((s) => (
            <button type="button" key={s} aria-pressed={s === start} onClick={() => setStart(s)} className={`h-9 rounded-lg text-sm ring-1 ring-inset ${s === start ? "bg-brand-700 text-white ring-brand-700" : "ring-ink-200 hover:ring-brand-500"}`}>{fmt.format(new Date(s))}</button>
          ))}
        </div>
      )}
      <SubmitButton variant="secondary">Umbuchen</SubmitButton>
    </ActionForm>
  );
}
