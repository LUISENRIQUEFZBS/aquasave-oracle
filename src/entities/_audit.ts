import type { EntitySchemaColumnOptions } from "typeorm";

/** Audit columns present on every AQUA_ table (see CLAUDE.md, "audit-column standard"). */
export interface AuditFields {
  status: number; // NESTADO: 1 = active, 2 = inactive (some tables have business states)
  indicador: string; // NINDICADOR: segmentation helper, DB default '1'
  createdAt: string; // DFECCRE: set by the trigger. TypeORM returns type "date" as 'YYYY-MM-DD' text
  updatedAt: string | null; // DFECACT: the app sets it on every UPDATE
  createdBy: string; // VRESCRE: REQUIRED on every insert (max 20 chars)
  updatedBy: string | null; // VRESACT
}

export const auditColumns: Record<keyof AuditFields, EntitySchemaColumnOptions> = {
  status: { type: "number", width: 1, name: "NESTADO", default: 1 },
  indicador: { type: "char", length: 18, name: "NINDICADOR", default: "1" },
  createdAt: { type: "date", name: "DFECCRE" },
  updatedAt: { type: "date", nullable: true, name: "DFECACT" },
  createdBy: { type: "varchar2", length: 20, name: "VRESCRE" },
  updatedBy: { type: "varchar2", length: 20, nullable: true, name: "VRESACT" },
};

/** Fields to pass on every INSERT. createdAt is filled by the DB trigger. */
export function createAudit(createdBy: string) {
  return { status: 1, indicador: "1", createdBy: createdBy.slice(0, 20) };
}

/** Fields to pass on every UPDATE. */
export function updateAudit(updatedBy: string) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { updatedAt: today, updatedBy: updatedBy.slice(0, 20) };
}
