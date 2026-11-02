// Serves stored files ONLY to logged-in internal users (client access needs per-record ownership
// checks — add them before exposing files to the portal).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readStoredFile } from "@/lib/files";

const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (session?.user?.userType !== "internal") return new NextResponse("No autorizado", { status: 401 });
  const { path: parts } = await params;
  try {
    const data = await readStoredFile(parts.join("/"));
    const ext = parts[parts.length - 1].split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
