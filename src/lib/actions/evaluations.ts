"use server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { EntityManager } from "typeorm";
import { getDb } from "@/lib/db";
import { insertReturningId } from "@/lib/db-helpers";
import { saveFile } from "@/lib/files";
import { attempt } from "@/lib/result";
import { todayIso } from "@/lib/dates";
import { detectFileType, MAX_UPLOAD_BYTES } from "@/lib/file-sniff";
import { DOSSIER_STATUS, EVAL_METHOD, EVAL_RESULT, INSTRUMENT_CATEGORY } from "@/lib/constants";
import { REQUIRED_SELECTED, type Prueba } from "@/lib/evaluation-data";
import {
  evaluateComparative,
  evaluateFixedReference,
  type ComparativeData,
  type EvaluationData,
  type FixedReferenceData,
  type ResultKey,
} from "@/lib/evaluation-score";
import { Evaluation, type EvaluationEntity } from "@/entities/Evaluation";
import { Product } from "@/entities/Product";
import { ProductType } from "@/entities/ProductType";
import { ProductVariant } from "@/entities/ProductVariant";
import { ReferenceVariant } from "@/entities/ReferenceVariant";
import { ProductTracking } from "@/entities/ProductTracking";
import { Dossier } from "@/entities/Dossier";
import { Client } from "@/entities/Client";
import { Certificate } from "@/entities/Certificate";
import { Instrument } from "@/entities/Instrument";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireInternal, text, validId, type InternalSession } from "./_guards";
import { internalUserNames } from "./_users";

// ---------- helpers (not exported: "use server" files may only export async functions) ----------

const RESULT_KEY: Record<number, ResultKey> = { 1: "CONFORME", 2: "NO_CONFORME" };
const COMPARATIVE_GROUPS = ["withoutDevice", "withDevice"] as const;

type Computed = {
  suggested: ResultKey | null;
  result: ResultKey;
  overridden: boolean;
  overrideReason: string | null;
  score: number | null;
  warrantyYears: number | null;
  finalizedAt: string;
};
type StoredData = EvaluationData & { computed?: Computed };

function parseData(raw: unknown): StoredData {
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== "object") throw new Error("Los datos de la evaluación están dañados.");
  const d = obj as StoredData;
  if (d.method === "COMPARATIVE") {
    d.withoutDevice ??= { pruebas: [] };
    d.withDevice ??= { pruebas: [] };
  } else if (d.method === "FIXED_REFERENCE") {
    d.variants ??= {};
  } else {
    throw new Error("Los datos de la evaluación están dañados.");
  }
  return d;
}

function pruebasOf(data: EvaluationData, group: string): Prueba[] {
  if (data.method === "COMPARATIVE") {
    if (!(COMPARATIVE_GROUPS as readonly string[]).includes(group)) throw new Error("Grupo de pruebas inválido.");
    return data[group as (typeof COMPARATIVE_GROUPS)[number]].pruebas;
  }
  const v = Object.prototype.hasOwnProperty.call(data.variants, group) ? data.variants[group] : undefined;
  if (!v) throw new Error("Variante inválida.");
  return v.pruebas;
}

function setPruebas(data: EvaluationData, group: string, list: Prueba[]) {
  pruebasOf(data, group); // validates the group
  if (data.method === "COMPARATIVE") data[group as (typeof COMPARATIVE_GROUPS)[number]].pruebas = list;
  else data.variants[group].pruebas = list;
}

function allPruebas(data: EvaluationData): Prueba[] {
  return data.method === "COMPARATIVE"
    ? [...data.withoutDevice.pruebas, ...data.withDevice.pruebas]
    : Object.values(data.variants).flatMap((v) => v.pruebas);
}

function num(v: unknown, label: string, opts: { required?: boolean; max?: number; integer?: boolean } = {}): number | null {
  if (v === null || v === undefined || v === "") {
    if (opts.required) throw new Error(`${label} es obligatorio.`);
    return null;
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > (opts.max ?? 100000)) throw new Error(`${label} no es válido.`);
  if (opts.integer && !Number.isInteger(v)) throw new Error(`${label} debe ser un número entero.`);
  return v;
}

