"use server";
import { In, IsNull, Not } from "typeorm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { attempt } from "@/lib/result";
import { todayIso } from "@/lib/dates";
import { DOSSIER_STATUS, EVAL_RESULT } from "@/lib/constants";
import { Product } from "@/entities/Product";
import { ProductType } from "@/entities/ProductType";
import { Dossier } from "@/entities/Dossier";
import { Client } from "@/entities/Client";
import { Evaluation } from "@/entities/Evaluation";
import { Certificate } from "@/entities/Certificate";
import { Dispatch } from "@/entities/Dispatch";
import { ProductTracking } from "@/entities/ProductTracking";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireInternal, text, validId } from "./_guards";
import { internalUserNames } from "./_users";

export type PendingDispatchItem = {
  id: number;
  code: string;
  description: string;
  dossierId: number;
  dossierCode: string;
  clientName: string;
  typeName: string;
  result: "CONFORME" | "NO_CONFORME";
  certificateNumber: string | null; // a Conforme product without one is flagged, not blocked
  readySince: string; // date of the evaluation, used for first-in-first-out
};

export type DispatchHistoryItem = {
  id: number;
  dispatchedAt: string | null;
  recipientName: string | null;
  exitGuideNumber: string | null;
  notes: string | null;
  dispatchedBy: string | null;
  productCode: string;
  productDescription: string;
  typeName: string;
  dossierId: number;
  dossierCode: string;
  clientName: string;
};

/** Evaluation that represents the product: the one behind the certificate, else the latest finalized one. */
function pickEvaluation<T extends { selectedForCertificate: number; evaluatedAt: string; id: number }>(list: T[]): T | undefined {
  return [...list].sort((a, b) => b.selectedForCertificate - a.selectedForCertificate || b.evaluatedAt.localeCompare(a.evaluatedAt) || b.id - a.id)[0];
}

/**
 * Products ready to hand back: in the open dossier, at the evaluation stage (2), with at least one finalized
 * evaluation. Oldest first (FIFO).
 */
export async function getDispatchQueue(): Promise<PendingDispatchItem[]> {
  await requireInternal();
  const db = await getDb();
  const products = await db.getRepository(Product).find({ where: { currentStage: 2, status: 1 } });
  if (!products.length) return [];
  const productIds = products.map((p) => p.id);
  const dossierIds = [...new Set(products.map((p) => p.dossierId))];
  const [dossiers, evaluations, certificates, types] = await Promise.all([
    db.getRepository(Dossier).find({ where: { id: In(dossierIds), status: DOSSIER_STATUS.OPEN } }),
    db.getRepository(Evaluation).find({ where: { productId: In(productIds), status: 1, result: Not(IsNull()) } }),
    db.getRepository(Certificate).find({ where: { productId: In(productIds) } }),
    db.getRepository(ProductType).find(),
  ]);
  const clients = await db.getRepository(Client).find({ where: { id: In([...new Set(dossiers.map((d) => d.clientId))]) } });

  const items: PendingDispatchItem[] = [];
  for (const p of products) {
    const dossier = dossiers.find((d) => d.id === p.dossierId);
    const ev = pickEvaluation(evaluations.filter((e) => e.productId === p.id));
    if (!dossier || !ev) continue;
    items.push({
      id: p.id,
      code: p.code,
      description: p.description,
      dossierId: dossier.id,
      dossierCode: dossier.code,
      clientName: clients.find((c) => c.id === dossier.clientId)?.businessName ?? "—",
      typeName: types.find((t) => t.id === p.productTypeId)?.name ?? "—",
      result: ev.result === EVAL_RESULT.CONFORME ? "CONFORME" : "NO_CONFORME",
      certificateNumber: certificates.find((c) => c.productId === p.id)?.certificateNumber ?? null,
      readySince: ev.evaluatedAt,
    });
  }
  return items.sort((a, b) => a.readySince.localeCompare(b.readySince) || a.id - b.id);
}

