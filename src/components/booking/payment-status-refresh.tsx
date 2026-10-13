"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * While a payment confirmation is pending, re-fetch the server-rendered page every few seconds.
 * Unlike a <meta http-equiv="refresh">, this stops as soon as the component unmounts (i.e. once the
 * booking is confirmed) and never reloads a page the visitor has meanwhile navigated back to.
 */
export function PaymentStatusRefresh({ seconds = 4, maxAttempts = 30 }: { seconds?: number; maxAttempts?: number }) {
  const router = useRouter();
  useEffect(() => {
    let attempts = 0;
    const t = setInterval(() => {
      attempts += 1;
      if (attempts > maxAttempts) return clearInterval(t);
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds, maxAttempts]);
  return null;
}
