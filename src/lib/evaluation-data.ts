// Shared shapes for the "pruebas" (trial runs) stored inside Evaluation.data.
// An evaluator can record as many pruebas as needed per condition, then
// select exactly 3 to be the ones that count toward the final result —
// mirrors the real lab workflow (run several, pick the best/representative 3).

export type Prueba = {
  id: string;
  pairId?: string;
  li: number | null;
  lf: number | null;
  tiempo: number | null; // seconds
  presion: number | null; // bar
  ballsCleared?: number | null; // fixed-reference, Sólido only: count of test balls that cleared
  selected: boolean;
  createdAt: string;
};

export const REQUIRED_SELECTED = 3;

export function pruebaDiff(p: Prueba): number | null {
  if (p.li === null || p.lf === null) return null;
  return p.lf - p.li;
}

export function computeSelectedAverages(pruebas: Prueba[]) {
  const selected = pruebas.filter((p) => p.selected);
  const diffs = selected.map(pruebaDiff).filter((v): v is number => v !== null);
  const tiempos = selected
    .map((p) => p.tiempo)
    .filter((v): v is number => v !== null);

  const avgVolume = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
  const avgTiempo = tiempos.length
    ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
    : null;

  return { avgVolume, avgTiempo, selectedCount: selected.length };
}