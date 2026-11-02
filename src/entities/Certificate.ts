import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Certificate — AQUA_CERTIFICADO
export interface CertificateEntity extends AuditFields {
  id: number;
  productId: number;
  evaluationId: number;
  certificateNumber: string;
  issuedAt: string;
  warrantyYears: number | null;
  validityNote: string | null;
  pdfPath: string | null;
}

export const Certificate = new EntitySchema<CertificateEntity>({
  name: "Certificate",
  tableName: "AQUA_CERTIFICADO",
  columns: {
    id: { primary: true, type: "number", name: "NCODCERTIFICADO" },
    productId: { type: "number", precision: 20, unique: true, name: "NCODPRODUCTO" },
    evaluationId: { type: "number", precision: 20, unique: true, name: "NCODEVALUACION" },
    certificateNumber: { type: "varchar2", length: 30, unique: true, name: "VNUMEROCERTIFICADO" },
    issuedAt: { type: "date", name: "DFECEMISION" },
    warrantyYears: { type: "number", nullable: true, name: "NANIOSGARANTIA" },
    validityNote: { type: "varchar2", length: 500, nullable: true, name: "VNOTAVIGENCIA" },
    pdfPath: { type: "varchar2", length: 500, nullable: true, name: "VPDFURL" },
    ...auditColumns,
  },
});
