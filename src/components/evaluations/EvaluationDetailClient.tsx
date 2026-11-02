"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { finalizeEvaluation, type EvaluationDetail } from "@/lib/actions/evaluations";
import type { InstrumentView } from "@/lib/actions/instruments";
import { useAction } from "@/components/ui/useAction";
import {
  SAVINGS_SCORE_TABLE,
  WARRANTY_SCORE_TABLE,
  EFFICIENCY_SCORE_TABLE,
  PASSING_SCORE,
  MAX_SCORE,
} from "@/lib/certification-criteria";
import { FIXED_REF_SAVINGS_TABLE, FIXED_REF_FLUSH_TABLE } from "@/lib/fixed-reference-criteria";
import { REQUIRED_SELECTED, type Prueba } from "@/lib/evaluation-data";
import {
  evaluateComparative,
  evaluateFixedReference,
  type ComparativeData,
  type FixedReferenceData,
  type ReferenceVariantData,
  type ResultKey,
} from "@/lib/evaluation-score";
import { formatLima } from "@/lib/dates";
import AddPruebaForm from "./AddPruebaForm";
import ComparativePruebaTable from "./ComparativePruebaTable";
import AddFixedReferencePruebaForm from "./AddFixedReferencePruebaForm";
import FixedReferencePruebaTable from "./FixedReferencePruebaTable";
import ScoreCriteriaTable from "./ScoreCriteriaTable";
import ResultToggle from "./ResultToggle";

const selectClass = "w-full min-h-11 sm:min-h-0 rounded-md border border-border bg-surface px-3 py-2 text-base sm:text-sm focus:border-primary focus:outline-none disabled:opacity-60";

function isInstrumentExpired(i: InstrumentView): boolean {
  const latest = i.calibrations[0];
  if (!latest) return true; // no calibration on record: treat as unverified
  return Date.now() > new Date(latest.expiresAt).getTime() + 12 * 3600 * 1000; // valid through the whole expiry day
}

function instrumentLabel(i: InstrumentView) {
  const base = i.label ? `${i.code} — ${i.label}` : i.code;
  return isInstrumentExpired(i) ? `⚠ ${base} (calibración vencida)` : base;
}

export default function EvaluationDetailClient(props: {
  evaluation: EvaluationDetail;
  waterMeters: InstrumentView[];
  pressureGauges: InstrumentView[];
  stopwatches: InstrumentView[];
}) {
  const { evaluation } = props;
  const locked = !!evaluation.certificate || !evaluation.dossier.open;
  if (evaluation.data.method === "COMPARATIVE") {
    return <ComparativeDetail {...props} data={evaluation.data} locked={locked} />;
  }
  return <FixedReferenceDetail {...props} data={evaluation.data} locked={locked} />;
}

function InstrumentSelect({ label, options, value, onChange, disabled }: { label: string; options: InstrumentView[]; value: string; onChange: (v: string) => void; disabled: boolean }) {
  const selected = options.find((i) => String(i.id) === value);
  return (
    <div>
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={selectClass}>
        <option value="">Selecciona un instrumento</option>
        {options.map((i) => (
          <option key={i.id} value={i.id}>{instrumentLabel(i)}</option>
        ))}
      </select>
      {selected && isInstrumentExpired(selected) && <p className="mt-1 text-xs text-danger">La calibración de este instrumento está vencida.</p>}
    </div>
  );
}

function ResultBanner({ result }: { result: ResultKey | null }) {
  if (!result) return <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">En progreso</span>;
  return result === "CONFORME" ? (
    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Conforme</span>
  ) : (
    <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">No conforme</span>
  );
}

/** Toggle + reason field. The reason is only needed when the evaluator flips the suggested result. */
function ResultSection({ suggested, manual, setManual, reason, setReason, locked }: { suggested: ResultKey | null; manual: ResultKey | null; setManual: (v: ResultKey) => void; reason: string; setReason: (v: string) => void; locked: boolean }) {
  const effective = manual ?? suggested;
  const overridden = effective !== null && suggested !== null && effective !== suggested;
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">Resultado final</label>
      <div className={locked ? "pointer-events-none opacity-60" : ""}>
        <ResultToggle value={effective} suggested={suggested} onChange={setManual} />
      </div>
      {overridden && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text">Motivo de la anulación <span className="text-danger">*</span></label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} disabled={locked} rows={2} placeholder="Explica por qué se cambia el resultado sugerido por el puntaje" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus:border-primary focus:outline-none sm:text-sm" />
        </div>
      )}
    </div>
  );
}

