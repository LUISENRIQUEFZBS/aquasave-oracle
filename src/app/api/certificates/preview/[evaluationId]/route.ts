import { NextRequest } from "next/server";
import React from "react";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { EVAL_METHOD } from "@/lib/constants";
import { Evaluation } from "@/entities/Evaluation";
import CertificateDocument from "@/lib/pdf/CertificateDocument";
import FixedReferenceCertificateDocument from "@/lib/pdf/FixedReferenceCertificateDocument";
import { renderPdf } from "@/lib/pdf/render-pdf";
import { prepareCertificateData, prepareFixedReferenceCertificateData } from "@/lib/pdf/prepare-certificate-data";

export const runtime = "nodejs";

// DRAFT certificate (watermarked number, nothing is saved). Internal users only.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ evaluationId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "internal") return new Response("No autenticado", { status: 401 });

  const { evaluationId } = await params;
  const id = Number(evaluationId);
  if (!Number.isSafeInteger(id) || id <= 0) return new Response("Evaluación no encontrada", { status: 404 });

  try {
    const db = await getDb();
    const evaluation = await db.getRepository(Evaluation).findOne({ where: { id } });
    if (!evaluation || evaluation.status !== 1) return new Response("Evaluación no encontrada", { status: 404 });

    const opts = { certificateNumber: `PA-XXXX-${new Date().getFullYear()} (VISTA PREVIA)`, isDraft: true };
    const buffer =
      evaluation.method === EVAL_METHOD.COMPARATIVE
        ? await renderPdf(React.createElement(CertificateDocument, { d: await prepareCertificateData(id, opts) }))
        : await renderPdf(React.createElement(FixedReferenceCertificateDocument, { d: await prepareFixedReferenceCertificateData(id, opts) }));

    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=vista-previa-certificado.pdf", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Error generando el PDF", { status: 400 });
  }
}
