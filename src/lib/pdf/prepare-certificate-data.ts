// Builds the data the certificate PDF templates need, straight from Oracle.
// Server only. The numbers are RECOMPUTED from the saved pruebas (same code as the evaluation screen).
import { readFile } from "fs/promises";
import path from "path";
import { getDb } from "@/lib/db";
import { readStoredFile } from "@/lib/files";
import { isoToDate, todayIso } from "@/lib/dates";
import { EVAL_METHOD } from "@/lib/constants";
import { resolveBracket, SAVINGS_SCORE_TABLE, WARRANTY_SCORE_TABLE, EFFICIENCY_SCORE_TABLE, type ScoreBracket } from "@/lib/certification-criteria";
import { FIXED_REF_SAVINGS_TABLE, FIXED_REF_FLUSH_TABLE } from "@/lib/fixed-reference-criteria";
import { evaluateComparative, evaluateFixedReference, type ComparativeData, type FixedReferenceData } from "@/lib/evaluation-score";
import { Evaluation, type EvaluationEntity } from "@/entities/Evaluation";
import { Product, type ProductEntity } from "@/entities/Product";
import { Dossier } from "@/entities/Dossier";
import { Client } from "@/entities/Client";
import { Site } from "@/entities/Site";
import { Brand } from "@/entities/Brand";
import { Manufacturer } from "@/entities/Manufacturer";
import { OriginCountry } from "@/entities/OriginCountry";
import { Instrument } from "@/entities/Instrument";
import { Calibration } from "@/entities/Calibration";
import type { CertificatePdfData } from "./CertificateDocument";
import type { FixedReferencePdfData } from "./FixedReferenceCertificateDocument";
import type { TrazabilidadRow } from "./shared";

export const VALIDITY_NOTE =
  "Cinco (05) años contados desde la fecha de emisión del presente certificado o hasta que el producto sufra alguna modificación en su diseño u operatividad.";

type Opts = { certificateNumber: string; isDraft: boolean; issuedAt?: Date };

async function traceRow(label: string, instrumentId: number | null): Promise<TrazabilidadRow> {
  const db = await getDb();
  if (!instrumentId) return { label, code: null, verificationDocumentName: null, calibratedAt: null };
  const [inst, cals] = await Promise.all([
    db.getRepository(Instrument).findOne({ where: { id: instrumentId } }),
    db.getRepository(Calibration).find({ where: { instrumentId, status: 1 }, order: { calibratedAt: "DESC", id: "DESC" }, take: 1 }),
  ]);
  const cal = cals[0];
  return {
    label,
    code: inst?.code ?? null,
    verificationDocumentName: cal?.verificationDocument ?? null,
    calibratedAt: cal ? isoToDate(cal.calibratedAt) : null,
  };
}

async function loadLogos() {
  const readLogo = async (filename: string): Promise<Buffer | null> => {
    try {
      return await readFile(path.join(process.cwd(), "public", "logos", filename));
    } catch {
      return null;
    }
  };
  const [sedapalLogo, saverLogo] = await Promise.all([readLogo("logo-sedapal.png"), readLogo("logo-saver.png")]);
  return { sedapalLogo, saverLogo };
}

async function loadPhoto(rel: string | null): Promise<Buffer | null> {
  if (!rel) return null;
  try {
    return await readStoredFile(rel);
  } catch {
    return null;
  }
}

