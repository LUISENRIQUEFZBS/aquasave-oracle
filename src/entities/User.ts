import { EntitySchema } from "typeorm";

export interface UserEntity {
  id: number;
  name: string;
  email: string;
  passwordHash: string | null;
  role: string;
  status: number;
  microsoftPhotoUrl: string | null;
  indicador: string;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
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
    status: { type: "number", width: 1, name: "NESTADO" },
    microsoftPhotoUrl: { type: "varchar2", length: 500, nullable: true, name: "VMICROSOFT_PHOTO_URL" },
    indicador: { type: "char", length: 18, name: "NINDICADOR" },
    createdAt: { type: "date", name: "DFECCRE" },
    updatedAt: { type: "date", nullable: true, name: "DFECACT" },
    createdBy: { type: "varchar2", length: 20, name: "VRESCRE" },
    updatedBy: { type: "varchar2", length: 20, nullable: true, name: "VRESACT" },
  },
});