import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

// scrypt parameters (N=2^15, r=8, p=1) – OWASP-recommended baseline, ~64 MiB memory.
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 128 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, n = N, r = R, p = P): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: MAXMEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    // Constant-ish time even for unknown users.
    await scrypt(password, randomBytes(16));
    return false;
  }
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(password, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  const expected = Buffer.from(hash, "base64");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

export const PASSWORD_MIN_LENGTH = 10;

/** Returns an error message (German) or null. */
export function validatePasswordStrength(pw: string, email?: string): string | null {
  if (pw.length < PASSWORD_MIN_LENGTH) return `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`;
  if (pw.length > 200) return "Das Passwort ist zu lang.";
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4)
    return "Das Passwort darf nicht Ihre E-Mail-Adresse enthalten.";
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 2) return "Bitte verwenden Sie mindestens zwei Zeichenarten (z. B. Buchstaben und Zahlen).";
  const common = ["passwort123", "password123", "1234567890", "qwertzuiop", "raumvia123"];
  if (common.includes(pw.toLowerCase())) return "Dieses Passwort ist zu häufig. Bitte wählen Sie ein anderes.";
  return null;
}
