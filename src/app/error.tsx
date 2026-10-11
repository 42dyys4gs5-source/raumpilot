"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Da ist etwas schiefgelaufen</h1>
        <p className="mt-2 text-ink-600">Der Fehler wurde protokolliert. Bitte versuchen Sie es erneut.{error.digest ? ` (Referenz ${error.digest})` : ""}</p>
        <button onClick={reset} className="mt-6 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800">Erneut versuchen</button>
      </div>
    </div>
  );
}
