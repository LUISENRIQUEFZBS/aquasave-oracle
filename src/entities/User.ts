import { EntitySchema } from "typeorm";

export interface UserEntity {
  id: number;
  name: string;
  email: string;
  passwordHash: string | null;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export const User = new EntitySchema<UserEntity>({
  name: "User",
  tableName: "AQUA_USUARIO_INTERNO",
  columns: {
    id: { primary: true, type: "number", name: "NCODUSUARIO" },
    name: { type: "varchar2", length: 200, name: "VNOMBRE" },
    email: { type: "varchar2", length: 200, unique: true, name: "VEMAIL" },
    passwordHash: { type: "varchar2", length: 255, nullable: true, name: "VPASSWORD_HASH" },
    role: { type: "varchar2", length: 30, name: "VROL" },
    active: { type: "number", width: 1, name: "NACTIVO" },
    createdAt: { type: "date", name: "DFECCRE" },
    updatedAt: { type: "date", nullable: true, name: "DFECACT" },
  },
});