async function lockEvaluation(m: EntityManager, id: number): Promise<EvaluationEntity> {
  const evId = validId(id, "Evaluación");
  // Raw FOR UPDATE: TypeORM's findOne adds FETCH FIRST, which Oracle 12c rejects together with FOR UPDATE.
  await m.query("SELECT NCODEVALUACION FROM AQUA_EVALUACION WHERE NCODEVALUACION = :1 FOR UPDATE", [evId]);
  const ev = await m.getRepository(Evaluation).findOne({ where: { id: evId } });
  if (!ev || ev.status !== 1) throw new Error("Evaluación no encontrada.");
  return ev;
}

async function assertNoCertificate(m: EntityManager, ev: EvaluationEntity) {
  const cert = await m.getRepository(Certificate).findOne({ where: { evaluationId: ev.id } });
  if (cert) throw new Error("Esta evaluación ya tiene certificado emitido y no se puede modificar.");
}

async function loadProductContext(m: EntityManager, productId: number) {
  const product = await m.getRepository(Product).findOne({ where: { id: productId } });
  if (!product || product.status !== 1) throw new Error("Producto no encontrado o inactivo.");
  const dossier = await m.getRepository(Dossier).findOne({ where: { id: product.dossierId } });
  if (!dossier || dossier.status !== DOSSIER_STATUS.OPEN) throw new Error("El expediente no está abierto.");
  return { product, dossier };
}

function revalidateEvaluation(dossierId: number, productId: number, evaluationId?: number) {
  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath(`/dossiers/${dossierId}/products/${productId}`);
  if (evaluationId) revalidatePath(`/dossiers/${dossierId}/products/${productId}/evaluations/${evaluationId}`);
}

/** Lock the evaluation, check it is editable, let `fn` change its data, and save. */
async function mutateData(evaluationId: number, s: InternalSession, fn: (data: StoredData, ctx: { product: { id: number } }) => void) {
  const db = await getDb();
  const { ev, dossierId } = await db.transaction(async (m) => {
    const ev = await lockEvaluation(m, evaluationId);
    await assertNoCertificate(m, ev);
    const { product, dossier } = await loadProductContext(m, ev.productId);
    const data = parseData(ev.data);
    fn(data, { product });
    await m.getRepository(Evaluation).update({ id: ev.id }, { data: JSON.stringify(data), ...updateAudit(s.audit) });
    return { ev, dossierId: dossier.id };
  });
  revalidateEvaluation(dossierId, ev.productId, ev.id);
}

// ---------- reads ----------

export type EvaluationListItem = {
  id: number;
  method: "COMPARATIVE" | "FIXED_REFERENCE";
  result: ResultKey | null;
  selectedForCertificate: boolean;
  evaluatedAt: string;
  evaluatorName: string;
  pruebaCount: number;
  hasCertificate: boolean;
};

export async function getProductForEvaluation(productId: number) {
  await requireInternal();
  const db = await getDb();
  const product = await db.getRepository(Product).findOne({ where: { id: validId(productId, "Producto") } });
  if (!product || product.status !== 1) return null;
  const [type, dossier, evaluations, certificate, links, variants] = await Promise.all([
    db.getRepository(ProductType).findOne({ where: { id: product.productTypeId } }),
    db.getRepository(Dossier).findOne({ where: { id: product.dossierId } }),
    db.getRepository(Evaluation).find({ where: { productId: product.id, status: 1 }, order: { id: "DESC" } }),
    db.getRepository(Certificate).findOne({ where: { productId: product.id } }),
    db.getRepository(ProductVariant).find({ where: { productId: product.id, status: 1 } }),
    db.getRepository(ReferenceVariant).find(),
  ]);
  if (!dossier || !type) return null;
  const client = await db.getRepository(Client).findOne({ where: { id: dossier.clientId } });
  const names = await internalUserNames(evaluations.map((e) => e.evaluatorUserId));
  const label = new Map(variants.map((v) => [v.id, v.label]));
  const items: EvaluationListItem[] = evaluations.map((e) => {
    let pruebaCount = 0;
    try { pruebaCount = allPruebas(parseData(e.data)).length; } catch { /* damaged data: show 0 */ }
    return {
      id: e.id,
      method: e.method === EVAL_METHOD.COMPARATIVE ? "COMPARATIVE" : "FIXED_REFERENCE",
      result: e.result ? RESULT_KEY[e.result] ?? null : null,
      selectedForCertificate: e.selectedForCertificate === 1,
      evaluatedAt: String(e.evaluatedAt).slice(0, 10),
      evaluatorName: names.get(e.evaluatorUserId) ?? "—",
      pruebaCount,
      hasCertificate: certificate?.evaluationId === e.id,
    };
  });
  return {
    product: {
      id: product.id,
      code: product.code,
      description: product.description,
      typeName: type.name,
      method: type.method === EVAL_METHOD.COMPARATIVE ? ("COMPARATIVE" as const) : ("FIXED_REFERENCE" as const),
      warrantyYears: product.warrantyYears,
      currentStage: product.currentStage,
      photoPath: product.photoPath,
      variantLabels: links.map((l) => label.get(l.variantId) ?? "—"),
    },
    dossier: { id: dossier.id, code: dossier.code, open: dossier.status === DOSSIER_STATUS.OPEN },
    clientName: client?.businessName ?? "—",
    certificate: certificate ? { id: certificate.id, number: certificate.certificateNumber } : null,
    evaluations: items,
  };
}
export type ProductForEvaluation = NonNullable<Awaited<ReturnType<typeof getProductForEvaluation>>>;

