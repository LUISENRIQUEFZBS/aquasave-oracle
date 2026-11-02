"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { attempt } from "@/lib/result";
import { Dossier } from "@/entities/Dossier";
import { Product } from "@/entities/Product";
import { Reception } from "@/entities/Reception";
import { ProductTracking } from "@/entities/ProductTracking";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireInternal, text, validId } from "./_guards";

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Registers the reception of ONE product (one AQUA_RECEPCION row per product).
 * - present = true: product physically arrived. Stores date + receiver, adds the first
 *   AQUA_SEGUIMIENTO_PRODUCTO entry (stage 1) and moves the product to stage 2 (Evaluación). Final.
 * - present = false: records "did not arrive" (with notes); can be registered again later.
 * - expected = false: the item arrived but was NOT on the client's list.
 */
export async function receiveProduct(productId: number, input: { present: boolean; expected: boolean; notes?: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const notes = text(input.notes, "Las notas", 1000);
    const present = input.present ? 1 : 0;
    const expected = input.expected ? 1 : 0;

    const product = await db.getRepository(Product).findOne({ where: { id: validId(productId, "Producto") } });
    if (!product || product.status !== 1) throw new Error("Producto no encontrado o inactivo.");
    const dossier = await db.getRepository(Dossier).findOne({ where: { id: product.dossierId } });
    if (!dossier || dossier.status !== 1) throw new Error("El expediente no está abierto.");
    if (product.currentStage !== 1) throw new Error("Este producto ya fue recibido.");

    try {
      await db.transaction(async (m) => {
        const existing = await m.getRepository(Reception).findOne({ where: { productId: product.id } });
        const values = {
          expected,
          present,
          receivedAt: present ? today() : null,
          receiverUserId: present ? s.userId : null,
          notes,
        };
        if (existing) {
          await m.getRepository(Reception).update({ id: existing.id }, { ...values, ...updateAudit(s.audit) });
        } else {
          await insertReturningId(m, Reception, { productId: product.id, ...values, ...createAudit(s.audit) });
        }
        if (present) {
          await insertReturningId(m, ProductTracking, {
            productId: product.id,
            stage: 1,
            occurredAt: today(),
            userId: s.userId,
            notes: notes ?? "Recibido",
            ...createAudit(s.audit),
          });
          await m.getRepository(Product).update({ id: product.id }, { currentStage: 2, ...updateAudit(s.audit) });
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("La recepción ya fue registrada. Actualice la página.");
      throw err;
    }
    revalidatePath(`/dossiers/${dossier.id}`);
    revalidatePath("/");
  });
}
