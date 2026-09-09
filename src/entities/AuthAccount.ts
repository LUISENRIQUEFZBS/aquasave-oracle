import { EntitySchema } from "typeorm";

export const AuthAccount = new EntitySchema({
  name: "AuthAccount",
  tableName: "AQUA_AUTH_ACCOUNT",
  columns: {
    id: { primary: true, type: "varchar2", length: 36, name: "VCOD" },
    userId: { type: "varchar2", length: 36, name: "VCODCLIENTEUSUARIO" },
    type: { type: "varchar2", length: 50, name: "VTIPO" },
    provider: { type: "varchar2", length: 50, name: "VPROVEEDOR" },
    providerAccountId: { type: "varchar2", length: 255, name: "VPROVEEDOR_ID" },
    refresh_token: { type: "varchar2", length: 1000, nullable: true, name: "VREFRESH_TOKEN" },
    access_token: { type: "varchar2", length: 1000, nullable: true, name: "VACCESS_TOKEN" },
    expires_at: { type: "number", nullable: true, name: "NEXPIRA" },
    token_type: { type: "varchar2", length: 50, nullable: true, name: "VTOKEN_TIPO" },
    scope: { type: "varchar2", length: 255, nullable: true, name: "VSCOPE" },
    id_token: { type: "varchar2", length: 2000, nullable: true, name: "VID_TOKEN" },
    session_state: { type: "varchar2", length: 255, nullable: true, name: "VSESSION_STATE" },
  },
});