import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Site — AQUA_SEDE
export interface SiteEntity extends AuditFields {
  id: number;
  clientId: number;
  label: string | null;
  address: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

export const Site = new EntitySchema<SiteEntity>({
  name: "Site",
  tableName: "AQUA_SEDE",
  columns: {
    id: { primary: true, type: "number", name: "NCODSEDE" },
    clientId: { type: "number", precision: 20, name: "NCODCLIENTE" },
    label: { type: "varchar2", length: 200, nullable: true, name: "VETIQUETA" },
    address: { type: "varchar2", length: 500, name: "VDIRECCION" },
    contactName: { type: "varchar2", length: 200, nullable: true, name: "VCONTACTONOMBRE" },
    contactPhone: { type: "varchar2", length: 30, nullable: true, name: "VCONTACTOTELEFONO" },
    contactEmail: { type: "varchar2", length: 200, nullable: true, name: "VCONTACTOEMAIL" },
    ...auditColumns,
  },
});
