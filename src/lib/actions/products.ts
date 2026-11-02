"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { saveFile, type FileGroup } from "@/lib/files";
import { attempt } from "@/lib/result";
import { Dossier } from "@/entities/Dossier";
import { Product } from "@/entities/Product";
import { Evaluation } from "@/entities/Evaluation";
import { ProductType } from "@/entities/ProductType";
import { ProductVariant } from "@/entities/ProductVariant";
import { ReferenceVariant } from "@/entities/ReferenceVariant";
import { Brand } from "@/entities/Brand";
import { Manufacturer } from "@/entities/Manufacturer";
import { OriginCountry } from "@/entities/OriginCountry";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireInternal, text, validId, validStatus } from "./_guards";

type ProductInput = {
  productTypeId: number;
  code: string;
  description: string;
  brandId?: number | null;
  manufacturerId?: number | null;
  originCountryId?: number | null;
  usage?: string;
  material?: string;
  warrantyYears?: number | null;
  consumptionLpm?: number | null;
  variantIds?: number[];
};

function optNumber(v: number | null | undefined, label: string, max: number): number | null {
  if (v === null || v === undefined || (v as unknown) === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max) throw new Error(`${label} inválido.`);
  return v;
}

export async function createProduct(dossierId: number, input: ProductInput) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const dossier = await db.getRepository(Dossier).findOne({ where: { id: validId(dossierId, "Expediente") } });
    if (!dossier) throw new Error("Expediente no encontrado.");
    if (dossier.status !== 1) throw new Error("Solo se pueden agregar productos a un expediente abierto.");
    const type = await db.getRepository(ProductType).findOne({ where: { id: validId(input.productTypeId, "Tipo de producto") } });
    if (!type || type.status !== 1) throw new Error("Tipo de producto no encontrado o inactivo.");

    // Optional catalog references must exist and be active.
    const checkRef = async (entity: typeof Brand | typeof Manufacturer | typeof OriginCountry, id: number | null | undefined, label: string) => {
      if (!id) return null;
      const row = await db.getRepository(entity as never).findOne({ where: { id: validId(id, label) } as never });
      if (!row || (row as { status: number }).status !== 1) throw new Error(`${label} no encontrado o inactivo.`);
      return id;
    };
    const brandId = await checkRef(Brand, input.brandId, "Marca");
    const manufacturerId = await checkRef(Manufacturer, input.manufacturerId, "Fabricante");
    const originCountryId = await checkRef(OriginCountry, input.originCountryId, "País de origen");

    // Variants only for "Referencia fija" types, and they must belong to this type.
    const variantIds = [...new Set(input.variantIds ?? [])];
    if (variantIds.length) {
      if (type.method !== 2) throw new Error("Este tipo de producto no usa variantes.");
      const valid = await db.getRepository(ReferenceVariant).find({ where: { productTypeId: type.id, status: 1 } });
      const ok = new Set(valid.map((v) => v.id));
      if (variantIds.some((v) => !ok.has(v))) throw new Error("Variante inválida para este tipo de producto.");
    }

    try {
      const id = await db.transaction(async (m) => {
        const productId = await insertReturningId(m, Product, {
          dossierId: dossier.id,
          productTypeId: type.id,
          code: text(input.code, "El código", 50, true),
          description: text(input.description, "La descripción", 1000, true),
          brandId,
          manufacturerId,
          originCountryId,
          usage: text(input.usage, "El uso", 200),
          material: text(input.material, "El material", 200),
          warrantyYears: optNumber(input.warrantyYears, "Los años de garantía", 99),
          consumptionLpm: optNumber(input.consumptionLpm, "El consumo (L/min)", 9999),
          currentStage: 1,
          ...createAudit(s.audit),
        });
        for (const variantId of variantIds) {
          await insertReturningId(m, ProductVariant, { productId, variantId, ...createAudit(s.audit) });
        }
        return productId;
      });
      revalidatePath(`/dossiers/${dossier.id}`);
      revalidatePath("/");
      return { id };
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un producto con ese código en este expediente.");
      throw err;
    }
  });
}

/**
 * Edit a product. Dossier must be open. Type and variants can only change while the product is still at
 * stage 1 (Recepcion): later stages may already have evaluations that depend on them.
 */
