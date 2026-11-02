import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// SubmissionReview — AQUA_SOLICITUD_REVISION
export interface SubmissionReviewEntity extends AuditFields {
  id: number;
  submissionId: number;
  reviewerUserId: number;
  decision: number;
  generalNotes: string | null;
}

export const SubmissionReview = new EntitySchema<SubmissionReviewEntity>({
  name: "SubmissionReview",
  tableName: "AQUA_SOLICITUD_REVISION",
  columns: {
    id: { primary: true, type: "number", name: "NCODREVISION" },
    submissionId: { type: "number", precision: 20, name: "NCODSOLICITUD" },
    reviewerUserId: { type: "number", precision: 20, name: "NCODUSUARIO" },
    decision: { type: "number", width: 1, name: "NDECISION" },
    generalNotes: { type: "varchar2", length: 2000, nullable: true, name: "VNOTASGENERALES" },
    ...auditColumns,
  },
});
