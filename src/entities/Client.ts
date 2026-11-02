import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Client — AQUA_CLIENTE
export interface ClientEntity extends AuditFields {
  id: number;
  businessName: string;
  ruc: string | null;
}

export const Client = new EntitySchema<ClientEntity>({
  name: "Client",
  tableName: "AQUA_CLIENTE",
  columns: {
    id: { primary: true, type: "number", name: "NCODCLIENTE" },
    businessName: { type: "varchar2", length: 300, name: "VRAZONSOCIAL" },
    ruc: { type: "varchar2", length: 20, nullable: true, unique: true, name: "VRUC" },
    ...auditColumns,
  },
});
