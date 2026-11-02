import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// SubmissionObservation — AQUA_SOLICITUD_OBSERVACION
export interface SubmissionObservationEntity extends AuditFields {
  id: number;
  reviewId: number;
  targetType: string;
  targetId: number | null;
  field: string | null;
  message: string;
}

export const SubmissionObservation = new EntitySchema<SubmissionObservationEntity>({
  name: "SubmissionObservation",
  tableName: "AQUA_SOLICITUD_OBSERVACION",
  columns: {
    id: { primary: true, type: "number", name: "NCODOBSERVACION" },
    reviewId: { type: "number", precision: 20, name: "NCODREVISION" },
    targetType: { type: "varchar2", length: 20, name: "VTIPOOBJETIVO" },
    targetId: { type: "number", precision: 20, nullable: true, name: "NCODOBJETIVO" },
    field: { type: "varchar2", length: 100, nullable: true, name: "VCAMPO" },
    message: { type: "varchar2", length: 1000, name: "VMENSAJE" },
    ...auditColumns,
  },
});