export async function getEvaluationById(evaluationId: number) {
  await requireInternal();
  const db = await getDb();
  const ev = await db.getRepository(Evaluation).findOne({ where: { id: validId(evaluationId, "Evaluación") } });
  if (!ev || ev.status !== 1) return null;
  const [product, certificate] = await Promise.all([
    db.getRepository(Product).findOne({ where: { id: ev.productId } }),
    db.getRepository(Certificate).findOne({ where: { productId: ev.productId } }),
  ]);
  if (!product) return null;
  const [type, dossier] = await Promise.all([
    db.getRepository(ProductType).findOne({ where: { id: product.productTypeId } }),
    db.getRepository(Dossier).findOne({ where: { id: product.dossierId } }),
  ]);
  const names = await internalUserNames([ev.evaluatorUserId]);
  const data = parseData(ev.data);
  const { computed, ...pure } = data;
  return {
    id: ev.id,
    method: pure.method,
    data: pure as EvaluationData,
    computed: computed ?? null,
    result: ev.result ? RESULT_KEY[ev.result] ?? null : null,
    selectedForCertificate: ev.selectedForCertificate === 1,
    photoPath: ev.photoPath,
    evaluatedAt: String(ev.evaluatedAt).slice(0, 10),
    evaluatorName: names.get(ev.evaluatorUserId) ?? "—",
    meterInstrumentId: ev.meterInstrumentId,
    pressureGaugeInstrumentId: ev.pressureGaugeInstrumentId,
    stopwatchInstrumentId: ev.stopwatchInstrumentId,
    // Certificate for THIS evaluation (locks editing) vs. any certificate on the product (locks re-selecting).
    certificate: certificate && certificate.evaluationId === ev.id ? { id: certificate.id, number: certificate.certificateNumber } : null,
    productHasCertificate: !!certificate,
    product: {
      id: product.id,
      code: product.code,
      description: product.description,
      typeName: type?.name ?? "—",
      warrantyYears: product.warrantyYears,
      photoPath: product.photoPath,
    },
    dossier: { id: product.dossierId, code: dossier?.code ?? "—", open: dossier?.status === DOSSIER_STATUS.OPEN },
  };
}
export type EvaluationDetail = NonNullable<Awaited<ReturnType<typeof getEvaluationById>>>;

// ---------- writes ----------

async function readPhoto(formData: FormData, s: InternalSession): Promise<string | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("La foto supera 10 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const real = detectFileType(bytes); // trust the content, not the name
  if (real !== "jpg" && real !== "png") throw new Error("La foto debe ser JPG o PNG.");
  return saveFile({ group: "EVALFOTO", data: bytes, ext: real, createdBy: s.audit });
}

