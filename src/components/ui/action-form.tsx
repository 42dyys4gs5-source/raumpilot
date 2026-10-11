"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";
import { Alert } from "./card";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FieldErrorsContext = React.createContext<Record<string, string> | undefined>(undefined);
export const useFieldError = (name: string) => React.useContext(FieldErrorsContext)?.[name];

/**
 * Progressive-enhancement form bound to a server action. Shows errors/success messages.
 * Works without JavaScript (plain POST) and with JavaScript (no full reload).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  successMessage = true,
  confirm,
  id,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: boolean;
  confirm?: string;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <FieldErrorsContext.Provider value={state.fieldErrors}>
      <form
        ref={ref}
        id={id}
        action={formAction}
        className={cn("space-y-4", className)}
        noValidate={false}
        onSubmit={(e) => {
          if (confirm && !window.confirm(confirm)) e.preventDefault();
        }}
      >
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.ok && successMessage && state.message && <Alert tone="success">{state.message}</Alert>}
        {children}
      </form>
    </FieldErrorsContext.Provider>
  );
}

export function SubmitButton({ children, variant, size, className, pendingText }: { children: React.ReactNode; variant?: React.ComponentProps<typeof Button>["variant"]; size?: React.ComponentProps<typeof Button>["size"]; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending} aria-busy={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function FieldError({ name }: { name: string }) {
  const err = useFieldError(name);
  return err ? <p className="mt-1.5 text-xs text-red-600">{err}</p> : null;
}

/** Records when a public form was rendered (anti-bot timing check). */
export function FormStartedField() {
  const [v, setV] = React.useState("0");
  useEffect(() => setV(String(Date.now())), []);
  return <input type="hidden" name="form_started" value={v} />;
}
