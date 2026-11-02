import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// OriginCountry — AQUA_PAIS_ORIGEN
export interface OriginCountryEntity extends AuditFields {
  id: number;
  name: string;
}

export const OriginCountry = new EntitySchema<OriginCountryEntity>({
  name: "OriginCountry",
  tableName: "AQUA_PAIS_ORIGEN",
  columns: {
    id: { primary: true, type: "number", name: "NCODPAISORIGEN" },
    name: { type: "varchar2", length: 200, unique: true, name: "VNOMBRE" },
    ...auditColumns,
  },
});