/** Step 1: creates the empty evaluation (date + evaluator automatic, optional photo). Pruebas are added on the detail page. */
export async function createEvaluationShell(formData: FormData) {
  return attempt(async () => {
    const s = await requireInternal();
    const productId = validId(Number(formData.get("productId")), "Producto");
    const photoPath = await readPhoto(formData, s);
    const db = await getDb();
    const { id, dossierId } = await db.transaction(async (m) => {
      const { product, dossier } = await loadProductContext(m, productId);
      if (product.currentStage < 2) throw new Error("El producto aún no fue recibido.");
      const cert = await m.getRepository(Certificate).findOne({ where: { productId } });
      if (cert) throw new Error("El producto ya tiene certificado emitido.");
      const type = await m.getRepository(ProductType).findOne({ where: { id: product.productTypeId } });
      if (!type) throw new Error("Tipo de producto no encontrado.");

      let data: EvaluationData;
      if (type.method === EVAL_METHOD.COMPARATIVE) {
        data = { method: "COMPARATIVE", withoutDevice: { pruebas: [] }, withDevice: { pruebas: [] } };
      } else {
        // One group per reference variant chosen for the product; snapshot of label/volume/flush rule.
        const links = await m.getRepository(ProductVariant).find({ where: { productId, status: 1 } });
        if (!links.length) throw new Error("El producto no tiene variantes de referencia (ej. Líquido / Sólido). Edite el producto primero.");
        const variants: FixedReferenceData["variants"] = {};
        for (const l of links) {
          const v = await m.getRepository(ReferenceVariant).findOne({ where: { id: l.variantId } });
          if (!v) continue;
          variants[String(v.id)] = {
            label: v.label,
            referenceVolumeL: Number(v.referenceValue),
            requiresFlushTest: v.requiresFlushTest === 1,
            pruebas: [],
          };
        }
        data = { method: "FIXED_REFERENCE", variants };
      }

      const id = await insertReturningId(m, Evaluation, {
        productId,
        method: type.method,
        data: JSON.stringify(data),
        result: null,
        selectedForCertificate: 0,
        photoPath,
        evaluatorUserId: s.userId,
        evaluatedAt: todayIso(),
        ...createAudit(s.audit),
      });
      const previous = await m.getRepository(Evaluation).count({ where: { productId, status: 1 } });
      if (previous <= 1) {
        await insertReturningId(m, ProductTracking, {
          productId,
          stage: 2,
          occurredAt: todayIso(),
          userId: s.userId,
          notes: "Evaluación iniciada",
          ...createAudit(s.audit),
        });
      }
      return { id, dossierId: dossier.id };
    });
    revalidateEvaluation(dossierId, productId);
    return { id, dossierId };
  });
}

export async function addPrueba(input: {
  evaluationId: number;
  group: string; // "withoutDevice" | "withDevice" (comparative) or a reference variant id (fixed reference)
  prueba: { li: number | null; lf: number | null; tiempo: number | null; presion: number | null; ballsCleared?: number | null };
}) {
  return attempt(async () => {
    const s = await requireInternal();
    await mutateData(input.evaluationId, s, (data) => {
      const li = num(input.prueba.li, "El nivel inicial", { required: true })!;
      const lf = num(input.prueba.lf, "El nivel final", { required: true })!;
      if (lf < li) throw new Error("El nivel final no puede ser menor que el inicial.");
      const isComparative = data.method === "COMPARATIVE";
      const tiempo = num(input.prueba.tiempo, "El tiempo", { required: isComparative, max: 100000 });
      const presion = num(input.prueba.presion, "La presión", { max: 100 });
      let ballsCleared: number | null = null;
      if (data.method === "FIXED_REFERENCE") {
        pruebasOf(data, input.group); // validates the variant
        const needs = data.variants[input.group].requiresFlushTest;
        ballsCleared = num(input.prueba.ballsCleared, "Las bolas despejadas", { required: needs, max: 100, integer: true });
        if (!needs) ballsCleared = null;
      }
      const list = pruebasOf(data, input.group);
      if (list.length >= 50) throw new Error("Demasiadas pruebas en este grupo.");
      const prueba: Prueba = { id: randomUUID(), li, lf, tiempo: isComparative ? tiempo : null, presion, selected: false, createdAt: new Date().toISOString() };
      if (data.method === "FIXED_REFERENCE") prueba.ballsCleared = ballsCleared;
      setPruebas(data, input.group, [...list, prueba]);
    });
  });
}

