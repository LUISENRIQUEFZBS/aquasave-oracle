// Plain constants shared by server and client code ("use server" files may only export async functions).

/** AQUA_EXPEDIENTE.NESTADO — PROPOSED values, pending ETIC confirmation. */
export const DOSSIER_STATUS = { OPEN: 1, CLOSED: 2, VOID: 3 } as const;
export const DOSSIER_STATUS_LABELS: Record<number, string> = { 1: "Abierto", 2: "Concluido", 3: "Anulado" };

export const PRODUCT_STAGE_LABELS: Record<number, string> = { 1: "Recepción", 2: "Evaluación", 3: "Despacho" };

/** AQUA_EVALUACION.NRESULTADO: 1 = Conforme, 2 = No conforme, NULL = en progreso. */
export const EVAL_RESULT = { CONFORME: 1, NO_CONFORME: 2 } as const;
/** AQUA_EVALUACION.NMETODO (copied from AQUA_TIPO_PRODUCTO.NMETODO): 1 = Comparativo, 2 = Referencia fija. */
export const EVAL_METHOD = { COMPARATIVE: 1, FIXED_REFERENCE: 2 } as const;
/** AQUA_INSTRUMENTO.NCATEGORIA. */
export const INSTRUMENT_CATEGORY = { WATER_METER: 1, PRESSURE_GAUGE: 2, STOPWATCH: 3 } as const;
export type InstrumentCategoryKey = keyof typeof INSTRUMENT_CATEGORY;