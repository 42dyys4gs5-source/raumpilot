import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

/** Storage abstraction: local disk (development) or Supabase Storage (production). */

function safeKey(key: string): string {
  if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes("..")) throw new Error("Ungültiger Dateipfad");
  return key;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  key = safeKey(key);
  if (env.STORAGE_DRIVER === "supabase") {
    const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_STORAGE_BUCKET}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "true",
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) throw new Error(`Upload fehlgeschlagen (${res.status}): ${await res.text()}`);
    return;
  }
  const full = path.resolve(env.STORAGE_LOCAL_DIR, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

export async function deleteObject(key: string): Promise<void> {
  key = safeKey(key);
  if (env.STORAGE_DRIVER === "supabase") {
    await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_STORAGE_BUCKET}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [key] }),
    });
    return;
  }
  await unlink(path.resolve(env.STORAGE_LOCAL_DIR, key)).catch(() => {});
}

export async function readLocalObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(path.resolve(env.STORAGE_LOCAL_DIR, safeKey(key)));
  } catch {
    return null;
  }
}

export function publicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (env.STORAGE_DRIVER === "supabase") return `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${key}`;
  return `/media/${key}`;
}
