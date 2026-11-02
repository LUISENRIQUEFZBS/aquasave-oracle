import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Reception — AQUA_RECEPCION
export interface ReceptionEntity extends AuditFields {
  id: number;
  productId: number;
  expected: number;
  present: number;
  receivedAt: string | null;
  receiverUserId: number | null;
  notes: string | null;
}

export const Reception = new EntitySchema<ReceptionEntity>({
  name: "Reception",
  tableName: "AQUA_RECEPCION",
  columns: {
    id: { primary: true, type: "number", name: "NCODRECEPCION" },
    productId: { type: "number", precision: 20, unique: true, name: "NCODPRODUCTO" },
    expected: { type: "number", width: 1, default: 1, name: "NESPERADO" },
    present: { type: "number", width: 1, default: 0, name: "NPRESENTE" },
    receivedAt: { type: "date", nullable: true, name: "DFECRECEPCION" },
    receiverUserId: { type: "number", precision: 20, nullable: true, name: "NCODUSUARIORECEPTOR" },
    notes: { type: "varchar2", length: 1000, nullable: true, name: "VNOTAS" },
    ...auditColumns,
  },
});
