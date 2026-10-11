import { env } from "@/lib/env";
import { readLocalObject } from "@/lib/storage";

/** Serves locally stored uploads (development / single-server setups). Production uses Supabase Storage. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (env.STORAGE_DRIVER !== "local") return new Response("Not found", { status: 404 });
  const { path } = await params;
  const key = path.join("/");
  if (!key.endsWith(".webp")) return new Response("Not found", { status: 404 });
  const data = await readLocalObject(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
