import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// ProductType — AQUA_TIPO_PRODUCTO
export interface ProductTypeEntity extends AuditFields {
  id: number;
  name: string;
  method: number;
  description: string | null;
}

export const ProductType = new EntitySchema<ProductTypeEntity>({
  name: "ProductType",
  tableName: "AQUA_TIPO_PRODUCTO",
  columns: {
    id: { primary: true, type: "number", name: "NCODTIPOPRODUCTO" },
    name: { type: "varchar2", length: 200, unique: true, name: "VNOMBRE" },
    method: { type: "number", width: 1, name: "NMETODO" },
    description: { type: "varchar2", length: 1000, nullable: true, name: "VDESCRIPCION" },
    ...auditColumns,
  },
});
