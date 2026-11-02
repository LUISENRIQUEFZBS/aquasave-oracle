import { EntitySchema } from "typeorm";
import { AuditFields, auditColumns } from "./_audit";

// Evaluation — AQUA_EVALUACION
export interface EvaluationEntity extends AuditFields {
  id: number;
  productId: number;
  method: number;
  data: string | null;
  result: number | null;
  selectedForCertificate: number;
  photoPath: string | null;
  meterInstrumentId: number | null;
  pressureGaugeInstrumentId: number | null;
  stopwatchInstrumentId: number | null;
  evaluatorUserId: number;
  evaluatedAt: string;
}

export const Evaluation = new EntitySchema<EvaluationEntity>({
  name: "Evaluation",
  tableName: "AQUA_EVALUACION",
  columns: {
    id: { primary: true, type: "number", name: "NCODEVALUACION" },
    productId: { type: "number", precision: 20, name: "NCODPRODUCTO" },
    method: { type: "number", width: 1, name: "NMETODO" },
    data: { type: "clob", nullable: true, name: "CDATOS" },
    result: { type: "number", width: 1, nullable: true, name: "NRESULTADO" },
    selectedForCertificate: { type: "number", width: 1, default: 0, name: "NSELECCIONADOCERTIFICADO" },
    photoPath: { type: "varchar2", length: 500, nullable: true, name: "VFOTOURL" },
    meterInstrumentId: { type: "number", precision: 20, nullable: true, name: "NCODINSTRUMENTOMEDIDOR" },
    pressureGaugeInstrumentId: { type: "number", precision: 20, nullable: true, name: "NCODINSTRUMENTOMANOMETRO" },
    stopwatchInstrumentId: { type: "number", precision: 20, nullable: true, name: "NCODINSTRUMENTOCRONOMETRO" },
    evaluatorUserId: { type: "number", precision: 20, name: "NCODUSUARIOEVALUADOR" },
    evaluatedAt: { type: "date", name: "DFECEVALUACION" },
    ...auditColumns,
  },
});
