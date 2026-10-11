"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyField({ value, label, multiline }: { value: string; label: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>
      <div className="flex items-stretch gap-2">
        {multiline ? (
          <textarea readOnly value={value} rows={4} aria-label={label} className="block w-full rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-800 ring-1 ring-ink-200 ring-inset" onFocus={(e) => e.currentTarget.select()} />
        ) : (
          <input readOnly value={value} aria-label={label} className="block h-10 w-full min-w-0 rounded-lg bg-ink-50 px-3 font-mono text-xs text-ink-800 ring-1 ring-ink-200 ring-inset" onFocus={(e) => e.currentTarget.select()} />
        )}
        <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-white px-3 h-10 text-sm font-medium ring-1 ring-ink-200 ring-inset hover:bg-ink-50" aria-live="polite">
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
    </div>
  );
}
