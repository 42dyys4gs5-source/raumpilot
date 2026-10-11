import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Blocks requests to private, loopback, link-local and metadata addresses (SSRF protection). */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

export function normaliseFeedUrl(input: string): URL {
  const raw = input.trim().replace(/^webcals?:\/\//i, "https://");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Bitte verwenden Sie eine https-Adresse.");
  if (url.username || url.password) throw new Error("Adressen mit Zugangsdaten werden nicht unterstützt.");
  if (url.port && url.port !== "443") throw new Error("Nur Standard-Ports sind erlaubt.");
  return url;
}

async function assertPublicHost(host: string) {
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Diese Adresse ist nicht erlaubt.");
  }
}

/** Fetch a remote iCal feed with SSRF checks, redirect validation, timeout and size limit. */
export async function fetchFeed(input: string, maxBytes = 3 * 1024 * 1024): Promise<string> {
  let url = normaliseFeedUrl(input);
  for (let i = 0; i < 4; i++) {
    await assertPublicHost(url.hostname);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "Raumvia-Calendar-Sync/1.0", Accept: "text/calendar, text/plain, */*" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Ungültige Weiterleitung");
      url = normaliseFeedUrl(new URL(loc, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`Kalender nicht erreichbar (HTTP ${res.status})`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Leere Antwort");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Kalenderdatei ist zu gross (max. 3 MB).");
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Die Adresse liefert keinen iCal-Kalender.");
    return text;
  }
  throw new Error("Zu viele Weiterleitungen");
}