/** Everything both certificate types share. */
async function loadBase(evaluationId: number, expectedMethod: number) {
  const db = await getDb();
  const evaluation = await db.getRepository(Evaluation).findOne({ where: { id: evaluationId } });
  if (!evaluation || evaluation.status !== 1) throw new Error("Evaluación no encontrada.");
  if (evaluation.method !== expectedMethod) throw new Error("El método de la evaluación no corresponde a este tipo de certificado.");
  if (!evaluation.result) throw new Error("La evaluación debe estar finalizada antes de generar el certificado.");
  const product = await db.getRepository(Product).findOne({ where: { id: evaluation.productId } });
  if (!product) throw new Error("Producto no encontrado.");
  const dossier = await db.getRepository(Dossier).findOne({ where: { id: product.dossierId } });
  if (!dossier) throw new Error("Expediente no encontrado.");
  const [client, site, brand, manufacturer, country, logos, photo] = await Promise.all([
    db.getRepository(Client).findOne({ where: { id: dossier.clientId } }),
    db.getRepository(Site).findOne({ where: { id: dossier.siteId } }),
    product.brandId ? db.getRepository(Brand).findOne({ where: { id: product.brandId } }) : null,
    product.manufacturerId ? db.getRepository(Manufacturer).findOne({ where: { id: product.manufacturerId } }) : null,
    product.originCountryId ? db.getRepository(OriginCountry).findOne({ where: { id: product.originCountryId } }) : null,
    loadLogos(),
    loadPhoto(evaluation.photoPath || product.photoPath),
  ]);
  const raw = typeof evaluation.data === "string" ? JSON.parse(evaluation.data) : evaluation.data;
  return { evaluation, product, client, site, brand, manufacturer, country, logos, photo, raw };
}

function productBlock(product: ProductEntity, brand: { name: string } | null | undefined, manufacturer: { name: string } | null | undefined, country: { name: string } | null | undefined) {
  return {
    code: product.code,
    description: product.description,
    brand: brand?.name ?? null,
    manufacturer: manufacturer?.name ?? null,
    originCountry: country?.name ?? null,
    use: product.usage,
    warrantyYears: product.warrantyYears,
  };
}

function warrantyOf(evaluation: EvaluationEntity, product: ProductEntity, raw: { computed?: { warrantyYears?: number } }): number | null {
  // The warranty used when the result was locked in, so the certificate matches the stored result.
  return raw.computed?.warrantyYears ?? product.warrantyYears;
}

export async function prepareCertificateData(evaluationId: number, opts: Opts): Promise<CertificatePdfData> {
  const b = await loadBase(evaluationId, EVAL_METHOD.COMPARATIVE);
  const data = b.raw as ComparativeData & { computed?: { warrantyYears?: number; overridden?: boolean; overrideReason?: string | null } };
  const warranty = warrantyOf(b.evaluation, b.product, data);
  const r = evaluateComparative(data, warranty);
  const [meter, gauge, stopwatch] = await Promise.all([
    traceRow("Medidor de agua", b.evaluation.meterInstrumentId),
    traceRow("Manómetro", b.evaluation.pressureGaugeInstrumentId),
    traceRow("Cronómetro", b.evaluation.stopwatchInstrumentId),
  ]);
  return {
    certificateNumber: opts.certificateNumber,
    isDraft: opts.isDraft,
    issuedAt: opts.issuedAt || isoToDate(todayIso()),
    client: { businessName: b.client?.businessName ?? "—", address: b.site?.address ?? "—" },
    product: productBlock({ ...b.product, warrantyYears: warranty }, b.brand, b.manufacturer, b.country),
    evaluatedAt: isoToDate(b.evaluation.evaluatedAt),
    photoBuffer: b.photo,
    sedapalLogo: b.logos.sedapalLogo,
    saverLogo: b.logos.saverLogo,
    data: {
      withoutDevice: { avgVolumeL: r.withoutAvg.avgVolume, avgTiempoS: r.withoutAvg.avgTiempo },
      withDevice: { avgVolumeL: r.withAvg.avgVolume, avgTiempoS: r.withAvg.avgTiempo },
      percentOfVolume: r.percentOfVolume,
      savingsPercent: r.savingsPercent,
      timePercentChange: r.timePercentChange,
      score: {
        savingsPoints: r.score.savings?.points ?? 0,
        warrantyPoints: r.score.warranty?.points ?? 0,
        efficiencyPoints: r.score.efficiency?.points ?? 0,
        total: r.score.total,
      },
    },
    result: b.evaluation.result === 1 ? "CONFORME" : "NO_CONFORME",
    overrideReason: data.computed?.overridden ? data.computed.overrideReason ?? null : null,
    activeBrackets: {
      savings: resolveBracket(SAVINGS_SCORE_TABLE, r.savingsPercent),
      warranty: resolveBracket(WARRANTY_SCORE_TABLE, warranty),
      efficiency: resolveBracket(EFFICIENCY_SCORE_TABLE, r.timePercentChange),
    },
    validityNote: VALIDITY_NOTE,
    trazabilidad: [meter, gauge, stopwatch],
  };
}

