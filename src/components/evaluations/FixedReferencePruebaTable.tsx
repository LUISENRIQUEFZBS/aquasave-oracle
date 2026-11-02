"use client";
import { useRouter } from "next/navigation";
import { togglePruebaSelected, deletePrueba } from "@/lib/actions/evaluations";
import { useAction } from "@/components/ui/useAction";
import { confirmToast } from "@/lib/confirm-toast";
import { pruebaDiff, REQUIRED_SELECTED, type Prueba } from "@/lib/evaluation-data";
import { FLUSH_MIN_BALLS } from "@/lib/evaluation-score";

export default function FixedReferencePruebaTable({ pruebas, evaluationId, group, requiresFlushTest, locked }: { pruebas: Prueba[]; evaluationId: number; group: string; requiresFlushTest: boolean; locked: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const selectedCount = pruebas.filter((p) => p.selected).length;

  const toggle = (pruebaId: string) => run(() => togglePruebaSelected({ evaluationId, group, pruebaId }), () => router.refresh());
  async function remove(pruebaId: string) {
    if (!(await confirmToast("¿Eliminar esta prueba?"))) return;
    run(() => deletePrueba({ evaluationId, group, pruebaId }), () => router.refresh());
  }

  if (pruebas.length === 0) return <p className="text-sm text-text-muted">Todavía no hay pruebas registradas.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-muted">{selectedCount}/{REQUIRED_SELECTED} seleccionadas para el resultado final</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="space-y-2">
        {pruebas.map((p, i) => {
          const d = pruebaDiff(p);
          const disableCheck = locked || (!p.selected && selectedCount >= REQUIRED_SELECTED);
          return (
            <div key={p.id} className={`rounded-md border p-3 ${p.selected ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="mb-2 flex items-center gap-3">
                <input type="checkbox" checked={p.selected} disabled={disableCheck || pending} onChange={() => toggle(p.id)} className="h-6 w-6 flex-shrink-0" aria-label={`Seleccionar prueba ${i + 1}`} />
                <span className="text-sm font-medium text-text-muted">Prueba {i + 1}</span>
                {!locked && (
                  <button type="button" onClick={() => remove(p.id)} disabled={pending} className="ml-auto min-h-11 flex-shrink-0 px-2 text-sm font-medium text-danger hover:underline sm:min-h-0">Eliminar</button>
                )}
              </div>
              <div className="rounded-md bg-bg px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-text">{p.li ?? "—"} → {p.lf ?? "—"} L</span>
                  {d !== null && <span className="font-mono font-medium text-primary">Δ{d.toFixed(2)}L</span>}
                  {p.presion !== null && <span className="font-mono text-text-muted">{p.presion.toFixed(2)}bar</span>}
                  {requiresFlushTest && p.ballsCleared !== null && p.ballsCleared !== undefined && (
                    <>
                      <span className="font-mono text-text-muted">{p.ballsCleared} pelotas</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.ballsCleared > FLUSH_MIN_BALLS ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {p.ballsCleared > FLUSH_MIN_BALLS ? "Descarga aprobada" : "Descarga no aprobada"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
