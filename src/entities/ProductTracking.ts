import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// ProductTracking — AQUA_SEGUIMIENTO_PRODUCTO
export interface ProductTrackingEntity extends AuditFields {
  id: number;
  productId: number;
  stage: number;
  occurredAt: string;
  userId: number | null;
  notes: string | null;
}

export const ProductTracking = new EntitySchema<ProductTrackingEntity>({
  name: "ProductTracking",
  tableName: "AQUA_SEGUIMIENTO_PRODUCTO",
  columns: {
    id: { primary: true, type: "number", name: "NCODSEGUIMIENTOPRODUCTO" },
    productId: { type: "number", precision: 20, name: "NCODPRODUCTO" },
    stage: { type: "number", width: 1, name: "NETAPA" },
    occurredAt: { type: "date", name: "DFECOCURRENCIA" },
    userId: { type: "number", precision: 20, nullable: true, name: "NCODUSUARIO" },
    notes: { type: "varchar2", length: 1000, nullable: true, name: "VNOTAS" },
    ...auditColumns,
  },
});