export async function prepareFixedReferenceCertificateData(evaluationId: number, opts: Opts): Promise<FixedReferencePdfData> {
  const b = await loadBase(evaluationId, EVAL_METHOD.FIXED_REFERENCE);
  const data = b.raw as FixedReferenceData & { computed?: { warrantyYears?: number; overridden?: boolean; overrideReason?: string | null } };
  const warranty = warrantyOf(b.evaluation, b.product, data);
  const r = evaluateFixedReference(data, warranty);
  const variants = Object.values(r.states).map((s) => ({
    label: s.label,
    referenceVolumeL: s.referenceVolumeL,
    avgVolumeL: s.avgVolumeL,
    compliant: s.compliant,
  }));

  // Same dynamic Tabla 1 labels (with the real variant names) as the evaluation screen.
  const names = variants.map((v) => v.label).join(", ");
  const savingsTable: ScoreBracket[] =
    variants.length <= 1
      ? [
          { ...FIXED_REF_SAVINGS_TABLE[0], label: `${names || "la variante"} supera su volumen de referencia` },
          { ...FIXED_REF_SAVINGS_TABLE[1], label: `${names || "la variante"} cumple su volumen de referencia` },
        ]
      : [
          { ...FIXED_REF_SAVINGS_TABLE[0], label: `Al menos una variante (${names}) supera su volumen de referencia` },
          { ...FIXED_REF_SAVINGS_TABLE[1], label: `Todas las variantes (${names}) cumplen su volumen de referencia` },
        ];

  const score = {
    savingsPoints: r.score.savings?.points ?? 0,
    warrantyPoints: r.score.warranty?.points ?? 0,
    flushPoints: r.score.flush?.points ?? 0,
    total: r.score.total,
  };
  const [meter, gauge] = await Promise.all([
    traceRow("Medidor de agua", b.evaluation.meterInstrumentId),
    traceRow("Manómetro", b.evaluation.pressureGaugeInstrumentId),
  ]);
  return {
    certificateNumber: opts.certificateNumber,
    isDraft: opts.isDraft,
    issuedAt: opts.issuedAt || isoToDate(todayIso()),
    client: { businessName: b.client?.businessName ?? "—", address: b.site?.address ?? "—" },
    product: productBlock({ ...b.product, warrantyYears: warranty }, b.brand, b.manufacturer, b.country),
    evaluatedAt: isoToDate(b.evaluation.evaluatedAt),
    photoBuffer: b.photo,
    sedapalLogo: b.logos.sedapalLogo,
    saverLogo: b.logos.saverLogo,
    variants,
    result: b.evaluation.result === 1 ? "CONFORME" : "NO_CONFORME",
    overrideReason: data.computed?.overridden ? data.computed.overrideReason ?? null : null,
    score,
    activeBrackets: {
      savings: savingsTable.find((x) => x.points === score.savingsPoints) ?? null,
      warranty: resolveBracket(WARRANTY_SCORE_TABLE, warranty),
      flush: FIXED_REF_FLUSH_TABLE.find((x) => x.points === score.flushPoints) ?? null,
    },
    savingsTable,
    flushTable: FIXED_REF_FLUSH_TABLE,
    validityNote: VALIDITY_NOTE,
    trazabilidad: [meter, gauge],
  };
}
