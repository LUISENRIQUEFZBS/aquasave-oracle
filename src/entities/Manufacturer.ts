import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Manufacturer — AQUA_FABRICANTE
export interface ManufacturerEntity extends AuditFields {
  id: number;
  name: string;
}

export const Manufacturer = new EntitySchema<ManufacturerEntity>({
  name: "Manufacturer",
  tableName: "AQUA_FABRICANTE",
  columns: {
    id: { primary: true, type: "number", name: "NCODFABRICANTE" },
    name: { type: "varchar2", length: 200, unique: true, name: "VNOMBRE" },
    ...auditColumns,
  },
});
