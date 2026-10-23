"use client";

import { useEffect } from "react";

const KEY = "raumvia:registration-started";

export function RegistrationStartedTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      const eventId = crypto.randomUUID();
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "registration_started", eventId }),
        keepalive: true,
      }).then((response) => {
        if (response.ok) sessionStorage.setItem(KEY, eventId);
      }).catch(() => {});
    } catch {
      // Analytics are optional; registration must work if storage is unavailable.
    }
  }, []);
  return null;
}
