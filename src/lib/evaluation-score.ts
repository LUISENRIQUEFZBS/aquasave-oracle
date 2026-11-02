// Pure scoring logic shared by the server (authoritative) and the evaluation screen (live feedback).
// The browser never decides the result: finalizeEvaluation recomputes everything from the stored pruebas.
import { computeSelectedAverages, REQUIRED_SELECTED, type Prueba } from "./evaluation-data";
import { computeComparativeScore } from "./certification-criteria";
import { computeFixedReferenceScore } from "./fixed-reference-criteria";

export type ComparativeData = {
  method: "COMPARATIVE";
  withoutDevice: { pruebas: Prueba[] };
  withDevice: { pruebas: Prueba[] };
};
export type ReferenceVariantData = {
  label: string;
  referenceVolumeL: number;
  requiresFlushTest: boolean;
  pruebas: Prueba[];
};
export type FixedReferenceData = {
  method: "FIXED_REFERENCE";
  variants: Record<string, ReferenceVariantData>;
};
export type EvaluationData = ComparativeData | FixedReferenceData;
export type ResultKey = "CONFORME" | "NO_CONFORME";

/** More than this many balls cleared = flush test passed (same rule as the original app). */
export const FLUSH_MIN_BALLS = 5;

export function evaluateComparative(data: ComparativeData, warrantyYears: number | null) {
  const withoutAvg = computeSelectedAverages(data.withoutDevice.pruebas);
  const withAvg = computeSelectedAverages(data.withDevice.pruebas);
  const percentOfVolume =
    withoutAvg.avgVolume && withAvg.avgVolume !== null && withoutAvg.avgVolume !== 0
      ? (withAvg.avgVolume / withoutAvg.avgVolume) * 100
      : null;
  const savingsPercent = percentOfVolume !== null ? 100 - percentOfVolume : null;
  const timePercentChange =
    withoutAvg.avgTiempo && withAvg.avgTiempo !== null && withoutAvg.avgTiempo !== 0
      ? ((withAvg.avgTiempo - withoutAvg.avgTiempo) / withoutAvg.avgTiempo) * 100
      : null;
  const score = computeComparativeScore({ savingsPercent, warrantyYears, timePercentChange });
  const ready = withoutAvg.selectedCount === REQUIRED_SELECTED && withAvg.selectedCount === REQUIRED_SELECTED;
  const suggested: ResultKey | null = score.isComplete ? (score.passed ? "CONFORME" : "NO_CONFORME") : null;
  return { withoutAvg, withAvg, percentOfVolume, savingsPercent, timePercentChange, score, ready, suggested };
}

export type VariantState = {
  label: string;
  referenceVolumeL: number;
  avgVolumeL: number | null;
  requiresFlushTest: boolean;
  ballsClearedResults: (number | null)[];
  ready: boolean;
  compliant: boolean | null;
  flushOk: boolean | null;
};

export function evaluateVariant(variant: ReferenceVariantData, referenceVolumeL: number): VariantState {
  const avg = computeSelectedAverages(variant.pruebas);
  const ready = avg.selectedCount === REQUIRED_SELECTED;
  const selected = variant.pruebas.filter((p) => p.selected);
  const flushOk = !variant.requiresFlushTest ? true : ready ? selected.every((p) => (p.ballsCleared ?? 0) > FLUSH_MIN_BALLS) : null;
  const compliant = ready ? avg.avgVolume !== null && avg.avgVolume <= referenceVolumeL : null;
  return {
    label: variant.label,
    referenceVolumeL,
    avgVolumeL: avg.avgVolume,
    requiresFlushTest: variant.requiresFlushTest,
    ballsClearedResults: selected.map((p) => p.ballsCleared ?? null),
    ready,
    compliant,
    flushOk,
  };
}

/** states: one VariantState per variant id (the screen builds them from its editable reference volumes). */
export function evaluateFixedReferenceStates(states: Record<string, VariantState>, warrantyYears: number | null) {
  const ids = Object.keys(states);
  const allReady = ids.length > 0 && ids.every((id) => states[id].ready);
  const allVariantsCompliant = allReady ? ids.every((id) => states[id].compliant === true) : null;
  const flushIds = ids.filter((id) => states[id].requiresFlushTest);
  const flushPassed = flushIds.length === 0 ? true : allReady ? flushIds.every((id) => states[id].flushOk === true) : null;
  const score = computeFixedReferenceScore({ allVariantsCompliant, warrantyYears, flushPassed });
  const suggested: ResultKey | null = score.isComplete ? (score.passed ? "CONFORME" : "NO_CONFORME") : null;
  return { allReady, allVariantsCompliant, flushPassed, score, suggested };
}

export function evaluateFixedReference(data: FixedReferenceData, warrantyYears: number | null, referenceVolumes: Record<string, number> = {}) {
  const states: Record<string, VariantState> = {};
  for (const [id, v] of Object.entries(data.variants || {})) {
    states[id] = evaluateVariant(v, referenceVolumes[id] ?? v.referenceVolumeL);
  }
  return { states, ...evaluateFixedReferenceStates(states, warrantyYears) };
}