export async function togglePruebaSelected(input: { evaluationId: number; group: string; pruebaId: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    await mutateData(input.evaluationId, s, (data) => {
      const list = pruebasOf(data, input.group);
      const p = list.find((x) => x.id === input.pruebaId);
      if (!p) throw new Error("Prueba no encontrada.");
      if (!p.selected && list.filter((x) => x.selected).length >= REQUIRED_SELECTED) {
        throw new Error(`Ya hay ${REQUIRED_SELECTED} pruebas seleccionadas. Deseleccione una primero.`);
      }
      p.selected = !p.selected;
      delete data.computed; // any earlier result is stale once the selection changes
    });
    await invalidateResult(input.evaluationId, s);
  });
}

export async function deletePrueba(input: { evaluationId: number; group: string; pruebaId: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    await mutateData(input.evaluationId, s, (data) => {
      const list = pruebasOf(data, input.group);
      if (!list.some((x) => x.id === input.pruebaId)) throw new Error("Prueba no encontrada.");
      setPruebas(data, input.group, list.filter((x) => x.id !== input.pruebaId));
      delete data.computed;
    });
    await invalidateResult(input.evaluationId, s);
  });
}

/** Changing the selected/available pruebas voids a previous result: it must be finalized again. */
async function invalidateResult(evaluationId: number, s: InternalSession) {
  const db = await getDb();
  await db.getRepository(Evaluation).update(
    { id: evaluationId },
    { result: null, selectedForCertificate: 0, meterInstrumentId: null, pressureGaugeInstrumentId: null, stopwatchInstrumentId: null, ...updateAudit(s.audit) },
  );
}

async function checkInstrument(m: EntityManager, id: unknown, category: number, label: string): Promise<number> {
  const n = validId(Number(id), label);
  const i = await m.getRepository(Instrument).findOne({ where: { id: n } });
  if (!i || i.status !== 1 || i.category !== category) throw new Error(`${label} no es válido o está inactivo.`);
  return n;
}

/**
 * Locks in the result. The server recomputes everything from the stored pruebas; the browser only
 * says whether the evaluator OVERRIDES the suggested result (which then needs a written reason).
 */
export async function finalizeEvaluation(input: {
  evaluationId: number;
  result?: ResultKey; // omit to accept the suggested result
  overrideReason?: string;
  meterInstrumentId: number;
  pressureGaugeInstrumentId: number;
  stopwatchInstrumentId?: number | null; // required for COMPARATIVE
  referenceVolumes?: Record<string, number>; // fixed reference: volumes the evaluator adjusted (recorded in data)
}) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const { ev, dossierId } = await db.transaction(async (m) => {
      const ev = await lockEvaluation(m, input.evaluationId);
      await assertNoCertificate(m, ev);
      const { product, dossier } = await loadProductContext(m, ev.productId);
      const data = parseData(ev.data);
      const warrantyYears = product.warrantyYears;
      if (warrantyYears === null || warrantyYears === undefined) throw new Error("Registre los años de garantía del producto antes de finalizar la evaluación.");

      let suggested: ResultKey | null;
      let score: number | null;
      if (data.method === "COMPARATIVE") {
        const r = evaluateComparative(data as ComparativeData, warrantyYears);
        if (!r.ready) throw new Error(`Seleccione ${REQUIRED_SELECTED} pruebas con y sin dispositivo.`);
        suggested = r.suggested;
        score = r.score.total;
      } else {
        const fr = data as FixedReferenceData;
        const volumes: Record<string, number> = {};
        for (const [id, vol] of Object.entries(input.referenceVolumes ?? {})) {
          if (!Object.prototype.hasOwnProperty.call(fr.variants, id)) throw new Error("Variante inválida.");
          if (typeof vol !== "number" || !Number.isFinite(vol) || vol <= 0 || vol > 100) throw new Error("Volumen de referencia inválido.");
          volumes[id] = vol;
          fr.variants[id].referenceVolumeL = vol; // recorded with the evaluation
        }
        const r = evaluateFixedReference(fr, warrantyYears);
        if (!r.allReady) throw new Error(`Seleccione ${REQUIRED_SELECTED} pruebas en cada variante.`);
        suggested = r.suggested;
        score = r.score.total;
      }
      if (!suggested) throw new Error("No se puede calcular el resultado: faltan datos.");

      const result = input.result ?? suggested;
      if (result !== "CONFORME" && result !== "NO_CONFORME") throw new Error("Resultado inválido.");
      const overridden = result !== suggested;
      const reason = text(input.overrideReason, "El motivo", 500);
      if (overridden && (!reason || reason.length < 5)) throw new Error("Indique el motivo para cambiar el resultado sugerido.");

      const meterId = await checkInstrument(m, input.meterInstrumentId, INSTRUMENT_CATEGORY.WATER_METER, "El medidor de agua");
      const gaugeId = await checkInstrument(m, input.pressureGaugeInstrumentId, INSTRUMENT_CATEGORY.PRESSURE_GAUGE, "El manómetro");
      let stopwatchId: number | null = null;
      if (data.method === "COMPARATIVE") {
        stopwatchId = await checkInstrument(m, input.stopwatchInstrumentId, INSTRUMENT_CATEGORY.STOPWATCH, "El cronómetro");
      }

      data.computed = {
        suggested,
        result,
        overridden,
        overrideReason: overridden ? reason : null,
        score,
        warrantyYears: Number(warrantyYears),
        finalizedAt: new Date().toISOString(),
      };
      await m.getRepository(Evaluation).update(
        { id: ev.id },
        {
          data: JSON.stringify(data),
          result: EVAL_RESULT[result],
          meterInstrumentId: meterId,
          pressureGaugeInstrumentId: gaugeId,
          stopwatchInstrumentId: stopwatchId,
          ...updateAudit(s.audit),
        },
      );
      return { ev, dossierId: dossier.id };
    });
    revalidateEvaluation(dossierId, ev.productId, ev.id);
  });
}

