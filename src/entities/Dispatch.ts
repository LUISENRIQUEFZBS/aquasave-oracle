import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Dispatch — AQUA_DESPACHO
export interface DispatchEntity extends AuditFields {
  id: number;
  productId: number;
  dispatchedAt: string | null;
  dispatcherUserId: number | null;
  recipientName: string | null;
  exitGuideNumber: string | null;
  notes: string | null;
}

export const Dispatch = new EntitySchema<DispatchEntity>({
  name: "Dispatch",
  tableName: "AQUA_DESPACHO",
  columns: {
    id: { primary: true, type: "number", name: "NCODDESPACHO" },
    productId: { type: "number", precision: 20, unique: true, name: "NCODPRODUCTO" },
    dispatchedAt: { type: "date", nullable: true, name: "DFECDESPACHO" },
    dispatcherUserId: { type: "number", precision: 20, nullable: true, name: "NCODUSUARIODESPACHADOR" },
    recipientName: { type: "varchar2", length: 200, nullable: true, name: "VNOMBREDESTINATARIO" },
    exitGuideNumber: { type: "varchar2", length: 50, nullable: true, name: "VNUMGUIASALIDA" },
    notes: { type: "varchar2", length: 1000, nullable: true, name: "VNOTAS" },
    ...auditColumns,
  },
});
