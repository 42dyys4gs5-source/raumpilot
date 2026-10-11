import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { FormStartedField } from "./action-form";

const field =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm ring-1 ring-ink-200 ring-inset placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:ring-red-400";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-24", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink-800", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
  optional,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-ink-400">(optional)</span>}
      </Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Checkbox({ label, description, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-ink-300 accent-brand-700" {...props} />
      <span className="text-sm">
        <span className="font-medium text-ink-800">{label}</span>
        {description && <span className="block text-ink-500">{description}</span>}
      </span>
    </label>
  );
}

/** Spam protection fields for public forms (honeypot + fill time). */
export function BotFields() {
  return (
    <>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <FormStartedField />
    </>
  );
}