/** Replace (or remove, with remove=1) the evaluation photo. The previous file is kept on disk (audit trail). */
export async function updateEvaluationPhoto(evaluationId: number, formData: FormData) {
  return attempt(async () => {
    const s = await requireInternal();
    const remove = formData.get("remove") === "1";
    const photoPath = remove ? null : await readPhoto(formData, s);
    if (!remove && !photoPath) throw new Error("Seleccione una foto.");
    const db = await getDb();
    const { ev, dossierId } = await db.transaction(async (m) => {
      const ev = await lockEvaluation(m, evaluationId);
      await assertNoCertificate(m, ev);
      const { dossier } = await loadProductContext(m, ev.productId);
      await m.getRepository(Evaluation).update({ id: ev.id }, { photoPath, ...updateAudit(s.audit) });
      return { ev, dossierId: dossier.id };
    });
    revalidateEvaluation(dossierId, ev.productId, ev.id);
    return { path: photoPath };
  });
}

/** Marks this evaluation as the one the certificate will be issued from (only one per product). */
export async function selectEvaluationForCertificate(evaluationId: number) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const { ev, dossierId } = await db.transaction(async (m) => {
      const ev = await lockEvaluation(m, evaluationId);
      if (!ev.result) throw new Error("Finalice la evaluación antes de elegirla para el certificado.");
      const { dossier } = await loadProductContext(m, ev.productId);
      const cert = await m.getRepository(Certificate).findOne({ where: { productId: ev.productId } });
      if (cert) throw new Error("El producto ya tiene certificado emitido.");
      await m.getRepository(Evaluation).update({ productId: ev.productId }, { selectedForCertificate: 0, ...updateAudit(s.audit) });
      await m.getRepository(Evaluation).update({ id: ev.id }, { selectedForCertificate: 1, ...updateAudit(s.audit) });
      return { ev, dossierId: dossier.id };
    });
    revalidateEvaluation(dossierId, ev.productId, ev.id);
  });
}

/** Logical delete (NESTADO = 2). Only allowed while it has no pruebas and no certificate. */
export async function deleteEvaluation(evaluationId: number) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const { ev, dossierId } = await db.transaction(async (m) => {
      const ev = await lockEvaluation(m, evaluationId);
      await assertNoCertificate(m, ev);
      const { dossier } = await loadProductContext(m, ev.productId);
      if (allPruebas(parseData(ev.data)).length > 0) throw new Error("No se puede eliminar: la evaluación tiene pruebas registradas. Elimine las pruebas primero.");
      await m.getRepository(Evaluation).update({ id: ev.id }, { status: 2, selectedForCertificate: 0, ...updateAudit(s.audit) });
      return { ev, dossierId: dossier.id };
    });
    revalidateEvaluation(dossierId, ev.productId);
  });
}
