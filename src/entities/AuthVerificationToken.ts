import { EntitySchema } from "typeorm";

export const AuthVerificationToken = new EntitySchema({
  name: "AuthVerificationToken",
  tableName: "AQUA_AUTH_VERIF_TOKEN",
  columns: {
    identifier: { primary: true, type: "varchar2", length: 255, name: "VIDENTIFICADOR" },
    token: { primary: true, type: "varchar2", length: 255, name: "VTOKEN" },
    expires: { type: "date", name: "DFEC_EXPIRA" },
  },
});