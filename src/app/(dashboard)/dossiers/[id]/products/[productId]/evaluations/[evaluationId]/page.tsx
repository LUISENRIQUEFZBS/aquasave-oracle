import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvaluationById } from "@/lib/actions/evaluations";
import { getActiveInstruments } from "@/lib/actions/instruments";
import EvaluationDetailClient from "@/components/evaluations/EvaluationDetailClient";
import EvaluationPhotoEditor from "@/components/evaluations/EvaluationPhotoEditor";
import { fileUrl } from "@/lib/file-url";
import { formatLima } from "@/lib/dates";

export default async function EvaluationDetailPage({ params }: { params: Promise<{ id: string; productId: string; evaluationId: string }> }) {
  const { id, productId, evaluationId } = await params;
  const ids = [id, productId, evaluationId].map(Number);
  if (ids.some((n) => !Number.isSafeInteger(n) || n <= 0)) notFound();
  const [dossierId, pid, eid] = ids;
  const [evaluation, waterMeters, pressureGauges, stopwatches] = await Promise.all([
    getEvaluationById(eid),
    getActiveInstruments("WATER_METER"),
    getActiveInstruments("PRESSURE_GAUGE"),
    getActiveInstruments("STOPWATCH"),
  ]);
  if (!evaluation || evaluation.product.id !== pid || evaluation.dossier.id !== dossierId) notFound();
  const productPhoto = fileUrl(evaluation.product.photoPath ?? null);
  const locked = !!evaluation.certificate || !evaluation.dossier.open;

  return (
    <div className="space-y-6">
      <Link href={`/dossiers/${dossierId}/products/${pid}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-text-muted hover:text-text sm:min-h-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {evaluation.product.code}
      </Link>
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">Foto de referencia (producto)</p>
            {productPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productPhoto} alt="Foto de referencia del producto" className="h-20 w-20 rounded-md border border-border bg-bg object-contain" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-xs text-text-muted">Sin foto</div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">Foto de la evaluación</p>
            <EvaluationPhotoEditor evaluationId={evaluation.id} photoPath={evaluation.photoPath} locked={locked} />
          </div>
          <div>
            <p className="text-sm text-text-muted">{formatLima(evaluation.evaluatedAt, { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="text-sm text-text">{evaluation.evaluatorName}</p>
          </div>
        </div>
      </div>
      <EvaluationDetailClient
        key={`${evaluation.result}-${evaluation.computed?.finalizedAt ?? ""}`}
        evaluation={evaluation}
        waterMeters={waterMeters}
        pressureGauges={pressureGauges}
        stopwatches={stopwatches}
      />
    </div>
  );
}
