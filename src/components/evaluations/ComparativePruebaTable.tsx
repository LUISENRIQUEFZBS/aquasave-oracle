"use client";
import { useRouter } from "next/navigation";
import { togglePruebaSelected, deletePrueba } from "@/lib/actions/evaluations";
import { useAction } from "@/components/ui/useAction";
import { confirmToast } from "@/lib/confirm-toast";
import { pruebaDiff, REQUIRED_SELECTED, type Prueba } from "@/lib/evaluation-data";

export default function ComparativePruebaTable({ pruebas, evaluationId, group, locked }: { pruebas: Prueba[]; evaluationId: number; group: "withoutDevice" | "withDevice"; locked: boolean }) {
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
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-muted">{selectedCount}/{REQUIRED_SELECTED} seleccionadas para el resultado final</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="space-y-2">
        {pruebas.map((prueba, i) => {
          const disableCheck = locked || (!prueba.selected && selectedCount >= REQUIRED_SELECTED);
          const diff = pruebaDiff(prueba);
          return (
            <div key={prueba.id} className={`rounded-md border p-3 ${prueba.selected ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <input type="checkbox" checked={prueba.selected} disabled={disableCheck || pending} onChange={() => toggle(prueba.id)} className="h-6 w-6 flex-shrink-0" aria-label={`Seleccionar prueba ${i + 1}`} />
                <span className="text-sm font-medium text-text-muted">Prueba {i + 1}</span>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <span className="font-mono text-text">{prueba.li ?? "—"} → {prueba.lf ?? "—"} L</span>
                  {diff !== null && <span className="font-mono font-medium text-primary">Δ{diff.toFixed(2)}L</span>}
                  {prueba.tiempo !== null && <span className="font-mono text-text-muted">{prueba.tiempo.toFixed(3)}s</span>}
                  {prueba.presion !== null && <span className="font-mono text-text-muted">{prueba.presion.toFixed(2)}bar</span>}
                </div>
                {!locked && (
                  <button type="button" onClick={() => remove(prueba.id)} disabled={pending} className="ml-auto min-h-11 flex-shrink-0 px-2 text-sm font-medium text-danger hover:underline sm:min-h-0">Eliminar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
