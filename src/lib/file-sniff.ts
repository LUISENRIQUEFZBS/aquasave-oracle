// Plain helper (no "use server"): detect real file type from its first bytes (never trust the name).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function detectFileType(b: Buffer): "pdf" | "jpg" | "png" | null {
  if (b.length > 4 && b.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  return null;
}
