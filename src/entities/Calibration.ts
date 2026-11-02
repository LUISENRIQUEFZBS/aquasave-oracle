import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Calibration — AQUA_CALIBRACION
export interface CalibrationEntity extends AuditFields {
  id: number;
  instrumentId: number;
  calibratedAt: string;
  expiresAt: string;
  verificationDocument: string | null;
  notes: string | null;
}

export const Calibration = new EntitySchema<CalibrationEntity>({
  name: "Calibration",
  tableName: "AQUA_CALIBRACION",
  columns: {
    id: { primary: true, type: "number", name: "NCODCALIBRACION" },
    instrumentId: { type: "number", precision: 20, name: "NCODINSTRUMENTO" },
    calibratedAt: { type: "date", name: "DFECCALIBRACION" },
    expiresAt: { type: "date", name: "DFECVENCIMIENTO" },
    verificationDocument: { type: "varchar2", length: 200, nullable: true, name: "VDOCUMENTOVERIFICACION" },
    notes: { type: "varchar2", length: 1000, nullable: true, name: "VNOTAS" },
    ...auditColumns,
  },
});
