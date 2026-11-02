import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Dossier — AQUA_EXPEDIENTE
export interface DossierEntity extends AuditFields {
  id: number;
  code: string;
  clientId: number;
  siteId: number;
  letterRegistrationNumber: string | null;
  notes: string | null;
  letterReceivedAt: string | null;
  assignedAt: string | null;
  docsReceivedAt: string | null;
  receptionDateSentAt: string | null;
  testsScheduledAt: string | null;
  evaluationDoneAt: string | null;
  certificatesPreparedAt: string | null;
  letterPreparedAt: string | null;
  swornStatementAt: string | null;
  signedAt: string | null;
  sentToClientAt: string | null;
  creatorUserId: number;
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
}

export const Dossier = new EntitySchema<DossierEntity>({
  name: "Dossier",
  tableName: "AQUA_EXPEDIENTE",
  columns: {
    id: { primary: true, type: "number", name: "NCODEXPEDIENTE" },
    code: { type: "varchar2", length: 20, unique: true, name: "VCODIGO" },
    clientId: { type: "number", precision: 20, name: "NCODCLIENTE" },
    siteId: { type: "number", precision: 20, name: "NCODSEDE" },
    letterRegistrationNumber: { type: "varchar2", length: 100, nullable: true, name: "VNUMREGISTROCARTA" },
    notes: { type: "varchar2", length: 2000, nullable: true, name: "VOBSERVACIONES" },
    letterReceivedAt: { type: "date", nullable: true, name: "DFEC_INGRESO_CARTA" },
    assignedAt: { type: "date", nullable: true, name: "DFEC_ASIGNACION" },
    docsReceivedAt: { type: "date", nullable: true, name: "DFEC_RECEPCION_DOCS" },
    receptionDateSentAt: { type: "date", nullable: true, name: "DFEC_ENVIO_FECHA_RECEPCION" },
    testsScheduledAt: { type: "date", nullable: true, name: "DFEC_PROGRAMACION_PRUEBAS" },
    evaluationDoneAt: { type: "date", nullable: true, name: "DFEC_EVALUACION" },
    certificatesPreparedAt: { type: "date", nullable: true, name: "DFEC_ELABORACION_CERTIFICADOS" },
    letterPreparedAt: { type: "date", nullable: true, name: "DFEC_ELABORACION_CARTA" },
    swornStatementAt: { type: "date", nullable: true, name: "DFEC_DECLARACION_JURADA" },
    signedAt: { type: "date", nullable: true, name: "DFEC_FIRMA" },
    sentToClientAt: { type: "date", nullable: true, name: "DFEC_ENVIO_CLIENTE" },
    creatorUserId: { type: "number", precision: 20, name: "NCODUSUARIOCREADOR" },
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
    ...auditColumns,
  },
});
