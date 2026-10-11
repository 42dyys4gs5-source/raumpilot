import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/form";
import { ROOM_CATEGORIES } from "@/lib/db/schema";
import { CATEGORY_LABELS } from "@/lib/rooms/constants";
import { createRoomAction } from "@/app/app/(main)/raeume/actions";

export function NewRoomForm({ next, defaultCity }: { next?: string; defaultCity?: string | null }) {
  return (
    <ActionForm action={createRoomAction}>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Name des Raums" htmlFor="name" hint="z. B. «Eventraum Seeblick» oder «Proberaum B»">
        <Input id="name" name="name" required minLength={2} maxLength={120} />
        <FieldError name="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategorie" htmlFor="category">
          <Select id="category" name="category" defaultValue="eventraum">
            {ROOM_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </Select>
        </Field>
        <Field label="Ort" htmlFor="city">
          <Input id="city" name="city" defaultValue={defaultCity ?? ""} />
        </Field>
        <Field label="Max. Personen" htmlFor="capacity">
          <Input id="capacity" name="capacity" type="number" min={1} max={5000} defaultValue={20} required />
        </Field>
        <Field label="Preis pro Stunde (CHF)" htmlFor="hourlyPrice" hint="Halbtages- und Tagespreise können Sie danach ergänzen.">
          <Input id="hourlyPrice" name="hourlyPrice" inputMode="decimal" placeholder="z. B. 60" />
        </Field>
      </div>
      <SubmitButton>Raum erstellen</SubmitButton>
    </ActionForm>
  );
}
