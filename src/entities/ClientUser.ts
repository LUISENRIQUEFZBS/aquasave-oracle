import { EntitySchema } from "typeorm";

export interface ClientUserEntity {
  id: number;
  clientId: number;
  name: string;
  email: string;
  passwordHash: string | null;
  role: string;
  status: number;
  emailVerifiedAt: string | null;
  mustChangePassword: number;
  indicador: string;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
}

export const ClientUser = new EntitySchema<ClientUserEntity>({
  name: "ClientUser",
  tableName: "AQUA_CLIENTE_USUARIO",
  columns: {
    id: { primary: true, type: "number", name: "NCODCLIENTEUSUARIO" },
    clientId: { type: "number", name: "NCODCLIENTE" },
    name: { type: "varchar2", length: 200, name: "VNOMBRE" },
    email: { type: "varchar2", length: 200, unique: true, name: "VEMAIL" },
    passwordHash: { type: "varchar2", length: 255, nullable: true, name: "VPASSWORD_HASH" },
    role: { type: "varchar2", length: 30, name: "VROL" },
    status: { type: "number", width: 1, name: "NESTADO" },
    emailVerifiedAt: { type: "date", nullable: true, name: "DFEC_VERIF_EMAIL" },
    mustChangePassword: { type: "number", width: 1, name: "NCAMBIO_PASS_OBLIG" },
    indicador: { type: "char", length: 18, name: "NINDICADOR" },
    createdAt: { type: "date", name: "DFECCRE" },
    updatedAt: { type: "date", nullable: true, name: "DFECACT" },
    createdBy: { type: "varchar2", length: 20, name: "VRESCRE" },
    updatedBy: { type: "varchar2", length: 20, nullable: true, name: "VRESACT" },
  },
});