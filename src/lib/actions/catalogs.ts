"use server";
import { revalidatePath } from "next/cache";
import type { EntitySchema } from "typeorm";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { Brand } from "@/entities/Brand";
import { Manufacturer } from "@/entities/Manufacturer";
import { OriginCountry } from "@/entities/OriginCountry";
import { ProductType } from "@/entities/ProductType";
import { ReferenceVariant } from "@/entities/ReferenceVariant";
import { attempt } from "@/lib/result";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireAdmin, requireInternal, text, validId, validStatus } from "./_guards";

// ---------- Name-only catalogs: brand, manufacturer, origin country ----------
const NAME_CATALOGS = {
  brand: { entity: Brand, label: "La marca" },
  manufacturer: { entity: Manufacturer, label: "El fabricante" },
  country: { entity: OriginCountry, label: "El país de origen" },
} as const;
export type CatalogKind = keyof typeof NAME_CATALOGS;

type NameEntity = { id: number; name: string; status: number };
function cat(kind: CatalogKind) {
  const c = NAME_CATALOGS[kind];
  if (!c) throw new Error("Catálogo inválido.");
  return { entity: c.entity as unknown as EntitySchema<NameEntity>, label: c.label };
}

export async function listCatalog(kind: CatalogKind, includeInactive = false) {
  await requireInternal();
  const { entity } = cat(kind);
  const db = await getDb();
  return db.getRepository(entity).find({ where: includeInactive ? {} : { status: 1 }, order: { name: "ASC" } });
}

export async function createCatalogItem(kind: CatalogKind, name: string) {
  return attempt(async () => {
    const s = await requireAdmin();
    const { entity, label } = cat(kind);
    const db = await getDb();
    try {
      const id = await insertReturningId(db.manager, entity, { name: text(name, label, 200, true), ...createAudit(s.audit) });
      revalidatePath("/catalogs");
      return { id };
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un registro con ese nombre.");
      throw err;
    }
  });
}

export async function renameCatalogItem(kind: CatalogKind, id: number, name: string) {
  return attempt(async () => {
    const s = await requireAdmin();
    const { entity, label } = cat(kind);
    const db = await getDb();
    try {
      await db.getRepository(entity).update({ id: validId(id) }, { name: text(name, label, 200, true), ...updateAudit(s.audit) } as never);
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un registro con ese nombre.");
      throw err;
    }
    revalidatePath("/catalogs");
  });
}

export async function setCatalogItemStatus(kind: CatalogKind, id: number, status: number) {
  return attempt(async () => {
    const s = await requireAdmin();
    const { entity } = cat(kind);
    const db = await getDb();
    await db.getRepository(entity).update({ id: validId(id) }, { status: validStatus(status), ...updateAudit(s.audit) } as never);
    revalidatePath("/catalogs");
  });
}

// ---------- Product types (method: 1 = Comparativo, 2 = Referencia fija) ----------
export async function listProductTypes(includeInactive = false) {
  await requireInternal();
  const db = await getDb();
  const where = includeInactive ? {} : { status: 1 };
  const types = await db.getRepository(ProductType).find({ where, order: { name: "ASC" } });
  const variants = await db.getRepository(ReferenceVariant).find({ where, order: { id: "ASC" } });
  return types.map((t) => ({ ...t, variants: variants.filter((v) => v.productTypeId === t.id) }));
}

function validMethod(m: number): 1 | 2 {
  if (m !== 1 && m !== 2) throw new Error("Método inválido (1 = Comparativo, 2 = Referencia fija).");
  return m;
}

export async function createProductType(input: { name: string; method: number; description?: string }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    try {
      const id = await insertReturningId(db.manager, ProductType, {
        name: text(input.name, "El nombre", 200, true),
        method: validMethod(input.method),
        description: text(input.description, "La descripción", 1000),
        ...createAudit(s.audit),
      });
      revalidatePath("/types");
      revalidatePath("/catalogs");
      return { id };
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un tipo de producto con ese nombre.");
      throw err;
    }
  });
}

export async function updateProductType(id: number, input: { name: string; method: number; description?: string }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    try {
      await db.getRepository(ProductType).update(
        { id: validId(id) },
        {
          name: text(input.name, "El nombre", 200, true),
          method: validMethod(input.method),
          description: text(input.description, "La descripción", 1000),
          ...updateAudit(s.audit),
        },
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un tipo de producto con ese nombre.");
      throw err;
    }
    revalidatePath("/types");
    revalidatePath("/catalogs");
  });
}

export async function setProductTypeStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    await db.getRepository(ProductType).update({ id: validId(id) }, { status: validStatus(status), ...updateAudit(s.audit) });
    revalidatePath("/types");
    revalidatePath("/catalogs");
  });
}

function validReference(v: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v >= 10000) throw new Error("El valor de referencia debe ser un número positivo (hasta 9999.99).");
  return v;
}

// ---------- Reference variants (only for method 2 = Referencia fija) ----------
export async function createReferenceVariant(productTypeId: number, input: { label: string; referenceValue: number; requiresFlushTest?: boolean }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    const type = await db.getRepository(ProductType).findOne({ where: { id: validId(productTypeId, "Tipo de producto") } });
    if (!type || type.status !== 1) throw new Error("Tipo de producto no encontrado o inactivo.");
    if (type.method !== 2) throw new Error("Solo los tipos con método Referencia fija tienen variantes.");
    const id = await insertReturningId(db.manager, ReferenceVariant, {
      productTypeId,
      label: text(input.label, "La etiqueta", 100, true),
      referenceValue: validReference(input.referenceValue),
      requiresFlushTest: input.requiresFlushTest ? 1 : 0,
      ...createAudit(s.audit),
    });
    revalidatePath("/types");
    return { id };
  });
}

export async function setReferenceVariantStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    await db.getRepository(ReferenceVariant).update({ id: validId(id) }, { status: validStatus(status), ...updateAudit(s.audit) });
    revalidatePath("/types");
  });
}
