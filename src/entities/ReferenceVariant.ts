import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// ReferenceVariant — AQUA_VARIANTE_REFERENCIA
export interface ReferenceVariantEntity extends AuditFields {
  id: number;
  productTypeId: number;
  label: string;
  referenceValue: number;
  requiresFlushTest: number;
}

export const ReferenceVariant = new EntitySchema<ReferenceVariantEntity>({
  name: "ReferenceVariant",
  tableName: "AQUA_VARIANTE_REFERENCIA",
  columns: {
    id: { primary: true, type: "number", name: "NCODVARIANTE" },
    productTypeId: { type: "number", precision: 20, name: "NCODTIPOPRODUCTO" },
    label: { type: "varchar2", length: 100, name: "VETIQUETA" },
    referenceValue: { type: "number", precision: 6, scale: 2, name: "NVALORREFERENCIAL" },
    requiresFlushTest: { type: "number", width: 1, default: 0, name: "NREQUIEREPRUEBADESCARGA" },
    ...auditColumns,
  },
});
