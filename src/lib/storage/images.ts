import sharp from "sharp";
import { randomToken } from "@/lib/security/crypto";
import { putObject } from "./index";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "heif"]);

export class UploadError extends Error {}

/**
 * Validates an uploaded image by its actual content (not the file name or client MIME type),
 * strips metadata (EXIF/GPS), normalises orientation and stores WebP versions.
 */
export async function storeImage(file: File, prefix: string, opts: { maxWidth?: number; thumbWidth?: number } = {}) {
  if (!file || file.size === 0) throw new UploadError("Bitte wählen Sie eine Bilddatei.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Die Datei ist zu gross (max. 10 MB).");
  const input = Buffer.from(await file.arrayBuffer());
  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new UploadError("Die Datei ist kein gültiges Bild.");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new UploadError("Erlaubt sind JPG, PNG, WebP und AVIF.");

  const id = randomToken(12).replace(/[^a-zA-Z0-9]/g, "x");
  const base = sharp(input, { limitInputPixels: 50_000_000 }).rotate();
  const { data: full, info } = await base
    .clone()
    .resize({ width: opts.maxWidth ?? 2000, height: opts.maxWidth ?? 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: opts.thumbWidth ?? 720, height: Math.round((opts.thumbWidth ?? 720) * 0.75), fit: "cover" })
    .webp({ quality: 78 })
    .toBuffer();
  const path = `${prefix}/${id}.webp`;
  const thumbPath = `${prefix}/${id}-thumb.webp`;
  await putObject(path, full, "image/webp");
  await putObject(thumbPath, thumb, "image/webp");
  return { path, thumbPath, width: info.width, height: info.height };
}
