import { NextRequest } from "next/server";
import React from "react";
import { auth } from "@/auth";
import { prepareDossierGcfo0182PdfData } from "@/lib/pdf/prepare-gcfo0182-data";
import Gcfo0182Document from "@/lib/pdf/Gcfo0182Document";
import { renderPdf } from "@/lib/pdf/render-pdf";

export const runtime = "nodejs";

// GCFO0182 form of a dossier created internally, generated live from its data. Internal users only.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ dossierId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "internal") return new Response("No autenticado", { status: 401 });
  const id = Number((await params).dossierId);
  if (!Number.isSafeInteger(id) || id <= 0) return new Response("Expediente no encontrado", { status: 404 });
  try {
    const buffer = await renderPdf(React.createElement(Gcfo0182Document, { d: await prepareDossierGcfo0182PdfData(id) }));
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=GCFO0182.pdf", "Cache-Control": "no-store" } });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Error generando el PDF", { status: 400 });
  }
}
