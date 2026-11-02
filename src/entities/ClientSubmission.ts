import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// ClientSubmission — AQUA_SOLICITUD
export interface ClientSubmissionEntity extends AuditFields {
  id: number;
  code: string;
  clientId: number;
  siteId: number;
  clientUserId: number;
  submittedAt: string | null;
  approvedAt: string | null;
  convertedAt: string | null;
  rejectedAt: string | null;
  dossierId: number | null;
  registryNumber: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  legalRepresentative: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  generalNotes: string | null;
  termsAcceptedAt: string | null;
}

export const ClientSubmission = new EntitySchema<ClientSubmissionEntity>({
  name: "ClientSubmission",
  tableName: "AQUA_SOLICITUD",
  columns: {
    id: { primary: true, type: "number", name: "NCODSOLICITUD" },
    code: { type: "varchar2", length: 20, unique: true, name: "VCODIGO" },
    clientId: { type: "number", precision: 20, name: "NCODCLIENTE" },
    siteId: { type: "number", precision: 20, name: "NCODSEDE" },
    clientUserId: { type: "number", precision: 20, name: "NCODCLIENTEUSUARIO" },
    submittedAt: { type: "date", nullable: true, name: "DFEC_ENVIO" },
    approvedAt: { type: "date", nullable: true, name: "DFEC_APROB" },
    convertedAt: { type: "date", nullable: true, name: "DFEC_CONV" },
    rejectedAt: { type: "date", nullable: true, name: "DFEC_RECH" },
    dossierId: { type: "number", precision: 20, nullable: true, unique: true, name: "NCODEXPEDIENTE" },
    registryNumber: { type: "varchar2", length: 100, nullable: true, name: "VNUMFICHAREGISTRAL" },
    address: { type: "varchar2", length: 500, nullable: true, name: "VDIRECCION" },
    district: { type: "varchar2", length: 100, nullable: true, name: "VDISTRITO" },
    province: { type: "varchar2", length: 100, nullable: true, name: "VPROVINCIA" },
    department: { type: "varchar2", length: 100, nullable: true, name: "VDEPARTAMENTO" },
    legalRepresentative: { type: "varchar2", length: 200, nullable: true, name: "VREPRESENTANTELEGAL" },
    companyPhone: { type: "varchar2", length: 30, nullable: true, name: "VTELEFONOEMPRESA" },
    companyEmail: { type: "varchar2", length: 200, nullable: true, name: "VEMAILEMPRESA" },
    contactName: { type: "varchar2", length: 200, nullable: true, name: "VCONTACTONOMBRE" },
    contactPhone: { type: "varchar2", length: 30, nullable: true, name: "VCONTACTOTELEFONO" },
    contactEmail: { type: "varchar2", length: 200, nullable: true, name: "VCONTACTOEMAIL" },
    generalNotes: { type: "varchar2", length: 2000, nullable: true, name: "VOBSERVACIONESGENERALES" },
    termsAcceptedAt: { type: "date", nullable: true, name: "DFEC_ACEPTA_TERMINOS" },
    ...auditColumns,
  },
});