function ScoreBox({ complete, passed, total }: { complete: boolean; passed: boolean; total: number }) {
  return (
    <div className={`rounded-md p-4 text-center ${!complete ? "bg-bg" : passed ? "bg-success/10" : "bg-danger/10"}`}>
      <p className="text-xs text-text-muted">Puntaje mínimo de aprobación: {PASSING_SCORE}/{MAX_SCORE}</p>
      <p className={`text-2xl font-bold ${!complete ? "text-text" : passed ? "text-success" : "text-danger"}`}>{total}/{MAX_SCORE}</p>
    </div>
  );
}

function SavedNote({ evaluation }: { evaluation: EvaluationDetail }) {
  const c = evaluation.computed;
  if (!c || !evaluation.result) return null;
  return (
    <p className="rounded-md bg-bg px-3 py-2 text-xs text-text-muted">
      Resultado guardado el {formatLima(c.finalizedAt.slice(0, 10))}: puntaje {c.score ?? "—"}/{MAX_SCORE}.
      {c.overridden && <> Resultado cambiado manualmente. Motivo: {c.overrideReason}</>}
    </p>
  );
}

/** Certificate emission/preview is built in the next module; for now it only reports what exists. */
function CertificateSection({ evaluation }: { evaluation: EvaluationDetail }) {
  if (!evaluation.result) return null;
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <h3 className="text-sm font-semibold text-text">Certificado</h3>
      {evaluation.certificate ? (
        <p className="rounded-md bg-success/10 p-3 text-sm font-medium text-success">Certificado emitido: {evaluation.certificate.number}</p>
      ) : evaluation.result === "CONFORME" ? (
        <p className="text-xs text-text-muted">La emisión del certificado se habilitará en el siguiente módulo.</p>
      ) : (
        <p className="text-xs text-text-muted">Solo las evaluaciones Conformes pueden certificarse.</p>
      )}
    </div>
  );
}

function LockedNotice({ evaluation, locked }: { evaluation: EvaluationDetail; locked: boolean }) {
  if (!locked) return null;
  return (
    <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
      {evaluation.certificate ? "Esta evaluación ya tiene certificado emitido: no se puede modificar." : "El expediente no está abierto: la evaluación es de solo lectura."}
    </p>
  );
}

function ComparativeConditionSection({ label, group, pruebas, evaluationId, locked }: { label: string; group: "withoutDevice" | "withDevice"; pruebas: Prueba[]; evaluationId: number; locked: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">{label} ({pruebas.length})</h3>
        {!locked && (
          <button type="button" onClick={() => setShowAdd(!showAdd)} className="min-h-11 px-2 text-xs font-medium text-primary hover:underline sm:min-h-0">
            {showAdd ? "Cancelar" : "+ Agregar prueba"}
          </button>
        )}
      </div>
      {showAdd && !locked && <AddPruebaForm evaluationId={evaluationId} group={group} onAdded={() => setShowAdd(false)} />}
      <ComparativePruebaTable pruebas={pruebas} evaluationId={evaluationId} group={group} locked={locked} />
    </div>
  );
}

