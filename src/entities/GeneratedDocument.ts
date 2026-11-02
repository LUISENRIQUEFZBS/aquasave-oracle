import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// GeneratedDocument — AQUA_DOCUMENTO_GENERADO
export interface GeneratedDocumentEntity extends AuditFields {
  id: number;
  dossierId: number;
  type: number;
  templateVersion: string;
  pdfPath: string | null;
  generatorUserId: number;
  signedAt: string | null;
  signedFilePath: string | null;
}

export const GeneratedDocument = new EntitySchema<GeneratedDocumentEntity>({
  name: "GeneratedDocument",
  tableName: "AQUA_DOCUMENTO_GENERADO",
  columns: {
    id: { primary: true, type: "number", name: "NCODDOCUMENTOGENERADO" },
    dossierId: { type: "number", precision: 20, name: "NCODEXPEDIENTE" },
    type: { type: "number", width: 1, name: "NTIPO" },
    templateVersion: { type: "varchar2", length: 20, default: "v1", name: "VVERSIONPLANTILLA" },
    pdfPath: { type: "varchar2", length: 500, nullable: true, name: "VPDFURL" },
    generatorUserId: { type: "number", precision: 20, name: "NCODUSUARIOGENERADOR" },
    signedAt: { type: "date", nullable: true, name: "DFECFIRMA" },
    signedFilePath: { type: "varchar2", length: 500, nullable: true, name: "VARCHIVOFIRMADOURL" },
    ...auditColumns,
  },
});
