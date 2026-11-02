"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Drawer from "@/components/ui/Drawer";
import { useAction } from "@/components/ui/useAction";
import { selectEvaluationForCertificate, deleteEvaluation, type ProductForEvaluation } from "@/lib/actions/evaluations";
import { confirmToast } from "@/lib/confirm-toast";
import { formatLima } from "@/lib/dates";
import { errorText } from "@/components/ui/styles";
import NewEvaluationShellForm from "./NewEvaluationShellForm";

export default function EvaluationsSection({ data, evaluatorName }: { data: ProductForEvaluation; evaluatorName: string }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [newOpen, setNewOpen] = useState(false);
  const { product, dossier, evaluations, certificate } = data;
  const canCreate = dossier.open && product.currentStage >= 2 && !certificate;

  function select(id: number) {
    run(() => selectEvaluationForCertificate(id), () => router.refresh());
  }
  async function remove(id: number) {
    if (!(await confirmToast("¿Eliminar esta evaluación?"))) return;
    run(() => deleteEvaluation(id), () => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">Evaluaciones ({evaluations.length})</h2>
        {canCreate && (
          <button onClick={() => setNewOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-dark sm:min-h-0 sm:py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            Nueva evaluación
          </button>
        )}
      </div>
      {!canCreate && (
        <p className="text-xs text-text-muted">
          {certificate ? "El producto ya tiene certificado emitido." : product.currentStage < 2 ? "Registre primero la recepción del producto." : "El expediente no está abierto."}
        </p>
      )}
      {error && <p className={errorText}>{error}</p>}
      {evaluations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted">Este producto todavía no tiene evaluaciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evaluations.map((ev) => (
            <div key={ev.id} className={`flex flex-wrap items-center gap-3 rounded-lg border bg-surface p-3 ${ev.selectedForCertificate ? "border-primary" : "border-border"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!ev.result ? (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">En progreso</span>
                  ) : ev.result === "CONFORME" ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Conforme</span>
                  ) : (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">No conforme</span>
                  )}
                  {ev.selectedForCertificate && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Para certificado</span>}
                  {ev.hasCertificate && <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Certificado emitido</span>}
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatLima(ev.evaluatedAt, { year: "numeric", month: "short", day: "numeric" })} — {ev.evaluatorName} · {ev.pruebaCount} prueba{ev.pruebaCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
                <Link href={`/dossiers/${dossier.id}/products/${product.id}/evaluations/${ev.id}`} className="py-2 text-xs font-medium text-primary hover:underline">Ver detalle</Link>
                {ev.result && !ev.selectedForCertificate && !certificate && (
                  <button onClick={() => select(ev.id)} disabled={pending} className="py-2 text-xs text-text-muted hover:text-primary disabled:opacity-50">Usar para certificado</button>
                )}
                {!ev.hasCertificate && (
                  <button onClick={() => remove(ev.id)} disabled={pending} className="py-2 text-xs text-danger hover:underline disabled:opacity-50">Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Drawer open={newOpen} onClose={() => setNewOpen(false)} title="Nueva evaluación">
        <NewEvaluationShellForm productId={product.id} dossierId={dossier.id} evaluatorName={evaluatorName} />
      </Drawer>
    </div>
  );
}
