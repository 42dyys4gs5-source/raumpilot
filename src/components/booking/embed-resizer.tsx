"use client";

import { useEffect } from "react";

/** Reports the document height to the parent page (used by /widget.js for auto-resizing iframes). */
export function EmbedResizer() {
  useEffect(() => {
    if (window.parent === window) return;
    const send = () => window.parent.postMessage({ type: "raumvia:height", height: document.documentElement.scrollHeight }, "*");
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    send();
    return () => ro.disconnect();
  }, []);
  return null;
}
