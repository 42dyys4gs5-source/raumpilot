import { describe, expect, it } from "vitest";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { base32Decode, base32Encode, generateTotpSecret, totp, verifyTotp } from "@/lib/auth/totp";
import { bookingToken, verifyBookingToken } from "@/lib/booking/links";
import { isPrivateAddress, normaliseFeedUrl } from "@/lib/calendar/fetch-safe";
import { decrypt, encrypt } from "@/lib/security/crypto";
import { formatMoney, parseMoney, roundTo5 } from "@/lib/utils/money";
import { slugify } from "@/lib/utils/slug";

describe("passwords", () => {
  it("hashes and verifies with scrypt and per-hash salt", async () => {
    const h = await hashPassword("Sicheres-Passwort-1");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Sicheres-Passwort-1", h)).toBe(true);
    expect(await verifyPassword("falsch", h)).toBe(false);
    expect(await hashPassword("Sicheres-Passwort-1")).not.toBe(h);
    expect(await verifyPassword("x", null)).toBe(false);
  });
  it("enforces strength rules", () => {
    expect(validatePasswordStrength("kurz")).toBeTruthy();
    expect(validatePasswordStrength("nurbuchstabenhier")).toBeTruthy();
    expect(validatePasswordStrength("Buchstaben2026")).toBeNull();
    expect(validatePasswordStrength("annamuster2026", "annamuster@example.ch")).toBeTruthy();
  });
});

describe("TOTP (RFC 6238)", () => {
  it("matches the RFC test vector", () => {
    // RFC 6238 SHA-1 secret "12345678901234567890" at T=59s -> 94287082 (8 digits) -> last 6 digits 287082
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(totp(secret, 59_000)).toBe("287082");
  });
  it("roundtrips base32 and verifies with drift window", () => {
    const s = generateTotpSecret();
    expect(base32Encode(base32Decode(s))).toBe(s);
    const now = Date.now();
    expect(verifyTotp(s, totp(s, now - 30_000), now)).toBe(true);
    expect(verifyTotp(s, totp(s, now - 120_000), now)).toBe(false);
    expect(verifyTotp(s, "abc", now)).toBe(false);
  });
});

describe("encryption & tokens", () => {
  it("encrypts with AES-GCM and detects tampering", () => {
    const c = encrypt("https://calendar.google.com/private-secret.ics");
    expect(c).not.toContain("google");
    expect(decrypt(c)).toBe("https://calendar.google.com/private-secret.ics");
    const parts = c.split(".");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("A") ? "BB" : "AA");
    expect(() => decrypt(parts.join("."))).toThrow();
  });
  it("booking tokens cannot be forged", () => {
    const id = "6f1c2c43-1d5e-4b84-9f39-2f3d9a3c1e11";
    const t = bookingToken(id);
    expect(verifyBookingToken(t)).toBe(id);
    expect(verifyBookingToken(`${id}.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)).toBeNull();
    expect(verifyBookingToken("6f1c2c43-1d5e-4b84-9f39-2f3d9a3c1e12." + t.split(".")[1])).toBeNull();
  });
});

describe("SSRF protection for calendar import", () => {
  it("blocks private and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "100.64.0.1"]) expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "142.250.1.1", "2a00:1450::1"]) expect(isPrivateAddress(ip)).toBe(false);
  });
  it("only allows https on standard ports without credentials", () => {
    expect(normaliseFeedUrl("webcal://example.com/a.ics").protocol).toBe("https:");
    expect(() => normaliseFeedUrl("http://example.com/a.ics")).toThrow();
    expect(() => normaliseFeedUrl("https://user:pw@example.com/a.ics")).toThrow();
    expect(() => normaliseFeedUrl("https://example.com:8443/a.ics")).toThrow();
    expect(() => normaliseFeedUrl("file:///etc/passwd")).toThrow();
  });
});

describe("utilities", () => {
  it("formats and parses Swiss money", () => {
    expect(formatMoney(123400)).toBe("CHF 1’234.–");
    expect(formatMoney(4950)).toBe("CHF 49.50");
    expect(parseMoney("1'200.50")).toBe(120050);
    expect(parseMoney("80,5")).toBe(8050);
    expect(parseMoney("abc")).toBeNull();
    expect(roundTo5(1232)).toBe(1230);
    expect(roundTo5(1233)).toBe(1235);
  });
  it("creates URL slugs from German names", () => {
    expect(slugify("Eventraum Süd – Zürich")).toBe("eventraum-sued-zuerich");
    expect(slugify("Proberaum Ä/Ö/Ü 3")).toBe("proberaum-ae-oe-ue-3");
  });
});
