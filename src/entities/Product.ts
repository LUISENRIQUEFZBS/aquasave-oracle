import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Product — AQUA_PRODUCTO
export interface ProductEntity extends AuditFields {
  id: number;
  dossierId: number;
  productTypeId: number;
  code: string;
  description: string;
  brandId: number | null;
  manufacturerId: number | null;
  originCountryId: number | null;
  usage: string | null;
  material: string | null;
  warrantyYears: number | null;
  consumptionLpm: number | null;
  photoPath: string | null;
  techSheetPath: string | null;
  currentStage: number;
}

export const Product = new EntitySchema<ProductEntity>({
  name: "Product",
  tableName: "AQUA_PRODUCTO",
  columns: {
    id: { primary: true, type: "number", name: "NCODPRODUCTO" },
    dossierId: { type: "number", precision: 20, name: "NCODEXPEDIENTE" },
    productTypeId: { type: "number", precision: 20, name: "NCODTIPOPRODUCTO" },
    code: { type: "varchar2", length: 50, name: "VCODIGO" },
    description: { type: "varchar2", length: 1000, name: "VDESCRIPCION" },
    brandId: { type: "number", precision: 20, nullable: true, name: "NCODMARCA" },
    manufacturerId: { type: "number", precision: 20, nullable: true, name: "NCODFABRICANTE" },
    originCountryId: { type: "number", precision: 20, nullable: true, name: "NCODPAISORIGEN" },
    usage: { type: "varchar2", length: 200, nullable: true, name: "VUSO" },
    material: { type: "varchar2", length: 200, nullable: true, name: "VMATERIAL" },
    warrantyYears: { type: "number", nullable: true, name: "NANIOSGARANTIA" },
    consumptionLpm: { type: "number", precision: 6, scale: 2, nullable: true, name: "NCONSUMOLMIN" },
    photoPath: { type: "varchar2", length: 500, nullable: true, name: "VFOTOURL" },
    techSheetPath: { type: "varchar2", length: 500, nullable: true, name: "VFICHATECNICAURL" },
    currentStage: { type: "number", width: 1, default: 1, name: "NETAPAACTUAL" },
    ...auditColumns,
  },
  uniques: [
    { name: "UQ_PRODUCTO_EXP_COD", columns: ["dossierId", "code"] },
  ],
});
