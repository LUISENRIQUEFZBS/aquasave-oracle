// Scoring rubric extracted verbatim from the client's real certificate
// template ("certifi. de duchas y grifer" sheet, "10. Anexo — Criterios de
// Evaluación"). Applies to COMPARATIVE-method products (grifería, duchas).
//
// This is the single source of truth for both the evaluation form (live
// pass/fail feedback while measuring) and certificate PDF generation
// (the certificate must display these same tables) — don't duplicate these
// numbers elsewhere.

export type ScoreBracket = {
  label: string;
  points: number;
  test: (value: number) => boolean;
};

export const SAVINGS_SCORE_TABLE: ScoreBracket[] = [
  { label: "Menor a 30%", points: 0, test: (v) => v < 30 },
  { label: "30% a 40%", points: 30, test: (v) => v >= 30 && v < 40 },
  { label: "40% a 50%", points: 40, test: (v) => v >= 40 && v < 50 },
  { label: "50% a más", points: 50, test: (v) => v >= 50 },
];

export const WARRANTY_SCORE_TABLE: ScoreBracket[] = [
  { label: "Menor o igual a 1 año", points: 0, test: (v) => v <= 1 },
  { label: "Mayor a 1 año y menor a 3 años", points: 30, test: (v) => v > 1 && v < 3 },
  { label: "Mayor o igual a 3 años", points: 40, test: (v) => v >= 3 },
];

// value = percent time difference of "con ahorrador" vs "sin ahorrador":
// positive = took longer (slower), negative = took less time (faster).
export const EFFICIENCY_SCORE_TABLE: ScoreBracket[] = [
  { label: "En mayor tiempo (> 10% más lento)", points: 1, test: (v) => v > 10 },
  { label: "En igual tiempo (± 10%)", points: 5, test: (v) => v >= -10 && v <= 10 },
  { label: "En menor tiempo (> 10% más rápido)", points: 10, test: (v) => v < -10 },
];

export const MAX_SCORE = 100;
export const PASSING_SCORE = 61;

export function resolveBracket(
  table: ScoreBracket[],
  value: number | null,
): ScoreBracket | null {
  if (value === null || isNaN(value)) return null;
  return table.find((b) => b.test(value)) || null;
}

export function computeComparativeScore(input: {
  savingsPercent: number | null;
  warrantyYears: number | null;
  timePercentChange: number | null;
}) {
  const savings = resolveBracket(SAVINGS_SCORE_TABLE, input.savingsPercent);
  const warranty = resolveBracket(WARRANTY_SCORE_TABLE, input.warrantyYears);
  const efficiency = resolveBracket(EFFICIENCY_SCORE_TABLE, input.timePercentChange);

  const total =
    (savings?.points || 0) + (warranty?.points || 0) + (efficiency?.points || 0);
  const isComplete = savings !== null && warranty !== null && efficiency !== null;
  const passed = isComplete && total >= PASSING_SCORE;

  return { savings, warranty, efficiency, total, isComplete, passed };
}