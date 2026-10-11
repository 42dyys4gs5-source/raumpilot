"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
  }
}

/** Cloudflare Turnstile widget. Inside a <form> it adds the hidden field «cf-turnstile-response». */
export function Turnstile({ siteKey, onToken }: { siteKey?: string | null; onToken?: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  useEffect(() => {
    if (!siteKey) return;
    const tryRender = () => {
      if (!ref.current || !window.turnstile || id.current) return false;
      id.current = window.turnstile.render(ref.current, { sitekey: siteKey, language: "de", callback: (t: string) => onToken?.(t) });
      return true;
    };
    if (tryRender()) return;
    const t = setInterval(() => tryRender() && clearInterval(t), 200);
    return () => {
      clearInterval(t);
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [siteKey, onToken]);
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={ref} />
    </>
  );
}