export async function updateProduct(id: number, input: ProductInput) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const product = await db.getRepository(Product).findOne({ where: { id: validId(id, "Producto") } });
    if (!product) throw new Error("Producto no encontrado.");
    const dossier = await db.getRepository(Dossier).findOne({ where: { id: product.dossierId } });
    if (!dossier || dossier.status !== 1) throw new Error("El expediente no está abierto.");

    // Type/variants can change until the product is dispatched AND has no evaluations (they depend on them).
    const evalCount = await db.getRepository(Evaluation).count({ where: { productId: product.id } });
    const locked = product.currentStage >= 3 || evalCount > 0;
    const typeChanged = input.productTypeId !== product.productTypeId;
    const type = await db.getRepository(ProductType).findOne({ where: { id: validId(input.productTypeId, "Tipo de producto") } });
    if (!type) throw new Error("Tipo de producto no encontrado.");
    if (typeChanged && (locked || type.status !== 1)) {
      throw new Error("El tipo ya no se puede cambiar: el producto tiene evaluaciones o ya fue despachado.");
    }

    const checkRef = async (entity: typeof Brand | typeof Manufacturer | typeof OriginCountry, newId: number | null | undefined, oldId: number | null, label: string) => {
      if (!newId) return null;
      if (newId === oldId) return newId;
      const row = await db.getRepository(entity as never).findOne({ where: { id: validId(newId, label) } as never });
      if (!row || (row as { status: number }).status !== 1) throw new Error(`${label} no encontrado o inactivo.`);
      return newId;
    };
    const brandId = await checkRef(Brand, input.brandId, product.brandId, "Marca");
    const manufacturerId = await checkRef(Manufacturer, input.manufacturerId, product.manufacturerId, "Fabricante");
    const originCountryId = await checkRef(OriginCountry, input.originCountryId, product.originCountryId, "País de origen");

    const variantIds = [...new Set(input.variantIds ?? [])];
    const current = await db.getRepository(ProductVariant).find({ where: { productId: product.id } });
    const currentIds = current.map((v) => v.variantId).sort((a, b) => a - b);
    const sameVariants = JSON.stringify(currentIds) === JSON.stringify([...variantIds].sort((a, b) => a - b));
    if (!sameVariants) {
      if (locked) throw new Error("Las variantes ya no se pueden cambiar: el producto tiene evaluaciones o ya fue despachado.");
      if (variantIds.length) {
        if (type.method !== 2) throw new Error("Este tipo de producto no usa variantes.");
        const valid = await db.getRepository(ReferenceVariant).find({ where: { productTypeId: type.id, status: 1 } });
        const ok = new Set(valid.map((v) => v.id));
        if (variantIds.some((v) => !ok.has(v))) throw new Error("Variante inválida para este tipo de producto.");
      }
    }
    if (typeChanged && sameVariants && currentIds.length) throw new Error("Al cambiar el tipo, revisa las variantes de referencia.");

    try {
      await db.transaction(async (m) => {
        await m.getRepository(Product).update(
          { id: product.id },
          {
            productTypeId: type.id,
            code: text(input.code, "El código", 50, true),
            description: text(input.description, "La descripción", 1000, true),
            brandId,
            manufacturerId,
            originCountryId,
            usage: text(input.usage, "El uso", 200),
            material: text(input.material, "El material", 200),
            warrantyYears: optNumber(input.warrantyYears, "Los años de garantía", 99),
            consumptionLpm: optNumber(input.consumptionLpm, "El consumo (L/min)", 9999),
            ...updateAudit(s.audit),
          },
        );
        if (!sameVariants) {
          await m.getRepository(ProductVariant).delete({ productId: product.id });
          for (const variantId of variantIds) {
            await insertReturningId(m, ProductVariant, { productId: product.id, variantId, ...createAudit(s.audit) });
          }
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un producto con ese código en este expediente.");
      throw err;
    }
    revalidatePath(`/dossiers/${product.dossierId}`);
    revalidatePath("/");
  });
}

export async function setProductStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const product = await db.getRepository(Product).findOne({ where: { id: validId(id) } });
    if (!product) throw new Error("Producto no encontrado.");
    await db.getRepository(Product).update({ id: product.id }, { status: validStatus(status), ...updateAudit(s.audit) });
    revalidatePath(`/dossiers/${product.dossierId}`);
    revalidatePath("/");
  });
}

// ---------- File uploads (photo / technical sheet) ----------
const MAX_BYTES = 10 * 1024 * 1024;

function detectType(b: Buffer): "pdf" | "jpg" | "png" | null {
  if (b.length > 4 && b.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  return null;
}

/**
 * formData must contain "file". kind "photo" accepts JPG/PNG; "techSheet" accepts PDF.
 * NOTE: set experimental.serverActions.bodySizeLimit to "10mb" in next.config.ts.
 */
export async function uploadProductFile(productId: number, kind: "photo" | "techSheet", formData: FormData) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const product = await db.getRepository(Product).findOne({ where: { id: validId(productId, "Producto") } });
    if (!product) throw new Error("Producto no encontrado.");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Seleccione un archivo.");
    if (file.size > MAX_BYTES) throw new Error("El archivo supera 10 MB.");
    const data = Buffer.from(await file.arrayBuffer());
    const real = detectType(data); // trust the content, not the name
    const allowed = kind === "photo" ? ["jpg", "png"] : ["pdf"];
    if (!real || !allowed.includes(real)) throw new Error(kind === "photo" ? "La foto debe ser JPG o PNG." : "La ficha técnica debe ser PDF.");
    const group: FileGroup = kind === "photo" ? "PRODFOTO" : "PRODFICHA";
    const path = await saveFile({ group, data, ext: real, createdBy: s.audit });
    await db.getRepository(Product).update(
      { id: product.id },
      kind === "photo" ? { photoPath: path, ...updateAudit(s.audit) } : { techSheetPath: path, ...updateAudit(s.audit) },
    );
    revalidatePath(`/dossiers/${product.dossierId}`);
    return { path };
  });
}
