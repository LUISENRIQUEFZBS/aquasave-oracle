import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// ClientSubmissionDocument — AQUA_SOLICITUD_DOCUMENTO
export interface ClientSubmissionDocumentEntity extends AuditFields {
  id: number;
  submissionId: number;
  documentType: number;
  filePath: string;
  uploadedByClientUserId: number;
}

export const ClientSubmissionDocument = new EntitySchema<ClientSubmissionDocumentEntity>({
  name: "ClientSubmissionDocument",
  tableName: "AQUA_SOLICITUD_DOCUMENTO",
  columns: {
    id: { primary: true, type: "number", name: "NCODSOLICITUDDOCUMENTO" },
    submissionId: { type: "number", precision: 20, name: "NCODSOLICITUD" },
    documentType: { type: "number", width: 2, name: "NTIPODOCUMENTO" },
    filePath: { type: "varchar2", length: 500, name: "VARCHIVOURL" },
    uploadedByClientUserId: { type: "number", precision: 20, name: "NCODCLIENTEUSUARIO" },
    ...auditColumns,
  },
});
