import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// ProductVariant — AQUA_PRODUCTO_VARIANTE
export interface ProductVariantEntity extends AuditFields {
  id: number;
  productId: number;
  variantId: number;
}

export const ProductVariant = new EntitySchema<ProductVariantEntity>({
  name: "ProductVariant",
  tableName: "AQUA_PRODUCTO_VARIANTE",
  columns: {
    id: { primary: true, type: "number", name: "NCODPRODUCTOVARIANTE" },
    productId: { type: "number", precision: 20, name: "NCODPRODUCTO" },
    variantId: { type: "number", precision: 20, name: "NCODVARIANTE" },
    ...auditColumns,
  },
  uniques: [
    { name: "UQ_PRODVAR", columns: ["productId", "variantId"] },
  ],
});
