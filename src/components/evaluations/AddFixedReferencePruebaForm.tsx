"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPrueba } from "@/lib/actions/evaluations";
import { useAction } from "@/components/ui/useAction";
import { FLUSH_MIN_BALLS } from "@/lib/evaluation-score";

function round2(value: string): string {
  const n = parseFloat(value);
  return isNaN(n) ? value : n.toFixed(2);
}

const inputClass = "no-spinner w-full min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-base focus:border-primary focus:outline-none";

export default function AddFixedReferencePruebaForm({ evaluationId, group, requiresFlushTest, onAdded }: { evaluationId: number; group: string; requiresFlushTest: boolean; onAdded?: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [li, setLi] = useState("");
  const [lf, setLf] = useState("");
  const [presion, setPresion] = useState("");
  const [ballsCleared, setBallsCleared] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const liNum = parseFloat(li);
  const lfNum = parseFloat(lf);
  const diff = !isNaN(liNum) && !isNaN(lfNum) ? lfNum - liNum : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!li.trim() || !lf.trim()) return setLocalError("Ingresa LI y LF.");
    if (requiresFlushTest && !ballsCleared.trim()) return setLocalError("Ingresa la cantidad de pelotas evacuadas.");
    run(
      () =>
        addPrueba({
          evaluationId,
          group,
          prueba: {
            li: liNum,
            lf: lfNum,
            tiempo: null,
            presion: presion ? parseFloat(presion) : null,
            ballsCleared: requiresFlushTest ? parseInt(ballsCleared, 10) : null,
          },
        }),
      () => {
        setLi(""); setLf(""); setPresion(""); setBallsCleared("");
        router.refresh();
        onAdded?.();
      },
    );
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") e.preventDefault();
      }}
      className="space-y-3 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.01" inputMode="decimal" placeholder="LI (L)" value={li} onChange={(e) => setLi(e.target.value)} onBlur={(e) => setLi(round2(e.target.value))} className={inputClass} />
        <input type="number" step="0.01" inputMode="decimal" placeholder="LF (L)" value={lf} onChange={(e) => setLf(e.target.value)} onBlur={(e) => setLf(round2(e.target.value))} className={inputClass} />
      </div>
      {diff !== null && <p className="text-right text-xs font-medium text-primary">Diferencia: {diff.toFixed(2)} L</p>}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Presión (bar)</label>
        <input type="number" step="0.01" inputMode="decimal" placeholder="Presión (bar)" value={presion} onChange={(e) => setPresion(e.target.value)} onBlur={(e) => setPresion(round2(e.target.value))} className={inputClass} />
      </div>
      {requiresFlushTest && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Cantidad de pelotas evacuadas</label>
          <input type="number" step="1" min="0" inputMode="numeric" placeholder="Ej. 8" value={ballsCleared} onChange={(e) => setBallsCleared(e.target.value)} className={inputClass} />
          <p className="text-xs text-text-muted">Más de {FLUSH_MIN_BALLS} pelotas evacuadas = prueba aprobada.</p>
        </div>
      )}
      {(localError || error) && <p className="text-xs text-danger">{localError || error}</p>}
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
        {pending ? "Agregando..." : "Agregar prueba"}
      </button>
    </form>
  );
}
