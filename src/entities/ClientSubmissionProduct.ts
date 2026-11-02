import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// ClientSubmissionProduct — AQUA_SOLICITUD_PRODUCTO
export interface ClientSubmissionProductEntity extends AuditFields {
  id: number;
  submissionId: number;
  productTypeId: number | null;
  uploadedCode: string | null;
  brandText: string | null;
  manufacturerText: string | null;
  originCountryText: string | null;
  resolvedBrandId: number | null;
  resolvedManufacturerId: number | null;
  resolvedOriginCountryId: number | null;
  model: string | null;
  usage: string | null;
  description: string;
  warrantyYears: number | null;
  photoPath: string | null;
  techSheetPath: string | null;
  productId: number | null;
}

export const ClientSubmissionProduct = new EntitySchema<ClientSubmissionProductEntity>({
  name: "ClientSubmissionProduct",
  tableName: "AQUA_SOLICITUD_PRODUCTO",
  columns: {
    id: { primary: true, type: "number", name: "NCODSOLICITUDPRODUCTO" },
    submissionId: { type: "number", precision: 20, name: "NCODSOLICITUD" },
    productTypeId: { type: "number", precision: 20, nullable: true, name: "NCODTIPOPRODUCTO" },
    uploadedCode: { type: "varchar2", length: 50, nullable: true, name: "VCODIGOSUBIDO" },
    brandText: { type: "varchar2", length: 200, nullable: true, name: "VMARCA" },
    manufacturerText: { type: "varchar2", length: 200, nullable: true, name: "VFABRICANTE" },
    originCountryText: { type: "varchar2", length: 200, nullable: true, name: "VPAISORIGEN" },
    resolvedBrandId: { type: "number", precision: 20, nullable: true, name: "NCODMARCARESUELTA" },
    resolvedManufacturerId: { type: "number", precision: 20, nullable: true, name: "NCODFABRICANTERESUELTO" },
    resolvedOriginCountryId: { type: "number", precision: 20, nullable: true, name: "NCODPAISORIGENRESUELTO" },
    model: { type: "varchar2", length: 200, nullable: true, name: "VMODELO" },
    usage: { type: "varchar2", length: 200, nullable: true, name: "VUSO" },
    description: { type: "varchar2", length: 1000, name: "VDESCRIPCION" },
    warrantyYears: { type: "number", nullable: true, name: "NANIOSGARANTIA" },
    photoPath: { type: "varchar2", length: 500, nullable: true, name: "VFOTOURL" },
    techSheetPath: { type: "varchar2", length: 500, nullable: true, name: "VFICHATECNICAURL" },
    productId: { type: "number", precision: 20, nullable: true, unique: true, name: "NCODPRODUCTO" },
    ...auditColumns,
  },
  uniques: [
    { name: "UQ_SOLPROD_COD", columns: ["submissionId", "uploadedCode"] },
  ],
});