function ComparativeDetail({ evaluation, data, waterMeters, pressureGauges, stopwatches, locked }: { evaluation: EvaluationDetail; data: ComparativeData; waterMeters: InstrumentView[]; pressureGauges: InstrumentView[]; stopwatches: InstrumentView[]; locked: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [localError, setLocalError] = useState<string | null>(null);
  const [manual, setManual] = useState<ResultKey | null>(evaluation.result);
  const [reason, setReason] = useState(evaluation.computed?.overrideReason ?? "");
  const [meterId, setMeterId] = useState(evaluation.meterInstrumentId ? String(evaluation.meterInstrumentId) : "");
  const [gaugeId, setGaugeId] = useState(evaluation.pressureGaugeInstrumentId ? String(evaluation.pressureGaugeInstrumentId) : "");
  const [stopwatchId, setStopwatchId] = useState(evaluation.stopwatchInstrumentId ? String(evaluation.stopwatchInstrumentId) : "");

  const warrantyYears = evaluation.product.warrantyYears;
  // Live preview only. The server recomputes everything from the saved pruebas when finalizing.
  const r = useMemo(() => evaluateComparative(data, warrantyYears), [data, warrantyYears]);
  const effective = manual ?? r.suggested;
  const overridden = effective !== null && r.suggested !== null && effective !== r.suggested;

  function finalize() {
    setLocalError(null);
    if (!r.ready) return setLocalError(`Selecciona exactamente ${REQUIRED_SELECTED} pruebas en cada grupo.`);
    if (warrantyYears === null) return setLocalError("Este producto no tiene garantía registrada. Edítalo antes de finalizar.");
    if (!meterId || !gaugeId || !stopwatchId) return setLocalError("Selecciona los instrumentos utilizados (medidor de agua, manómetro y cronómetro).");
    if (!effective) return setLocalError("No se pudo determinar un resultado.");
    if (overridden && reason.trim().length < 5) return setLocalError("Ingresa el motivo de la anulación.");
    run(
      () =>
        finalizeEvaluation({
          evaluationId: evaluation.id,
          result: overridden ? effective : undefined,
          overrideReason: overridden ? reason : undefined,
          meterInstrumentId: Number(meterId),
          pressureGaugeInstrumentId: Number(gaugeId),
          stopwatchInstrumentId: Number(stopwatchId),
        }),
      () => router.refresh(),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Comparativo</h2>
        <ResultBanner result={evaluation.result} />
      </div>
      <LockedNotice evaluation={evaluation} locked={locked} />
      <ComparativeConditionSection label="Sin ahorrador" group="withoutDevice" pruebas={data.withoutDevice.pruebas} evaluationId={evaluation.id} locked={locked} />
      <ComparativeConditionSection label="Con ahorrador" group="withDevice" pruebas={data.withDevice.pruebas} evaluationId={evaluation.id} locked={locked} />

      <div className="rounded-md bg-bg p-3 text-sm">
        <div className="flex justify-between gap-3"><span className="text-text-muted">Volumen promedio sin ahorrador</span><span className="font-mono text-text">{r.withoutAvg.avgVolume !== null ? `${r.withoutAvg.avgVolume.toFixed(2)} L` : "—"}</span></div>
        <div className="flex justify-between gap-3"><span className="text-text-muted">Volumen promedio con ahorrador</span><span className="font-mono text-text">{r.withAvg.avgVolume !== null ? `${r.withAvg.avgVolume.toFixed(2)} L` : "—"}</span></div>
        <div className="mt-1 flex justify-between gap-3 border-t border-border pt-1"><span className="font-medium text-text">% de ahorro</span><span className="font-mono font-medium text-text">{r.savingsPercent !== null ? `${r.savingsPercent.toFixed(1)}%` : "—"}</span></div>
      </div>

      {warrantyYears === null && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">Este producto no tiene garantía registrada. Edítalo antes de finalizar — afecta el puntaje (Tabla 2).</p>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Criterios de evaluación (según certificado)</h3>
        <ScoreCriteriaTable title="Tabla 1 — Porcentaje de ahorro (50 pts)" table={SAVINGS_SCORE_TABLE} active={r.score.savings} />
        <ScoreCriteriaTable title="Tabla 2 — Garantía del producto (40 pts)" table={WARRANTY_SCORE_TABLE} active={r.score.warranty} />
        <ScoreCriteriaTable title="Tabla 3 — Eficiencia en el uso (10 pts)" table={EFFICIENCY_SCORE_TABLE} active={r.score.efficiency} />
      </div>
      <ScoreBox complete={r.score.isComplete} passed={r.score.passed} total={r.score.total} />

      <div className="space-y-3 rounded-md border border-border p-3">
        <h3 className="text-sm font-semibold text-text">Instrumentos utilizados</h3>
        <div className="space-y-2">
          <InstrumentSelect label="Medidor de agua" options={waterMeters} value={meterId} onChange={setMeterId} disabled={locked} />
          <InstrumentSelect label="Manómetro" options={pressureGauges} value={gaugeId} onChange={setGaugeId} disabled={locked} />
          <InstrumentSelect label="Cronómetro" options={stopwatches} value={stopwatchId} onChange={setStopwatchId} disabled={locked} />
        </div>
      </div>

      <ResultSection suggested={r.suggested} manual={manual} setManual={setManual} reason={reason} setReason={setReason} locked={locked} />
      <SavedNote evaluation={evaluation} />
      {(localError || error) && <p className="text-sm text-danger">{localError || error}</p>}
      {!locked && (
        <button onClick={finalize} disabled={pending} className="min-h-11 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
          {pending ? "Guardando..." : evaluation.result ? "Actualizar resultado" : "Finalizar evaluación"}
        </button>
      )}
      <CertificateSection evaluation={evaluation} />
    </div>
  );
}

function VariantBlock({ variantId, variant, evaluationId, volume, setVolume, avgVolumeL, locked }: { variantId: string; variant: ReferenceVariantData; evaluationId: number; volume: string; setVolume: (v: string) => void; avgVolumeL: number | null; locked: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const ref = parseFloat(volume) || 0;
  return (
    <div className="space-y-4 overflow-hidden rounded-lg border border-primary/30">
      <div className="bg-primary/10 px-4 py-2.5"><h3 className="text-sm font-semibold text-primary-dark">{variant.label}</h3></div>
      <div className="space-y-4 px-4 pb-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted">Volumen de referencia máximo (L)</label>
          <input type="number" step="0.01" inputMode="decimal" value={volume} disabled={locked} onChange={(e) => setVolume(e.target.value)} className="no-spinner w-full min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-base focus:border-primary focus:outline-none disabled:opacity-60 sm:min-h-0 sm:text-sm" />
        </div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text">Pruebas ({variant.pruebas.length})</h4>
          {!locked && (
            <button type="button" onClick={() => setShowAdd(!showAdd)} className="min-h-11 px-2 text-xs font-medium text-primary hover:underline sm:min-h-0">{showAdd ? "Cancelar" : "+ Agregar prueba"}</button>
          )}
        </div>
        {showAdd && !locked && <AddFixedReferencePruebaForm evaluationId={evaluationId} group={variantId} requiresFlushTest={variant.requiresFlushTest} onAdded={() => setShowAdd(false)} />}
        <FixedReferencePruebaTable pruebas={variant.pruebas} evaluationId={evaluationId} group={variantId} requiresFlushTest={variant.requiresFlushTest} locked={locked} />
        <div className="rounded-md bg-bg p-3 text-sm">
          <div className="flex justify-between gap-3"><span className="text-text-muted">Volumen promedio medido</span><span className="font-mono text-text">{avgVolumeL !== null ? `${avgVolumeL.toFixed(2)} L` : "—"}</span></div>
          <div className="mt-1 flex justify-between gap-3 border-t border-border pt-1"><span className="font-medium text-text">Volumen de referencia</span><span className="font-mono font-medium text-text">{ref.toFixed(2)} L</span></div>
        </div>
      </div>
    </div>
  );
}

function FixedReferenceDetail({ evaluation, data, waterMeters, pressureGauges, locked }: { evaluation: EvaluationDetail; data: FixedReferenceData; waterMeters: InstrumentView[]; pressureGauges: InstrumentView[]; locked: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [localError, setLocalError] = useState<string | null>(null);
  const [manual, setManual] = useState<ResultKey | null>(evaluation.result);
  const [reason, setReason] = useState(evaluation.computed?.overrideReason ?? "");
  const [meterId, setMeterId] = useState(evaluation.meterInstrumentId ? String(evaluation.meterInstrumentId) : "");
  const [gaugeId, setGaugeId] = useState(evaluation.pressureGaugeInstrumentId ? String(evaluation.pressureGaugeInstrumentId) : "");

  const warrantyYears = evaluation.product.warrantyYears;
  const variantIds = Object.keys(data.variants || {});
  const [volumes, setVolumes] = useState<Record<string, string>>(() => Object.fromEntries(variantIds.map((id) => [id, String(data.variants[id].referenceVolumeL)])));
  const parsedVolumes = useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of variantIds) out[id] = parseFloat(volumes[id]) || 0;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumes]);

  // Live preview only. The server recomputes everything when finalizing.
  const r = useMemo(() => evaluateFixedReference(data, warrantyYears, parsedVolumes), [data, warrantyYears, parsedVolumes]);
  const effective = manual ?? r.suggested;
  const overridden = effective !== null && r.suggested !== null && effective !== r.suggested;
  const variantNames = variantIds.map((id) => data.variants[id].label).join(", ");

  const savingsTable = useMemo(() => {
    if (variantIds.length <= 1) {
      const name = variantNames || "la variante";
      return [
        { ...FIXED_REF_SAVINGS_TABLE[0], label: `${name} supera su volumen de referencia` },
        { ...FIXED_REF_SAVINGS_TABLE[1], label: `${name} cumple su volumen de referencia` },
      ];
    }
    return [
      { ...FIXED_REF_SAVINGS_TABLE[0], label: `Al menos una variante (${variantNames}) supera su volumen de referencia` },
      { ...FIXED_REF_SAVINGS_TABLE[1], label: `Todas las variantes (${variantNames}) cumplen su volumen de referencia` },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantIds.length, variantNames]);

  function finalize() {
    setLocalError(null);
    if (variantIds.length === 0) return setLocalError("Este producto no tiene variantes de referencia seleccionadas.");
    if (!r.allReady) return setLocalError(`Selecciona exactamente ${REQUIRED_SELECTED} pruebas en cada variante.`);
    if (warrantyYears === null) return setLocalError("Este producto no tiene garantía registrada. Edítalo antes de finalizar.");
    if (!meterId || !gaugeId) return setLocalError("Selecciona los instrumentos utilizados (medidor de agua y manómetro).");
    if (!effective) return setLocalError("No se pudo determinar un resultado.");
    if (overridden && reason.trim().length < 5) return setLocalError("Ingresa el motivo de la anulación.");
    for (const id of variantIds) if (!(parsedVolumes[id] > 0)) return setLocalError("Ingresa un volumen de referencia válido en cada variante.");
    run(
      () =>
        finalizeEvaluation({
          evaluationId: evaluation.id,
          result: overridden ? effective : undefined,
          overrideReason: overridden ? reason : undefined,
          meterInstrumentId: Number(meterId),
          pressureGaugeInstrumentId: Number(gaugeId),
          referenceVolumes: parsedVolumes,
        }),
      () => router.refresh(),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Referencia fija</h2>
        <ResultBanner result={evaluation.result} />
      </div>
      <LockedNotice evaluation={evaluation} locked={locked} />
      {variantIds.length === 0 && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">Esta evaluación no tiene variantes de referencia. Elimínala y vuelve a crearla después de elegir las variantes del producto (ej. Líquido, Sólido).</p>
      )}
      {variantIds.map((id) => (
        <VariantBlock key={id} variantId={id} variant={data.variants[id]} evaluationId={evaluation.id} volume={volumes[id] ?? ""} setVolume={(v) => setVolumes((p) => ({ ...p, [id]: v }))} avgVolumeL={r.states[id]?.avgVolumeL ?? null} locked={locked} />
      ))}
      {variantIds.length > 1 && <p className="text-xs text-text-muted">El puntaje de la Tabla 1 requiere que todas las variantes cumplan su propia referencia.</p>}

      {variantIds.length > 0 && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <h4 className="text-sm font-semibold text-text">Cumplimiento por variante</h4>
          {variantIds.map((id) => {
            const s = r.states[id];
            if (!s) return null;
            return (
              <div key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-text">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-text-muted">{s.avgVolumeL !== null ? s.avgVolumeL.toFixed(2) : "—"} L / {s.referenceVolumeL.toFixed(2)} L</span>
                  {s.compliant === null ? (
                    <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-text-muted">Pendiente</span>
                  ) : s.compliant ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Cumple</span>
                  ) : (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">Supera</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {warrantyYears === null && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">Este producto no tiene garantía registrada. Edítalo antes de finalizar — afecta el puntaje (Tabla 2).</p>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Criterios de evaluación (según certificado)</h3>
        <ScoreCriteriaTable title="Tabla 1 — Cumplimiento de referencia (50 pts)" table={savingsTable} active={r.score.savings ? savingsTable.find((b) => b.points === r.score.savings!.points) ?? null : null} />
        <ScoreCriteriaTable title="Tabla 2 — Garantía del producto (40 pts)" table={WARRANTY_SCORE_TABLE} active={r.score.warranty} />
        <ScoreCriteriaTable title="Tabla 3 — Efectividad de descarga (10 pts)" table={FIXED_REF_FLUSH_TABLE} active={r.score.flush} />
      </div>
      <ScoreBox complete={r.score.isComplete} passed={r.score.passed} total={r.score.total} />

      <div className="space-y-3 rounded-md border border-border p-3">
        <h3 className="text-sm font-semibold text-text">Instrumentos utilizados</h3>
        <div className="space-y-2">
          <InstrumentSelect label="Medidor de agua" options={waterMeters} value={meterId} onChange={setMeterId} disabled={locked} />
          <InstrumentSelect label="Manómetro" options={pressureGauges} value={gaugeId} onChange={setGaugeId} disabled={locked} />
        </div>
      </div>

      <ResultSection suggested={r.suggested} manual={manual} setManual={setManual} reason={reason} setReason={setReason} locked={locked} />
      <SavedNote evaluation={evaluation} />
      {(localError || error) && <p className="text-sm text-danger">{localError || error}</p>}
      {!locked && (
        <button onClick={finalize} disabled={pending} className="min-h-11 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
          {pending ? "Guardando..." : evaluation.result ? "Actualizar resultado" : "Finalizar evaluación"}
        </button>
      )}
      <CertificateSection evaluation={evaluation} />
    </div>
  );
}
