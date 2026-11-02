// Scoring rubric for FIXED_REFERENCE products (Inodoro, Urinario).
// Tabla 1 is binary and evaluated ONCE for the whole evaluation, combining
// every selected variant: a product only earns the 50 points if it's
// within reference on ALL of its variants (e.g. both Líquido and Sólido
// for an Inodoro) — failing any one of them fails the whole factor.
// Tabla 2 (garantía) is identical to comparativo. Tabla 3 (eficiencia) is
// mapped to the flush-effectiveness ball-count test, itself combined
// across every variant that requires it (e.g. Sólido) — a physical check
// in the real process, since there's no time comparison for a single
// fixed-reference measurement.

import {
  WARRANTY_SCORE_TABLE,
  MAX_SCORE,
  PASSING_SCORE,
  resolveBracket,
  type ScoreBracket,
} from "./certification-criteria";

export { WARRANTY_SCORE_TABLE, MAX_SCORE, PASSING_SCORE };

export const FIXED_REF_SAVINGS_TABLE: ScoreBracket[] = [
  { label: "Al menos una variante supera su volumen de referencia", points: 0, test: (v) => v === 0 },
  { label: "Todas las variantes cumplen su volumen de referencia", points: 50, test: (v) => v === 1 },
];

export const FIXED_REF_FLUSH_TABLE: ScoreBracket[] = [
  { label: "Prueba de efectividad de descarga no aprobada", points: 0, test: (v) => v === 0 },
  { label: "Prueba de efectividad de descarga aprobada", points: 10, test: (v) => v === 1 },
];

export function computeFixedReferenceScore(input: {
  allVariantsCompliant: boolean | null; // null = not all variants have 3 selected pruebas yet
  warrantyYears: number | null;
  flushPassed: boolean | null; // null = flush-required variant(s) not ready yet; true = passed or not applicable
}) {
  const savings = resolveBracket(
    FIXED_REF_SAVINGS_TABLE,
    input.allVariantsCompliant === null ? null : input.allVariantsCompliant ? 1 : 0,
  );
  const warranty = resolveBracket(WARRANTY_SCORE_TABLE, input.warrantyYears);
  const flush = resolveBracket(
    FIXED_REF_FLUSH_TABLE,
    input.flushPassed === null ? null : input.flushPassed ? 1 : 0,
  );

  const total = (savings?.points || 0) + (warranty?.points || 0) + (flush?.points || 0);
  const isComplete = savings !== null && warranty !== null && flush !== null;
  const passed = isComplete && total >= PASSING_SCORE;

  return { savings, warranty, flush, total, isComplete, passed };
}