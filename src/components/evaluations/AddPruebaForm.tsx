"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPrueba } from "@/lib/actions/evaluations";
import { useAction } from "@/components/ui/useAction";
import StopwatchInput from "./StopwatchInput";

type Fields = { li: string; lf: string; tiempo: string; presion: string };
const EMPTY: Fields = { li: "", lf: "", tiempo: "", presion: "" };

function round2(value: string): string {
  const n = parseFloat(value);
  return isNaN(n) ? value : n.toFixed(2);
}

export default function AddPruebaForm({ evaluationId, group, onAdded }: { evaluationId: number; group: "withoutDevice" | "withDevice"; onAdded?: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [localError, setLocalError] = useState<string | null>(null);
  const set = (key: keyof Fields, v: string) => setFields((f) => ({ ...f, [key]: v }));

  const li = parseFloat(fields.li);
  const lf = parseFloat(fields.lf);
  const diff = !isNaN(li) && !isNaN(lf) ? lf - li : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!fields.li.trim() || !fields.lf.trim()) return setLocalError("Ingresa LI y LF.");
    if (!fields.tiempo.trim()) return setLocalError("Ingresa el tiempo.");
    run(
      () =>
        addPrueba({
          evaluationId,
          group,
          prueba: {
            li: parseFloat(fields.li),
            lf: parseFloat(fields.lf),
            tiempo: parseFloat(fields.tiempo),
            presion: fields.presion ? parseFloat(fields.presion) : null,
          },
        }),
      () => {
        setFields(EMPTY);
        router.refresh();
        onAdded?.();
      },
    );
  }

  // text-base (16px) on purpose: smaller inputs make iOS Safari zoom in on focus.
  const inputClass =
    "no-spinner w-full min-h-11 rounded-lg border border-border bg-surface px-2.5 py-2 font-mono text-base text-text shadow-sm transition-colors placeholder:font-sans placeholder:text-sm placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
  const labelClass = "block text-[11px] font-semibold uppercase tracking-wide text-text-muted";

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") e.preventDefault();
      }}
      className="relative space-y-3 overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-surface to-surface p-4 shadow-sm"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="relative grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Lectura inicial (LI)</label>
          <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={fields.li} onChange={(e) => set("li", e.target.value)} onBlur={(e) => set("li", round2(e.target.value))} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Lectura final (LF)</label>
          <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={fields.lf} onChange={(e) => set("lf", e.target.value)} onBlur={(e) => set("lf", round2(e.target.value))} className={inputClass} />
        </div>
      </div>
      {diff !== null && (
        <div className="relative flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
          <span className="text-xs font-medium text-primary">Diferencia</span>
          <span className="font-mono text-base font-semibold text-primary">{diff.toFixed(2)} L</span>
        </div>
      )}
      <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass}>Presión (bar)</label>
          <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={fields.presion} onChange={(e) => set("presion", e.target.value)} onBlur={(e) => set("presion", round2(e.target.value))} className={inputClass} />
        </div>
        <StopwatchInput value={fields.tiempo} onChange={(v) => set("tiempo", v)} />
      </div>
      {(localError || error) && <p className="relative text-xs text-danger">{localError || error}</p>}
      <button type="submit" disabled={pending} className="relative min-h-11 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow disabled:opacity-50">
        {pending ? "Agregando..." : "Agregar prueba"}
      </button>
    </form>
  );
}
