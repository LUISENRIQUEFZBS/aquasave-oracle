"use server";
import React from "react";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { nextSequential, saveFile } from "@/lib/files";
import { attempt } from "@/lib/result";
import { todayIso } from "@/lib/dates";
import { DOSSIER_STATUS, EVAL_METHOD, EVAL_RESULT } from "@/lib/constants";
import { Evaluation } from "@/entities/Evaluation";
import { Product } from "@/entities/Product";
import { Dossier } from "@/entities/Dossier";
import { Certificate } from "@/entities/Certificate";
import { createAudit, updateAudit } from "@/entities/_audit";
import CertificateDocument from "@/lib/pdf/CertificateDocument";
import FixedReferenceCertificateDocument from "@/lib/pdf/FixedReferenceCertificateDocument";
import { renderPdf } from "@/lib/pdf/render-pdf";
import { prepareCertificateData, prepareFixedReferenceCertificateData, VALIDITY_NOTE } from "@/lib/pdf/prepare-certificate-data";
import { requireInternal, validId } from "./_guards";

/**
 * Next official certificate number for the current year, e.g. "PA-0001-2026".
 * Numbers come from AQUA_SECUENCIAL (type "PA", one row per issued number). PROVISIONAL: the real code/format
 * must be confirmed with Eli. To CONTINUE an existing real sequence (the old sample was PA-10460-2026), insert one
 * AQUA_SECUENCIAL row for type 'PA' with NCORRELATIVO = (last used number) before the first emission.
 */
async function nextCertificateCode(createdBy: string): Promise<string> {
  const year = new Date().getFullYear();
  const n = await nextSequential("PA", createdBy, year);
  return `PA-${String(n).padStart(4, "0")}-${year}`;
}

/**
 * Issues the OFFICIAL certificate for a Conforme evaluation: reserves the number, renders the PDF, stores it
 * (never overwritten) and records the certificate. Cannot be undone. One certificate per product.
 */
export async function emitCertificate(evaluationId: number) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const evaluation = await db.getRepository(Evaluation).findOne({ where: { id: validId(evaluationId, "Evaluación") } });
    if (!evaluation || evaluation.status !== 1) throw new Error("Evaluación no encontrada.");
    if (evaluation.result !== EVAL_RESULT.CONFORME) throw new Error("Solo se puede emitir un certificado para evaluaciones Conformes.");
    const product = await db.getRepository(Product).findOne({ where: { id: evaluation.productId } });
    if (!product || product.status !== 1) throw new Error("Producto no encontrado o inactivo.");
    const dossier = await db.getRepository(Dossier).findOne({ where: { id: product.dossierId } });
    if (!dossier || dossier.status !== DOSSIER_STATUS.OPEN) throw new Error("El expediente no está abierto.");
    if (await db.getRepository(Certificate).findOne({ where: { productId: product.id } })) {
      throw new Error("Este producto ya tiene un certificado emitido.");
    }

    const certificateNumber = await nextCertificateCode(s.audit);
    const opts = { certificateNumber, isDraft: false };
    let buffer: Buffer;
    let warrantyYears: number | null;
    if (evaluation.method === EVAL_METHOD.COMPARATIVE) {
      const d = await prepareCertificateData(evaluation.id, opts);
      buffer = await renderPdf(React.createElement(CertificateDocument, { d }));
      warrantyYears = d.product.warrantyYears;
    } else {
      const d = await prepareFixedReferenceCertificateData(evaluation.id, opts);
      buffer = await renderPdf(React.createElement(FixedReferenceCertificateDocument, { d }));
      warrantyYears = d.product.warrantyYears;
    }

    const pdfPath = await saveFile({ group: "CERT", data: buffer, ext: "pdf", createdBy: s.audit });
    try {
      await db.transaction(async (m) => {
        await insertReturningId(m, Certificate, {
          productId: product.id,
          evaluationId: evaluation.id,
          certificateNumber,
          issuedAt: todayIso(),
          warrantyYears,
          validityNote: VALIDITY_NOTE,
          pdfPath,
          ...createAudit(s.audit),
        });
        // This evaluation is now officially the one backing the certificate.
        await m.getRepository(Evaluation).update({ productId: product.id }, { selectedForCertificate: 0, ...updateAudit(s.audit) });
        await m.getRepository(Evaluation).update({ id: evaluation.id }, { selectedForCertificate: 1, ...updateAudit(s.audit) });
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Este producto ya tiene un certificado emitido. Actualice la página.");
      throw err;
    }

    revalidatePath(`/dossiers/${dossier.id}`);
    revalidatePath(`/dossiers/${dossier.id}/products/${product.id}`);
    revalidatePath(`/dossiers/${dossier.id}/products/${product.id}/evaluations/${evaluation.id}`);
    return { certificateNumber, pdfPath };
  });
}