export async function getDispatchHistory(limit = 200): Promise<DispatchHistoryItem[]> {
  await requireInternal();
  const db = await getDb();
  const rows = await db.getRepository(Dispatch).find({ where: { dispatchedAt: Not(IsNull()), status: 1 }, order: { dispatchedAt: "DESC", id: "DESC" }, take: limit });
  if (!rows.length) return [];
  const products = await db.getRepository(Product).find({ where: { id: In(rows.map((r) => r.productId)) } });
  const dossiers = await db.getRepository(Dossier).find({ where: { id: In([...new Set(products.map((p) => p.dossierId))]) } });
  const [clients, types, names] = await Promise.all([
    db.getRepository(Client).find({ where: { id: In([...new Set(dossiers.map((d) => d.clientId))]) } }),
    db.getRepository(ProductType).find(),
    internalUserNames(rows.map((r) => r.dispatcherUserId ?? 0)),
  ]);
  return rows.map((r) => {
    const p = products.find((x) => x.id === r.productId);
    const d = dossiers.find((x) => x.id === p?.dossierId);
    return {
      id: r.id,
      dispatchedAt: r.dispatchedAt,
      recipientName: r.recipientName,
      exitGuideNumber: r.exitGuideNumber,
      notes: r.notes,
      dispatchedBy: r.dispatcherUserId ? names.get(r.dispatcherUserId) ?? null : null,
      productCode: p?.code ?? "—",
      productDescription: p?.description ?? "—",
      typeName: types.find((t) => t.id === p?.productTypeId)?.name ?? "—",
      dossierId: d?.id ?? 0,
      dossierCode: d?.code ?? "—",
      clientName: clients.find((c) => c.id === d?.clientId)?.businessName ?? "—",
    };
  });
}

/**
 * Hands back one or more products (usually every product of one dossier in the same visit).
 * All-or-nothing: each product must still be at stage 2, in an open dossier, with a finalized evaluation.
 * Per product: AQUA_DESPACHO row, stage 3, and a tracking entry.
 */
export async function recordBulkDispatch(input: { productIds: number[]; recipientName: string; exitGuideNumber?: string; notes?: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    const ids = [...new Set((input.productIds ?? []).map((i) => validId(i, "Producto")))];
    if (!ids.length) throw new Error("No hay productos seleccionados.");
    if (ids.length > 100) throw new Error("Máximo 100 productos por despacho.");
    const recipientName = text(input.recipientName, "El nombre de quien recibe", 200, true);
    const exitGuideNumber = text(input.exitGuideNumber, "El N° de guía de salida", 50);
    const notes = text(input.notes, "Las notas", 1000);
    const db = await getDb();
    const when = todayIso();
    const touchedDossiers = new Set<number>();

    try {
      await db.transaction(async (m) => {
        for (const id of ids) {
          // Row lock: two people dispatching the same product at once cannot both succeed.
          await m.query("SELECT NCODPRODUCTO FROM AQUA_PRODUCTO WHERE NCODPRODUCTO = :1 FOR UPDATE", [id]);
          const product = await m.getRepository(Product).findOne({ where: { id } });
          if (!product || product.status !== 1) throw new Error("Un producto seleccionado no existe o está inactivo.");
          if (product.currentStage !== 2) throw new Error(`El producto ${product.code} no está listo para despacho (ya fue despachado o aún no se evalúa).`);
          const dossier = await m.getRepository(Dossier).findOne({ where: { id: product.dossierId } });
          if (!dossier || dossier.status !== DOSSIER_STATUS.OPEN) throw new Error(`El expediente del producto ${product.code} no está abierto.`);
          const finalized = await m.getRepository(Evaluation).count({ where: { productId: id, status: 1, result: Not(IsNull()) } });
          if (!finalized) throw new Error(`El producto ${product.code} no tiene una evaluación finalizada.`);

          const values = { dispatchedAt: when, dispatcherUserId: s.userId, recipientName, exitGuideNumber, notes };
          const existing = await m.getRepository(Dispatch).findOne({ where: { productId: id } });
          if (existing) await m.getRepository(Dispatch).update({ id: existing.id }, { ...values, status: 1, ...updateAudit(s.audit) });
          else await insertReturningId(m, Dispatch, { productId: id, ...values, ...createAudit(s.audit) });

          await insertReturningId(m, ProductTracking, { productId: id, stage: 3, occurredAt: when, userId: s.userId, notes: `Despachado a ${recipientName}`.slice(0, 1000), ...createAudit(s.audit) });
          await m.getRepository(Product).update({ id }, { currentStage: 3, ...updateAudit(s.audit) });
          touchedDossiers.add(dossier.id);
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("El despacho ya fue registrado. Actualice la página.");
      throw err;
    }

    revalidatePath("/dispatch");
    revalidatePath("/");
    for (const d of touchedDossiers) revalidatePath(`/dossiers/${d}`);
    return { count: ids.length };
  });
}
