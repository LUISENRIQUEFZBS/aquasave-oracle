import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Brand — AQUA_MARCA
export interface BrandEntity extends AuditFields {
  id: number;
  name: string;
}

export const Brand = new EntitySchema<BrandEntity>({
  name: "Brand",
  tableName: "AQUA_MARCA",
  columns: {
    id: { primary: true, type: "number", name: "NCODMARCA" },
    name: { type: "varchar2", length: 200, unique: true, name: "VNOMBRE" },
    ...auditColumns,
  },
});
