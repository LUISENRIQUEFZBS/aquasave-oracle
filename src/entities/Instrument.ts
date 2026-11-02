import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Instrument — AQUA_INSTRUMENTO
export interface InstrumentEntity extends AuditFields {
  id: number;
  category: number;
  code: string;
  label: string | null;
}

export const Instrument = new EntitySchema<InstrumentEntity>({
  name: "Instrument",
  tableName: "AQUA_INSTRUMENTO",
  columns: {
    id: { primary: true, type: "number", name: "NCODINSTRUMENTO" },
    category: { type: "number", width: 1, name: "NCATEGORIA" },
    code: { type: "varchar2", length: 50, unique: true, name: "VCODIGO" },
    label: { type: "varchar2", length: 200, nullable: true, name: "VETIQUETA" },
    ...auditColumns,
  },
});
